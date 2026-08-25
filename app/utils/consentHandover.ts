import { SAMPLE_CONSENT_PAYLOAD } from "./consentPayload";

/**
 * Broker handover payload for the Legacy consent journey (ConsentType = 0).
 *
 * Why this shape exists
 * --------------------
 * SfBrokerConsentService.ParseConsentType treats ConsentType=1 as the Standard
 * journey and *anything else* — including 0, absent, or unparseable — as Legacy.
 * The two journeys are reported completed by very different rules:
 *
 *   Standard (1): CheckConsentAsync returns Completed as soon as Status=1. The
 *                 handover body is never inspected.
 *   Legacy  (0):  Status=1 is not enough. CheckConsentAsync also requires
 *                 UserRawData.datasource3[].account_number to contain the polled
 *                 MT login. If it does not, it writes Status back to 0 and
 *                 reports not-completed — so a handover without datasource3
 *                 doesn't merely fail, it silently un-grants the consent.
 *
 * The `PersonalDetails`-shaped body in consentPayload.ts carries no datasource3
 * at all, which is why consent rows written from it degrade to Status=0 on the
 * first poll. This module produces the datasource-shaped body a real broker
 * sends, so the Legacy journey actually passes.
 *
 * Field names mirror the live GBE handover exactly (snake_case, `datasourceN`
 * arrays) — they are the broker's contract, not ours, so they are not renamed
 * to match this codebase's camelCase conventions.
 */

export const LEGACY_CONSENT_TYPE = 0;
export const STANDARD_CONSENT_TYPE = 1;

/** Platform label as the broker writes it in datasource3. */
export type TradingPlatform = "MetaTrader 4" | "MetaTrader 5";

export interface HandoverAccount {
  account_number: string;
  trading_platform: TradingPlatform;
}

export interface BrokerHandover {
  customer_no: string;
  datasource1: Record<string, unknown>[];
  datasource2: { eqaq_id: string; questions: string; answers: string }[];
  datasource3: HandoverAccount[];
  signature: string;
  uid: string;
}

/**
 * Observed value in the live GBE handover. It is the SHA-256 of the empty
 * string, i.e. the broker ships a placeholder, and nothing on the CTM side
 * verifies it — so it is reproduced verbatim rather than computed.
 */
const PLACEHOLDER_SIGNATURE =
  "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855";

/**
 * Parse a `consentType` query value the way the backend does: 1 means Standard,
 * everything else (including absent and unparseable) falls back to Legacy.
 */
export function parseConsentType(raw: unknown): number {
  return Number(raw) === STANDARD_CONSENT_TYPE
    ? STANDARD_CONSENT_TYPE
    : LEGACY_CONSENT_TYPE;
}

/**
 * The `uid` the Legacy (GBE) journey carries: the user id and broker id joined
 * by a literal "a" — user 12345 on broker 67 becomes "12345a67".
 *
 * Verified against production data: every UserBrokerConsents row that stores a
 * uid matches CONCAT(UserID,'a',BrokerID). It is a composite key, not just the
 * user id, because one user holds a separate consent per broker.
 */
export function buildConsentUid(
  userId: string | number,
  brokerId: string | number,
): string {
  return `${userId}a${brokerId}`;
}

/**
 * Split a Legacy `uid` back into its parts. Returns null when the value is not
 * a well-formed `<digits>a<digits>` pair, so callers can reject rather than
 * silently proceed with a half-parsed identity.
 */
export function parseConsentUid(
  uid: unknown,
): { userId: string; brokerId: string } | null {
  const match = /^(\d+)a(\d+)$/.exec(String(uid ?? ""));
  if (!match?.[1] || !match[2]) return null;
  return { userId: match[1], brokerId: match[2] };
}

/**
 * Entry point for the Legacy journey. The follower is sent to this in a popup
 * window (not a full-page redirect, which is the Standard journey's shape), and
 * it is GBE-specific — `my-syntellicore` is Syntellicore's own path.
 */
export function buildLegacyConsentUrl(
  apiUrl: string,
  userId: string | number,
  brokerId: string | number,
): string {
  const base = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  const query = new URLSearchParams({
    is_ms: "1",
    uid: buildConsentUid(userId, brokerId),
  }).toString();
  return `${base}my-syntellicore?${query}`;
}

/**
 * Entry point for the Standard journey: a full-page redirect to Broker.ApiUrl
 * carrying the four identifiers.
 */
export function buildStandardConsentUrl(
  apiUrl: string,
  params: {
    userId: string | number;
    accountId: string | number;
    brokerId: string | number;
    strategyId: string | number;
  },
): string {
  const query = new URLSearchParams({
    userId: String(params.userId),
    accountId: String(params.accountId),
    brokerId: String(params.brokerId),
    strategyId: String(params.strategyId),
  }).toString();
  return `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}${query}`;
}

/**
 * Read the MT logins to confirm from a query value.
 *
 * Accepts a comma-separated list so one handover can confirm several accounts,
 * which is what a real broker does — the live GBE payload listed 32. Falls back
 * to `accountId` when no explicit list is given, since in the fake flow that is
 * the only account identifier available.
 */
export function parseAccountNumbers(
  accountNumbers: unknown,
  accountIdFallback: unknown,
): string[] {
  const raw = typeof accountNumbers === "string" ? accountNumbers : "";
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  if (parsed.length > 0) return parsed;

  const fallback = String(accountIdFallback ?? "").trim();
  return /^\d+$/.test(fallback) ? [fallback] : [];
}

/**
 * Build the Legacy-journey handover.
 *
 * datasource1/datasource2 carry the KYC pre-fill data and are derived from
 * SAMPLE_CONSENT_PAYLOAD so the two payload shapes cannot drift apart.
 * datasource3 is the part CheckConsentAsync actually gates on.
 */
export function buildBrokerHandover(opts: {
  userId: string | number;
  brokerId: string | number;
  accountNumbers: Array<string | number>;
  platform?: TradingPlatform;
}): BrokerHandover {
  const platform: TradingPlatform = opts.platform ?? "MetaTrader 4";
  const { PersonalDetails, Address, IdentificationDocument, EducationAndProfession, WealthAndIncome } =
    SAMPLE_CONSENT_PAYLOAD;

  return {
    customer_no: `CU${opts.userId}`,
    datasource1: [
      {
        fname: PersonalDetails.FirstName,
        lname: PersonalDetails.LastName,
        title: PersonalDetails.Salutation,
        birth_dt: `${PersonalDetails.DateOfBirth} 00:00:00.0`,
        city: Address.City,
        address: Address.Street,
        address2: Address.ExtraAddress,
        zip: Address.Zip,
        country_of_residence: Address.Country,
        email: Address.Email,
        tel1: Address.Phone,
        doc_type_title: IdentificationDocument.Passport,
        doc_category_title: "Proof of ID",
        doc_expiration_dt: `${IdentificationDocument.PpExpiryDate} 00:00:00.0`,
        doc_issue_dt: IdentificationDocument.PpIssueDate,
        identification: IdentificationDocument.PpNo,
        tax_id_no: IdentificationDocument.VATNo,
        tax_id_domicile: IdentificationDocument.TaxResidency,
        approximate_annual_income: WealthAndIncome.AnnualNetIncome,
        bank_name: WealthAndIncome.ClientBank,
        bank_account_no: WealthAndIncome.ClientIban,
      },
    ],
    datasource2: [
      { eqaq_id: "1", questions: "<b>First Name</b>", answers: PersonalDetails.FirstName },
      { eqaq_id: "7", questions: "<b>Last Name</b>", answers: PersonalDetails.LastName },
      { eqaq_id: "8", questions: "<b>Phone</b>", answers: Address.Phone },
      { eqaq_id: "10", questions: "<b>Address</b>", answers: Address.Street },
      {
        eqaq_id: "15",
        questions: "<b>Level of Education</b>",
        answers: EducationAndProfession.EducationLevel,
      },
      {
        eqaq_id: "19",
        questions: "<b>Occupation</b>",
        answers: EducationAndProfession.Profession,
      },
      {
        eqaq_id: "28",
        questions: "<b>Source of deposit funds</b>",
        answers: WealthAndIncome.OriginVermoegen,
      },
      { eqaq_id: "29", questions: "<b>Are you a Politically Exposed Person</b>", answers: "No" },
    ],
    datasource3: opts.accountNumbers.map((n) => ({
      account_number: String(n),
      trading_platform: platform,
    })),
    signature: PLACEHOLDER_SIGNATURE,
    uid: buildConsentUid(opts.userId, opts.brokerId),
  };
}
