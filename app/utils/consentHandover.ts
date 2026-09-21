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
 * The full eqaq_id -> question-text question bank, captured verbatim from a real
 * live GBE handover payload (ids 1-122, with real gaps at 51/55/66 — GBE's own
 * form-builder skips these, not a copy error here). Kept separate from the
 * per-user "answers" so the question list itself — brokers add/renumber
 * questions over time — can be updated without touching answer-mapping logic.
 *
 * Text (including the mojibake at ids 39/44/67 — "â‚¬", "Â ", "â€œ"/"â€") is
 * reproduced exactly as GBE sends it: those are real double-encoding artifacts
 * on the broker's own side, not something to "fix" here — the fake service
 * must be at least as tolerant/faithful as the real consumer.
 */
const HANDOVER_QUESTION_BANK: ReadonlyArray<{ eqaq_id: string; questions: string }> = [
  { eqaq_id: "1", questions: "" },
  { eqaq_id: "2", questions: "<b>Do you have more than one citizenship?</b>" },
  { eqaq_id: "3", questions: "<b>Select your secondary citizenship</b>" },
  { eqaq_id: "4", questions: "<b>I am most familiar with one or more of the products from the categories below</b>" },
  { eqaq_id: "5", questions: "<b>Title</b>" },
  { eqaq_id: "6", questions: "<b>Other Title</b>" },
  { eqaq_id: "7", questions: "<b>Last Name</b>" },
  { eqaq_id: "8", questions: "<b>Phone</b>" },
  { eqaq_id: "9", questions: "<b>Date of birth</b> <small>(For example 22-11-1978)</small>" },
  { eqaq_id: "10", questions: "<b>Street and house number</b>" },
  { eqaq_id: "11", questions: "<b>Select your citizenship</b>" },
  { eqaq_id: "12", questions: "<b>The country where you pay tax in</b>" },
  { eqaq_id: "13", questions: "<b>Your Tax Identification Number (TIN)</b>" },
  { eqaq_id: "14", questions: "<b>Do you pay taxes in the United States?</b>" },
  { eqaq_id: "15", questions: "<b>Level of Education</b>" },
  { eqaq_id: "16", questions: "<b>Qualification / Field of study</b>" },
  { eqaq_id: "17", questions: "<b>How did you hear about us?</b>" },
  { eqaq_id: "18", questions: "<b>It will be great to hear how did you find us</b>" },
  { eqaq_id: "19", questions: "<b>Occupation</b>" },
  { eqaq_id: "20", questions: "<b>Industry / Sector</b>" },
  { eqaq_id: "21", questions: "<b>Annual income (disposable) </b>" },
  { eqaq_id: "22", questions: "<b>Annual Disposable Income - Please Specify Amount</b>" },
  { eqaq_id: "23", questions: "<b>Savings and Investments</b>" },
  { eqaq_id: "24", questions: "<b>Savings and Investments - Please Specify Amount</b>" },
  { eqaq_id: "25", questions: "<b>What are your investment objectives?</b>" },
  { eqaq_id: "26", questions: "Please Specify" },
  { eqaq_id: "27", questions: "Annual deposit amount (estimated / expected)" },
  { eqaq_id: "28", questions: "<b>Source of deposit funds</b>" },
  { eqaq_id: "29", questions: "<b>Are you a Politically Exposed Person</b>" },
  { eqaq_id: "30", questions: "<b>I have been trading those financial products for</b>" },
  { eqaq_id: "31", questions: "<b>I last carried out a trade:</b>" },
  { eqaq_id: "32", questions: "<b>Please indicate the amount of margin posted for your trading per year:</b>" },
  { eqaq_id: "33", questions: "<b>Please specify your traded volume over the past 12 months: </b>" },
  { eqaq_id: "34", questions: "How much of your invested capital are you prepared to risk?" },
  { eqaq_id: "35", questions: "<b>CFDs as financial instruments are:</b>" },
  { eqaq_id: "36", questions: "<b>What would be the potential impact of using higher leverage?</b>" },
  { eqaq_id: "37", questions: "<b>Which action(s) could prevent a significant loss?</b>" },
  { eqaq_id: "38", questions: "Add terms and conditions + tickbox here" },
  { eqaq_id: "39", questions: "<b>If the contract size of a CFD position is â‚¬10,000 and the leverage is 1:100, this will result in an initial margin requirement of 2% (i.e. â‚¬200).</b>" },
  { eqaq_id: "40", questions: "<b>Frequency of own-decision financial product trading over the last 2 years.</b>" },
  { eqaq_id: "41", questions: "<b>Shares, Equities or ETF's</b>" },
  { eqaq_id: "42", questions: "<b>Futures and / or Options</b>" },
  { eqaq_id: "43", questions: "<b>Forex and / or CFDs</b>" },
  { eqaq_id: "44", questions: "Â " },
  { eqaq_id: "45", questions: "<b>Your Preferred Trading Platform</b>" },
  { eqaq_id: "46", questions: "<b>Place of birth</b>" },
  { eqaq_id: "47", questions: "<b>Are you dealing on own account?</b>" },
  { eqaq_id: "48", questions: "<b>State</b>" },
  { eqaq_id: "49", questions: "<b>Are you subject to church tax?</b>" },
  { eqaq_id: "50", questions: "<b>Are you a Tax Payer in Germany?</b>" },
  { eqaq_id: "52", questions: "<b>Are you affiliated with a stock listed company?</b>" },
  { eqaq_id: "53", questions: "<b>If yes, please specify the relevant company or companies.</b>" },
  { eqaq_id: "54", questions: "<b>Please specify the country in which you pay taxes</b>" },
  { eqaq_id: "56", questions: "<b>House number</b>" },
  { eqaq_id: "57", questions: "<b>Post code</b>" },
  { eqaq_id: "58", questions: "<b>City</b>" },
  { eqaq_id: "59", questions: "<p><b>Are you affiliated with a stock listed company?</b><br></p>" },
  { eqaq_id: "60", questions: "<b>Annual deposit amount - Please specify expected amount</b>" },
  { eqaq_id: "61", questions: "<div class='alert alert-warning' role='alert'>* These fields must be filled in.</div>" },
  { eqaq_id: "62", questions: "<div class='alert alert-warning' role='alert'>* These fields must be filled in.</div>" },
  { eqaq_id: "63", questions: "<div class='alert alert-warning' role='alert'>* These fields must be filled in.</div>" },
  { eqaq_id: "64", questions: "<div class='alert alert-warning' role='alert'>* These fields must be filled in.</div>" },
  { eqaq_id: "65", questions: "<div class='alert alert-warning' role='alert'>* These fields must be filled in.</div>" },
  { eqaq_id: "67", questions: "<div class=alert alert-info>GBE Brokers Ltd (hereinafter called the â€œCompanyâ€) is obliged by the relevant laws and regulations to build economical profile of the Client which consists of identifying the origin of your funds/wealth, not what is the amount of your funds/wealth. This is to fulfil requirements for Anti Money Laundering.</div>" },
  { eqaq_id: "68", questions: "First Name" },
  { eqaq_id: "69", questions: "Last Name" },
  { eqaq_id: "70", questions: "Email" },
  { eqaq_id: "71", questions: "Telephone" },
  { eqaq_id: "72", questions: "Bank Account (if applicable)" },
  { eqaq_id: "73", questions: "Intended Deposit Amount and Currency" },
  { eqaq_id: "74", questions: "<p><strong>In order for the Company to build your economic profile, please select which applies to you.</strong></p><p>Please indicate your source of wealth/funds.</p>" },
  { eqaq_id: "75", questions: "Investments" },
  { eqaq_id: "76", questions: "Trading" },
  { eqaq_id: "77", questions: "Profits from business" },
  { eqaq_id: "78", questions: "Employment" },
  { eqaq_id: "79", questions: "Real Estate" },
  { eqaq_id: "80", questions: "Inheritance" },
  { eqaq_id: "81", questions: "Other" },
  { eqaq_id: "82", questions: "Please provide us with additional details in relation to these funds." },
  { eqaq_id: "83", questions: "<p><strong>In order for the Company to have clear understanding of the source of your funds/wealth and in order to be able to validate the information you have provided on your Account Opening Application Form the Company requires some additional documentation from you.</strong></p><p>Please select below the additional documentation you will provide us</p>" },
  { eqaq_id: "84", questions: "Bank Statements <sup><strong>1</strong></sup>" },
  { eqaq_id: "85", questions: "Tax Returns <sup><strong>2</strong></sup>" },
  { eqaq_id: "86", questions: "Social / National Insurance Payments" },
  { eqaq_id: "87", questions: "Agreement for Sale <sup><strong>3</strong></sup>" },
  { eqaq_id: "88", questions: "Additional Emolument Payments" },
  { eqaq_id: "89", questions: "Other" },
  { eqaq_id: "90", questions: "<p><sup><strong>1</strong></sup> Please note that the Bank Statements need to show full IBAN and transaction history of at least last 3-6 months showing origin of funds coming in.</p><p><sup><strong>2</strong></sup> Please note that you should send the most recent tax return you have.</p><p><sup><strong>3</strong></sup> Please note that you should send contract of sale for any real estate you sold as the required proof of funds to support your deposit.</p><p>Please ensure that any documentation you provide us with has your full name and address on the document(s). Your name and address on any document you supply us with should be the same as the name and address that's on your GBE brokers account.GBE Brokers reserves the right to request additional documentation and/or clarification.</p>" },
  { eqaq_id: "91", questions: "<b>Name of Company</b>" },
  { eqaq_id: "92", questions: "eWallet Type" },
  { eqaq_id: "93", questions: "Credit Card Type" },
  { eqaq_id: "94", questions: "Expiry Year" },
  { eqaq_id: "95", questions: "Expiry Month" },
  { eqaq_id: "96", questions: "Last four digits" },
  { eqaq_id: "97", questions: "Bank Country" },
  { eqaq_id: "98", questions: "Bank Name" },
  { eqaq_id: "99", questions: "Email Address" },
  { eqaq_id: "100", questions: "Card Number" },
  { eqaq_id: "101", questions: "IBAN Number" },
  { eqaq_id: "102", questions: "Payment Method" },
  { eqaq_id: "103", questions: "<b>Country</b>" },
  { eqaq_id: "104", questions: "<b>Your Preferred Trading Platform</b>" },
  { eqaq_id: "105", questions: "<strong>Name of previous Company</strong>" },
  { eqaq_id: "106", questions: "<p class='thm-font-size-icon-xxxl thm-text-icon-success' style='text-align: center;'><i class='fa fa-check-circle'></i></p><p style='font-size: 18px !important; text-align: center;'><b>Congratulations!<br />You have completed the account opening process.<br /><br /></b></p><p style='font-size: 18px !important; text-align: center;'>Our team has saved the application for your GBE brokers trading accountin the system and is now checking it.</p><p style='font-size: 18px !important; text-align: center;'>We will try to process your application as soon as possible. In rare cases,the review may take up to 24 hours to complete.</p><p style='font-size: 18px !important; text-align: center;'>If we have any questions or need anything else from you,we will contact you at the e-mail address you have provided.</p>" },
  { eqaq_id: "107", questions: "Customer submitted this step" },
  { eqaq_id: "108", questions: "<b>Please tell us the name of your agent</b>" },
  { eqaq_id: "109", questions: "<b>Email address</b>" },
  { eqaq_id: "110", questions: "<b>Select your citizenship</b>" },
  { eqaq_id: "111", questions: "<b>Select your secondary citizenship</b>" },
  { eqaq_id: "112", questions: "<b>Do you have more than one citizenship?</b>" },
  { eqaq_id: "113", questions: "<b>Your preferred trading platform</b>" },
  { eqaq_id: "114", questions: "<b>How did you hear about us?</b>" },
  { eqaq_id: "115", questions: "<b>It will be great to hear how did you find us.</b>" },
  { eqaq_id: "116", questions: "<b>Please tell us the name of your agent.</b>" },
  { eqaq_id: "117", questions: "<b>Are you dealing on own account?</b>" },
  { eqaq_id: "118", questions: "<b>Are you a politically exposed person (PEP)?</b>" },
  { eqaq_id: "119", questions: "<div class='alert alert-warning' role='alert'>* These fields must be filled in.</div>" },
  { eqaq_id: "120", questions: "Content is in onboarding questionnaire" },
  { eqaq_id: "121", questions: "Are you a politically exposed person (PEP)?" },
  { eqaq_id: "122", questions: "Are you dealing on own account?" },
];

/**
 * Build the Legacy-journey handover.
 *
 * datasource1/datasource2 carry the KYC pre-fill data and are derived from
 * SAMPLE_CONSENT_PAYLOAD so the two payload shapes cannot drift apart.
 * datasource3 is the part CheckConsentAsync actually gates on.
 *
 * Both datasource1's field set and datasource2's question bank were corrected
 * against a real captured GBE handover: datasource1 previously invented
 * `approximate_annual_income` (not a real field) and was missing
 * doc_category/doc_created_dt/doc_id/doc_status_id/doc_status_title/
 * doc_type_id/idnum/tax_id_label; datasource2 previously answered only 8
 * hand-picked ids (several at the WRONG id — e.g. eqaq_id "1" is blank in the
 * real payload, not "First Name") against a curated question list, rather
 * than the real ~100-entry bank. Answers are still filled in only for
 * unambiguous ids; the rest stay blank, matching the real payload's own
 * overwhelmingly-blank distribution.
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

  // Keyed by eqaq_id — only ids whose question text unambiguously identifies
  // the field get a real answer; every other id in HANDOVER_QUESTION_BANK is
  // left blank, same as the real captured payload.
  const answersById: Record<string, string> = {
    "5": PersonalDetails.Salutation, // "Title" pairs with "6" (Other Title, left blank)
    "7": PersonalDetails.LastName,
    "8": Address.Phone,
    "9": PersonalDetails.DateOfBirth,
    "10": `${Address.Street} ${Address.HouseNumber}`,
    "15": EducationAndProfession.EducationLevel,
    "19": EducationAndProfession.Profession,
    "28": WealthAndIncome.OriginVermoegen,
    "29": "No",
    "46": PersonalDetails.PlaceOfBirth,
    "56": Address.HouseNumber,
    "57": Address.Zip,
    "58": Address.City,
    "68": PersonalDetails.FirstName,
    "69": PersonalDetails.LastName,
    "70": Address.Email,
    "71": Address.Phone,
    "99": Address.Email,
    "103": Address.Country,
    "109": Address.Email,
    "118": "No",
    "121": "No",
  };

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
        doc_category: "doc-id",
        doc_category_title: "Proof of ID",
        doc_created_dt: IdentificationDocument.PpIssueDate,
        doc_type_title: IdentificationDocument.Passport,
        doc_type_id: "8",
        doc_expiration_dt: `${IdentificationDocument.PpExpiryDate} 00:00:00.0`,
        doc_issue_dt: IdentificationDocument.PpIssueDate,
        doc_id: IdentificationDocument.PpNo,
        doc_status_id: "5",
        doc_status_title: "",
        identification: IdentificationDocument.PpNo,
        idnum: "0",
        tax_id_no: IdentificationDocument.VATNo,
        tax_id_domicile: IdentificationDocument.TaxResidency,
        tax_id_label: "",
        bank_name: WealthAndIncome.ClientBank,
        bank_account_no: WealthAndIncome.ClientIban,
      },
    ],
    datasource2: HANDOVER_QUESTION_BANK.map((q) => ({
      ...q,
      answers: answersById[q.eqaq_id] ?? "",
    })),
    datasource3: opts.accountNumbers.map((n) => ({
      account_number: String(n),
      trading_platform: platform,
    })),
    signature: PLACEHOLDER_SIGNATURE,
    uid: buildConsentUid(opts.userId, opts.brokerId),
  };
}
