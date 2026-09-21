// Explicit import: Nuxt auto-imports server/utils, not app/utils, so these
// shared pure helpers have to be pulled in by hand on the server side.
import {
  parseConsentUid,
  LEGACY_CONSENT_TYPE,
} from "~/utils/consentHandover";

/**
 * Legacy consent journey (ConsentType = 0) — the endpoint GBE calls.
 *
 * Counterpart to /api/user/consent/accept.json, which the Standard brokers
 * call. Both update UserBrokerConsent.UserRawData and .Status, but they take
 * different bodies and are kept separate accordingly:
 *
 *   this one  → datasource-shaped broker handover (datasource1/2/3)
 *   accept    → PersonalDetails-shaped body
 *
 * The Legacy read path (SfBrokerConsentService.CheckConsentAsync) requires
 * Status=1 *and* datasource3[].account_number to contain the account being
 * subscribed. A handover without datasource3 does not merely fail the check —
 * the read path writes Status back to 0 — so BrokerHandoverSchema requires a
 * non-empty datasource3 and rejects the self-destructing shapes up front.
 *
 * Identified by `uid` (<userId>a<brokerId>) rather than separate query
 * parameters, which is what GBE sends.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, "Content-Type", "application/json");

  const query = getQuery(event);
  const body = await readBody(event);

  // uid may arrive on the query string or in the body; GBE sends it on the URL.
  const identity = parseConsentUid(query.uid ?? (body as any)?.uid);
  if (!identity) {
    throw createError({
      statusCode: 400,
      message:
        "Missing or malformed uid — expected the composite form <userId>a<brokerId>, e.g. 12345a67",
    });
  }

  const validationResult = BrokerHandoverSchema.validate(body, {
    abortEarly: false,
  });
  if (validationResult.error) {
    throw createError({
      statusCode: 400,
      message:
        validationResult.error?.message ||
        "There are some error with request body",
    });
  }

  const accountNumbers: string[] = (body?.datasource3 ?? []).map(
    (a: { account_number: string }) => a.account_number,
  );

  // Persist, so the flow actually completes. The real CTM endpoint is what
  // writes UserBrokerConsent.Status/.UserRawData; returning a canned success
  // without writing would leave consent-check reporting "not yet" forever.
  // Inert unless the database is configured.
  //
  // KYCInfo is deliberately never touched here. It used to be seeded from a
  // hardcoded fixture as a convenience, but that write outranks any
  // consent-derived prefill (a saved KYCInfo value always wins), which made it
  // impossible to observe the real consent-to-KYC prefill behavior. The only
  // write this endpoint makes is to UserBrokerConsent.
  const { dbPatchTool } = useRuntimeConfig(event);
  let persisted = null;
  if (isDbPatchToolConfigured(dbPatchTool)) {
    try {
      persisted = await grantConsentOnLogin(dbPatchTool, {
        userId: Number(identity.userId),
        brokerId: Number(identity.brokerId),
        accountNumbers,
      });
    } catch (error: any) {
      persisted = { error: error?.message ?? "Failed to persist consent" };
    }
  } else {
    persisted = {
      applied: false,
      reason: "Database not configured — consent was validated but not stored.",
    };
  }

  return {
    JSON: {
      Version: 3,
      Messages: {
        Type: "Table",
        RowCount: 1,
        Rows: [
          {
            ID: "1",
            Error: "None",
            Code: "OK",
            Source: "Confirm User Consent",
            Content: "Succeeded",
          },
        ],
        Lookup: {
          "1": 0,
        },
      },
      // Echoed so a caller can confirm which identity and which accounts the
      // handover actually registered, without having to read the database.
      Consent: {
        UserID: identity.userId,
        BrokerID: identity.brokerId,
        ConsentType: LEGACY_CONSENT_TYPE,
        Status: 1,
        AccountNumbers: accountNumbers,
        Persisted: persisted,
      },
    },
  };
});
