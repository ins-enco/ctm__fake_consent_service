import mysql from "mysql2/promise";
import {
  buildBrokerHandover,
  LEGACY_CONSENT_TYPE,
  STANDARD_CONSENT_TYPE,
} from "~/utils/consentHandover";
import { SAMPLE_CONSENT_PAYLOAD } from "~/utils/consentPayload";
import { buildKycDraft } from "~/utils/kycDraft";

/**
 * Direct DB-write helpers backing the /admin/db-tools page.
 *
 * These are a JS port of scripts/patch-consent.sh and scripts/seed-trading-accounts.sh —
 * keep the two in sync if the consent gate logic changes. See SfBrokerConsentService
 * .CheckConsentAsync in CTM_Admin_Backend for the read path these writes satisfy:
 *   1. a UserBrokerConsents row must exist for (UserID, BrokerID)
 *   2. Status must be 1
 *   3. unless the broker is a Standard journey ([ConsentStep] ConsentType=1),
 *      UserRawData.datasource3[].account_number must contain the polled login —
 *      miss this and the read path itself resets Status back to 0.
 *
 * UserRawData can hold a real broker's KYC handover (name, passport, tax id, ...),
 * so every write here is additive: existing JSON is preserved and appended to,
 * never overwritten, unless there is nothing valid to preserve.
 */

export interface DbPatchToolConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  key: string;
}

export function isDbPatchToolConfigured(cfg: DbPatchToolConfig): boolean {
  return Boolean(cfg.host && cfg.database && cfg.user && cfg.password && cfg.key);
}

async function getConnection(cfg: DbPatchToolConfig) {
  return mysql.createConnection({
    host: cfg.host,
    port: Number(cfg.port),
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ssl: undefined, // matches --skip-ssl in the shell scripts; this DB does not offer TLS
    connectTimeout: 15000,
  });
}

function assertPositiveInt(value: unknown, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw createError({ statusCode: 400, message: `${name} must be a positive integer` });
  }
  return n;
}

// ── grant-consent: flip an existing user+broker consent row to Status=1 ─────────

export interface GrantConsentInput {
  userId: number;
  brokerId: number;
  accountNumber: number;
}

export interface GrantConsentResult {
  action: string;
  status: number;
  ds3Accounts: number | null;
  accountConfirmed: boolean;
  kycRowsExisting: number;
}

export async function grantConsent(
  cfg: DbPatchToolConfig,
  input: GrantConsentInput,
): Promise<GrantConsentResult> {
  const userId = assertPositiveInt(input.userId, "userId");
  const brokerId = assertPositiveInt(input.brokerId, "brokerId");
  const accountNumber = assertPositiveInt(input.accountNumber, "accountNumber");
  const accountText = String(accountNumber);

  const conn = await getConnection(cfg);
  try {
    const [existingRows] = await conn.execute<any[]>(
      "SELECT ID, UserRawData FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1",
      [userId, brokerId],
    );

    let action: string;
    if (existingRows.length > 0) {
      const row = existingRows[0];
      const [stateRows] = await conn.execute<any[]>(
        `SELECT
           CASE
             WHEN JSON_VALID(?) = 0 THEN -1
             WHEN JSON_TYPE(JSON_EXTRACT(?, '$.datasource3')) != 'ARRAY' THEN -1
             WHEN JSON_CONTAINS(JSON_EXTRACT(?, '$.datasource3[*].account_number'), JSON_QUOTE(?)) THEN 1
             ELSE 0
           END AS state`,
        [row.UserRawData, row.UserRawData, row.UserRawData, accountText],
      );
      const state = stateRows[0].state;

      if (state === 1) {
        await conn.execute(
          "UPDATE UserBrokerConsents SET Status = 1, Timestamp = NOW() WHERE ID = ?",
          [row.ID],
        );
        action = `flipped Status to 1 — account ${accountText} was already confirmed, UserRawData untouched`;
      } else if (state === 0) {
        await conn.execute(
          `UPDATE UserBrokerConsents
             SET Status = 1,
                 UserRawData = JSON_ARRAY_APPEND(UserRawData, '$.datasource3', JSON_EXTRACT(?, '$')),
                 Timestamp = NOW()
           WHERE ID = ?`,
          [JSON.stringify({ account_number: accountText }), row.ID],
        );
        action = `flipped Status to 1 and appended account ${accountText} to existing datasource3`;
      } else {
        const rawData = JSON.stringify({ datasource3: [{ account_number: accountText }] });
        await conn.execute(
          "UPDATE UserBrokerConsents SET Status = 1, UserRawData = ?, Timestamp = NOW() WHERE ID = ?",
          [rawData, row.ID],
        );
        action = "flipped Status to 1 and wrote a synthetic datasource3 (no usable JSON was present)";
      }
    } else {
      const rawData = JSON.stringify({ datasource3: [{ account_number: accountText }] });
      await conn.execute(
        "INSERT INTO UserBrokerConsents (UserID, BrokerID, Status, UserRawData, Timestamp) VALUES (?, ?, 1, ?, NOW())",
        [userId, brokerId, rawData],
      );
      action = "inserted a new consent row with a synthetic datasource3";
    }

    const [verifyRows] = await conn.execute<any[]>(
      `SELECT Status,
              JSON_LENGTH(JSON_EXTRACT(UserRawData, '$.datasource3')) AS ds3Accounts,
              JSON_CONTAINS(JSON_EXTRACT(UserRawData, '$.datasource3[*].account_number'), JSON_QUOTE(?)) AS confirmed
       FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1`,
      [accountText, userId, brokerId],
    );
    const [kycRows] = await conn.execute<any[]>(
      "SELECT COUNT(*) AS n FROM KYCInfo WHERE UserID = ?",
      [userId],
    );

    return {
      action,
      status: verifyRows[0]?.Status ?? 0,
      ds3Accounts: verifyRows[0]?.ds3Accounts ?? null,
      accountConfirmed: Boolean(verifyRows[0]?.confirmed),
      kycRowsExisting: kycRows[0]?.n ?? 0,
    };
  } finally {
    await conn.end();
  }
}

// ── seed-accounts: create N trading accounts + consent for a user+broker ────────

export interface SeedAccountsInput {
  userId: number;
  brokerId: number;
  count: number;
  startLogin: number;
  prefix?: string;
}

export interface SeedAccountsResult {
  seededAccounts: number;
  enabledLinks: number;
  ds3Accounts: number | null;
  status: number;
  passingAccounts: number;
  logins: { first: number; last: number };
}

const MAX_SEED_COUNT = 500;
const DEFAULT_PREFIX = "SEED-";

export async function seedTradingAccounts(
  cfg: DbPatchToolConfig,
  input: SeedAccountsInput,
): Promise<SeedAccountsResult> {
  const userId = assertPositiveInt(input.userId, "userId");
  const brokerId = assertPositiveInt(input.brokerId, "brokerId");
  const count = assertPositiveInt(input.count, "count");
  const startLogin = assertPositiveInt(input.startLogin, "startLogin");
  const prefix = input.prefix?.trim() || DEFAULT_PREFIX;

  if (count > MAX_SEED_COUNT) {
    throw createError({ statusCode: 400, message: `count must be <= ${MAX_SEED_COUNT}` });
  }
  // Only [A-Za-z0-9-] — this string is interpolated into a LIKE pattern below.
  if (!/^[A-Za-z0-9-]+$/.test(prefix)) {
    throw createError({ statusCode: 400, message: "prefix may only contain letters, digits and '-'" });
  }

  const conn = await getConnection(cfg);
  try {
    const [brokerRows] = await conn.execute<any[]>(
      "SELECT Name FROM Brokers WHERE ID = ? LIMIT 1",
      [brokerId],
    );
    if (brokerRows.length === 0) {
      throw createError({ statusCode: 404, message: `broker ${brokerId} not found` });
    }
    const brokerName: string = brokerRows[0].Name || "";

    const logins = Array.from({ length: count }, (_, i) => startLogin + i);

    // One existence check per login rather than a single OR'd query — simple and
    // correct, and count is capped at MAX_SEED_COUNT so this stays cheap.
    for (const login of logins) {
      const [rows] = await conn.execute<any[]>(
        `SELECT 1 FROM Accounts WHERE Configuration LIKE CONCAT('%Login=', ?, '%') LIMIT 1`,
        [String(login)],
      );
      if (rows.length > 0) {
        throw createError({
          statusCode: 409,
          message: `login ${login} already exists on an Accounts row — pick a different startLogin`,
        });
      }
    }

    await conn.beginTransaction();

    const accountIds: number[] = [];
    for (const login of logins) {
      const config = `[Account]\nType=MT4\nName=${brokerName}\n\n[MT4]\nLogin=${login}\nPassword=seed\n`;
      const [result] = await conn.execute<any>(
        "INSERT INTO Accounts (BrokerID, Type, Currency, Flags, Name, Configuration, Timestamp) VALUES (?, 0, 6, 0, ?, ?, NOW())",
        [brokerId, `${prefix}${login}`, config],
      );
      accountIds.push(result.insertId);
    }

    for (const accountId of accountIds) {
      await conn.execute(
        "INSERT INTO UserTradeAccounts (UserID, TradeAccountID, Enable, Added, Updated) VALUES (?, ?, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())",
        [userId, accountId],
      );
    }

    const ds3Entries = logins.map((login) => ({
      account_number: String(login),
      trading_platform: "MetaTrader 4",
    }));

    const [existingConsent] = await conn.execute<any[]>(
      "SELECT ID, UserRawData FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1",
      [userId, brokerId],
    );

    if (existingConsent.length === 0) {
      await conn.execute(
        "INSERT INTO UserBrokerConsents (UserID, BrokerID, Status, UserRawData, Timestamp) VALUES (?, ?, 1, ?, NOW())",
        [userId, brokerId, JSON.stringify({ datasource3: ds3Entries })],
      );
    } else {
      const row = existingConsent[0];
      let base: { datasource3: any[] } = { datasource3: [] };
      try {
        const parsed = row.UserRawData ? JSON.parse(row.UserRawData) : null;
        if (parsed && Array.isArray(parsed.datasource3)) base = parsed;
      } catch {
        // malformed JSON already present — treated the same as "nothing to preserve",
        // matching the shell script's RAW_STATE=-1 branch.
      }
      base.datasource3 = [...base.datasource3, ...ds3Entries];
      await conn.execute(
        "UPDATE UserBrokerConsents SET Status = 1, UserRawData = ?, Timestamp = NOW() WHERE ID = ?",
        [JSON.stringify(base), row.ID],
      );
    }

    await conn.commit();

    const [seededCountRows] = await conn.execute<any[]>(
      "SELECT COUNT(*) AS n FROM Accounts WHERE BrokerID = ? AND Name LIKE ?",
      [brokerId, `${prefix}%`],
    );
    const [linkRows] = await conn.execute<any[]>(
      `SELECT COUNT(*) AS n FROM UserTradeAccounts u JOIN Accounts a ON a.ID = u.TradeAccountID
       WHERE u.UserID = ? AND u.Enable = 1 AND a.Name LIKE ?`,
      [userId, `${prefix}%`],
    );
    const [consentRows] = await conn.execute<any[]>(
      "SELECT Status, JSON_LENGTH(JSON_EXTRACT(UserRawData, '$.datasource3')) AS ds3 FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ?",
      [userId, brokerId],
    );
    const [passingRows] = await conn.execute<any[]>(
      `SELECT COUNT(*) AS n
       FROM UserTradeAccounts uta
       JOIN Accounts a ON a.ID = uta.TradeAccountID
       JOIN UserBrokerConsents c ON c.UserID = uta.UserID AND c.BrokerID = a.BrokerID
       WHERE uta.UserID = ? AND uta.Enable = 1 AND a.Name LIKE ? AND c.Status = 1
         AND JSON_CONTAINS(JSON_EXTRACT(c.UserRawData, '$.datasource3[*].account_number'),
               JSON_QUOTE(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(a.Configuration, 'Login=', -1), CHAR(10), 1)))) = 1`,
      [userId, `${prefix}%`],
    );

    return {
      seededAccounts: seededCountRows[0]?.n ?? 0,
      enabledLinks: linkRows[0]?.n ?? 0,
      ds3Accounts: consentRows[0]?.ds3 ?? null,
      status: consentRows[0]?.Status ?? 0,
      passingAccounts: passingRows[0]?.n ?? 0,
      logins: { first: startLogin, last: startLogin + count - 1 },
    };
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // connection may already be closed/broken — nothing more to do
    }
    throw err;
  } finally {
    await conn.end();
  }
}

// ── login-time consent grant ────────────────────────────────────────────────────

/**
 * Read one key out of an INI-shaped config blob, matching the semantics of
 * IniSettingsReader.ReadValue on the CTM side: locate `[section]`, then find
 * `key` within it. Whitespace around both the key and the value is ignored —
 * the live data is written as `ConsentType = 0`, with spaces around the `=`.
 * Returns null when the section or key is absent.
 */
export function readIniValue(
  config: string | null | undefined,
  section: string,
  key: string,
): string | null {
  if (!config) return null;

  let inSection = false;
  for (const rawLine of config.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      inSection = line.slice(1, -1).trim().toLowerCase() === section.toLowerCase();
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith("#") || line.startsWith(";")) continue;

    const eq = line.indexOf("=");
    if (eq < 0) continue;
    if (line.slice(0, eq).trim().toLowerCase() === key.toLowerCase()) {
      return line.slice(eq + 1).trim();
    }
  }
  return null;
}

/**
 * Resolve the consent journey for a broker, exactly as ParseConsentType does:
 * only a literal 1 means Standard; anything else — 0, absent, unparseable —
 * falls back to Legacy.
 */
export function parseBrokerConsentType(docuSignConfiguration: string | null): number {
  const raw = readIniValue(docuSignConfiguration, "ConsentStep", "ConsentType");
  return Number(raw) === STANDARD_CONSENT_TYPE
    ? STANDARD_CONSENT_TYPE
    : LEGACY_CONSENT_TYPE;
}

export interface LoginGrantInput {
  userId: number;
  brokerId: number;
  accountNumbers: string[];
}

export interface LoginGrantResult {
  applied: boolean;
  reason: string;
  brokerName: string;
  consentType: number | null;
  journey: "legacy" | "standard" | "no-consent-required";
  status: number | null;
  ds3Accounts: number | null;
  accountsConfirmed: string[];
}

/**
 * Grant broker consent for a user at login time.
 *
 * Note on semantics: consent properly belongs to the *approval* step, not
 * authentication — the two public APIs (api/user-consent for GBE,
 * api/user/consent/accept for Standard brokers) are what a real broker calls
 * after the customer approves. This function exists as a deliberate testing
 * shortcut so the flow can be driven without clicking through, which is why it
 * is gated behind CONSENT_AUTOPATCH_ON_LOGIN and off by default.
 *
 * The body written matches the broker's own journey, so a Legacy broker never
 * ends up with a datasource3-less row — that combination is what makes
 * CheckConsentAsync reset Status back to 0.
 */
export async function grantConsentOnLogin(
  cfg: DbPatchToolConfig,
  input: LoginGrantInput,
): Promise<LoginGrantResult> {
  const userId = assertPositiveInt(input.userId, "userId");
  const brokerId = assertPositiveInt(input.brokerId, "brokerId");
  const accountNumbers = input.accountNumbers.filter((n) => /^\d+$/.test(n));

  const conn = await getConnection(cfg);
  try {
    const [brokerRows] = await conn.execute<any[]>(
      "SELECT Name, ApiUrl, DocuSignConfiguration FROM Brokers WHERE ID = ? LIMIT 1",
      [brokerId],
    );
    if (brokerRows.length === 0) {
      throw createError({ statusCode: 404, message: `broker ${brokerId} not found` });
    }

    const broker = brokerRows[0];
    const brokerName: string = broker.Name || "";

    // Spec: an empty ApiUrl means the broker has no consent step at all, so the
    // follower goes straight to KYC. Writing a consent row would misrepresent
    // a journey that never runs.
    if (!broker.ApiUrl || String(broker.ApiUrl).trim() === "") {
      return {
        applied: false,
        reason:
          "Broker has no ApiUrl, so the consent step is skipped entirely and the follower goes straight to KYC. Nothing written.",
        brokerName,
        consentType: null,
        journey: "no-consent-required",
        status: null,
        ds3Accounts: null,
        accountsConfirmed: [],
      };
    }

    const consentType = parseBrokerConsentType(broker.DocuSignConfiguration);
    const isLegacy = consentType === LEGACY_CONSENT_TYPE;

    // Legacy is gated on datasource3 containing the subscribed account, so
    // granting without a login would produce a row that un-grants itself.
    if (isLegacy && accountNumbers.length === 0) {
      throw createError({
        statusCode: 400,
        message:
          `Broker ${brokerId} (${brokerName}) is Legacy (ConsentType=0), which requires at least one MT ` +
          "login in datasource3. Pass accountNumbers — a Legacy row without it resets Status to 0 on the first poll.",
      });
    }

    const [existing] = await conn.execute<any[]>(
      "SELECT ID, UserRawData FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1",
      [userId, brokerId],
    );

    // Preserve whatever is already there; a real handover lists every confirmed
    // account and must not be replaced by a synthetic single-account blob.
    let payload: any;
    let base: any = null;
    if (existing.length > 0 && existing[0].UserRawData) {
      try {
        base = JSON.parse(existing[0].UserRawData);
      } catch {
        base = null;
      }
    }

    if (isLegacy) {
      const fresh = buildBrokerHandover({ userId, brokerId, accountNumbers });
      if (base && typeof base === "object") {
        // Merge into whatever is already stored rather than replacing it. Rows
        // written by the old PersonalDetails flow carry real-looking data but no
        // datasource3 at all; those must gain the gate without losing their
        // existing fields, and a real handover must keep every account it
        // already confirmed.
        const existingAccounts = Array.isArray(base.datasource3)
          ? base.datasource3.filter((e: any) => e?.account_number)
          : [];
        const seen = new Set(
          existingAccounts.map((e: any) => String(e.account_number)),
        );
        payload = {
          ...base,
          datasource3: [
            ...existingAccounts,
            ...fresh.datasource3.filter((e) => !seen.has(e.account_number)),
          ],
        };
      } else {
        payload = fresh;
      }
    } else {
      // Standard: the read path never inspects the body, so keep any existing
      // handover rather than overwriting it, and only seed one if absent.
      payload = base ?? SAMPLE_CONSENT_PAYLOAD;
    }

    const serialized = JSON.stringify(payload);
    if (existing.length > 0) {
      await conn.execute(
        "UPDATE UserBrokerConsents SET Status = 1, UserRawData = ?, Timestamp = NOW() WHERE ID = ?",
        [serialized, existing[0].ID],
      );
    } else {
      await conn.execute(
        "INSERT INTO UserBrokerConsents (UserID, BrokerID, Status, UserRawData, Timestamp) VALUES (?, ?, 1, ?, NOW())",
        [userId, brokerId, serialized],
      );
    }

    const [verify] = await conn.execute<any[]>(
      `SELECT Status, JSON_LENGTH(JSON_EXTRACT(UserRawData,'$.datasource3')) AS ds3
       FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1`,
      [userId, brokerId],
    );

    return {
      applied: true,
      reason:
        existing.length > 0
          ? "Updated the existing consent row to Status=1."
          : "Inserted a new consent row at Status=1.",
      brokerName,
      consentType,
      journey: isLegacy ? "legacy" : "standard",
      status: verify[0]?.Status ?? null,
      ds3Accounts: verify[0]?.ds3 ?? null,
      accountsConfirmed: isLegacy ? accountNumbers : [],
    };
  } finally {
    await conn.end();
  }
}

// ── KYC draft seeding ───────────────────────────────────────────────────────────

/**
 * Write a pre-filled KYC personal-information draft for a user.
 *
 * The KYC form's draft comes only from KYCInfo (SfKycPersonalInfoService
 * .GetDraftAsync), never from the broker handover in UserBrokerConsents
 * .UserRawData — so granting consent alone leaves every field blank. This writes
 * the values the draft projection actually reads.
 *
 * JsonData is merged, not replaced, mirroring KycJsonHelper.MergeFields: any key
 * already stored that the fixture does not mention survives.
 */
export async function seedKycDraft(
  cfg: DbPatchToolConfig,
  input: { userId: number; firstName?: string; lastName?: string; email?: string },
): Promise<{ action: string; columnsWritten: number; jsonKeys: string[] }> {
  const userId = assertPositiveInt(input.userId, "userId");
  const draft = buildKycDraft({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
  });

  const conn = await getConnection(cfg);
  try {
    const [existing] = await conn.execute<any[]>(
      "SELECT ID, JsonData FROM KYCInfo WHERE UserID = ? LIMIT 1",
      [userId],
    );

    // Preserve unrelated keys already in JsonData.
    let merged: Record<string, unknown> = {};
    if (existing.length > 0 && existing[0].JsonData) {
      try {
        const parsed = JSON.parse(existing[0].JsonData);
        if (parsed && typeof parsed === "object") merged = parsed;
      } catch {
        // Invalid stored JSON — start clean rather than propagate it.
      }
    }
    merged = { ...merged, ...draft.jsonData };

    const columns = { ...draft.columns, JsonData: JSON.stringify(merged) };
    const names = Object.keys(columns);
    const values = Object.values(columns);

    let action: string;
    if (existing.length > 0) {
      await conn.execute(
        `UPDATE KYCInfo SET ${names.map((n) => `\`${n}\` = ?`).join(", ")} WHERE ID = ?`,
        [...values, existing[0].ID],
      );
      action = `updated existing KYCInfo row ${existing[0].ID}`;
    } else {
      await conn.execute(
        `INSERT INTO KYCInfo (UserID, ${names.map((n) => `\`${n}\``).join(", ")})
         VALUES (?, ${names.map(() => "?").join(", ")})`,
        [userId, ...values],
      );
      action = "inserted a new KYCInfo row";
    }

    return {
      action,
      columnsWritten: names.length,
      jsonKeys: Object.keys(merged),
    };
  } finally {
    await conn.end();
  }
}

// ── account resolution for the Legacy popup ─────────────────────────────────────

export interface ResolvedAccount {
  accountId: number;
  login: string | null;
}

/**
 * List the trading accounts a user holds with one broker.
 *
 * The Legacy popup is handed only `uid` (userId + brokerId) — no account — so it
 * has to work out which accounts to confirm on its own. That is what a real
 * broker does: the GBE handover lists every account the customer holds with it
 * (the live payload carried 32).
 *
 * Only Enable=1 rows, matching SfTradingAccountResolver's own filter — a
 * disabled account is invisible to the read path, so confirming it is pointless.
 */
export async function resolveUserAccounts(
  cfg: DbPatchToolConfig,
  input: { userId: number; brokerId: number },
): Promise<ResolvedAccount[]> {
  const userId = assertPositiveInt(input.userId, "userId");
  const brokerId = assertPositiveInt(input.brokerId, "brokerId");

  const conn = await getConnection(cfg);
  try {
    const [rows] = await conn.execute<any[]>(
      `SELECT a.ID AS accountId, a.Configuration AS configuration
       FROM UserTradeAccounts uta
       JOIN Accounts a ON a.ID = uta.TradeAccountID
       WHERE uta.UserID = ? AND uta.Enable = 1 AND a.BrokerID = ?
       ORDER BY a.ID`,
      [userId, brokerId],
    );

    return rows.map((row) => {
      // Mirrors AccountConfigParser.ExtractAccountNumber closely enough for this
      // purpose: the first non-zero Login= in the INI blob.
      const match = /(^|\n)\s*Login\s*=\s*(\S+)/.exec(String(row.configuration ?? ""));
      const login = match?.[2] && match[2] !== "0" ? match[2] : null;
      return { accountId: Number(row.accountId), login };
    });
  } finally {
    await conn.end();
  }
}

/**
 * The values a Legacy handover should list for an account.
 *
 * Both the internal id and the MT login are emitted, because the two ends of the
 * contract disagree about which one `tradingAccountId` is: the deployed
 * consent-check resolves an Accounts.ID (verified — passing the MT login gets a
 * 403 "not available for this user"), while the live GBE handover stores MT
 * logins in datasource3. IsAccountConfirmedInRawData compares datasource3
 * against whatever value the caller polled with, so listing both makes the
 * handover satisfy either interpretation instead of guessing wrong.
 */
export function handoverAccountNumbers(accounts: ResolvedAccount[]): string[] {
  const values = new Set<string>();
  for (const account of accounts) {
    values.add(String(account.accountId));
    if (account.login && /^\d+$/.test(account.login)) values.add(account.login);
  }
  return [...values];
}

// ── decline ─────────────────────────────────────────────────────────────────────

/**
 * Record a declined consent, by removing the consent session entirely.
 *
 * Deleting rather than setting Status=0, and the reason matters. Status=0 makes
 * CheckConsentAsync answer 200 {completed:false}, and the portal's poll has no
 * timeout at all — "the system never times out; the contract places timeout
 * handling entirely in the portal" — so on the Legacy journey the follower sits
 * on "your account is connecting" indefinitely. With no row, CheckConsentAsync
 * throws NotFound, the poll settles to error, and the portal returns them to the
 * dashboard. A generic error beats being trapped.
 *
 * This matters because the Legacy popup cannot tell the portal it was declined:
 * the portal's completion signals are a same-origin BroadcastChannel (unreachable
 * cross-origin) and the popup closing, which only ever means "now go poll". The
 * Standard journey is unaffected either way — it carries consentApproved=false
 * back on the URL and routes to manual KYC fill without polling.
 *
 * Deleting also withdraws any prior grant, so declining after a previous accept
 * genuinely revokes it instead of leaving a stale "yes" standing.
 *
 * An empty KYCInfo row is created alongside when `withEmptyKyc` is set, so the
 * follower can fill KYC by hand. Note this is cosmetic — GetDraftAsync already
 * projects an empty draft from a missing row, and SubmitAsync creates the row if
 * absent — so it changes what the table contains, not how the form behaves.
 */
export async function declineConsent(
  cfg: DbPatchToolConfig,
  input: { userId: number; brokerId: number; withEmptyKyc?: boolean },
): Promise<{
  action: string;
  status: number | null;
  kyc: string;
}> {
  const userId = assertPositiveInt(input.userId, "userId");
  const brokerId = assertPositiveInt(input.brokerId, "brokerId");

  const conn = await getConnection(cfg);
  try {
    const [existing] = await conn.execute<any[]>(
      "SELECT ID, Status FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1",
      [userId, brokerId],
    );

    let action: string;
    if (existing.length > 0) {
      const [deleted] = await conn.execute<any>(
        "DELETE FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ?",
        [userId, brokerId],
      );
      action =
        existing[0].Status === 1
          ? `revoked a previously granted consent — removed ${deleted.affectedRows} row(s)`
          : `removed ${deleted.affectedRows} not-granted consent row(s)`;
    } else {
      action = "no consent session existed — nothing to remove";
    }

    let kyc = "not requested";
    if (input.withEmptyKyc) {
      const [kycRows] = await conn.execute<any[]>(
        "SELECT ID FROM KYCInfo WHERE UserID = ? LIMIT 1",
        [userId],
      );
      if (kycRows.length > 0) {
        kyc = `left existing KYCInfo row ${kycRows[0].ID} untouched`;
      } else {
        await conn.execute("INSERT INTO KYCInfo (UserID) VALUES (?)", [userId]);
        kyc = "created an empty KYCInfo row";
      }
    }

    const [verify] = await conn.execute<any[]>(
      "SELECT Status FROM UserBrokerConsents WHERE UserID = ? AND BrokerID = ? LIMIT 1",
      [userId, brokerId],
    );

    return {
      action,
      // null = no session left, which is what makes consent-check 404 and lets
      // the portal's error path release the follower to the dashboard.
      status: verify[0]?.Status ?? null,
      kyc,
    };
  } finally {
    await conn.end();
  }
}
