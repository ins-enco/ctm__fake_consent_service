export default defineEventHandler(async (event) => {
  setHeader(event, "Content-Type", "application/json");
  // Parse query parameters
  const query = getQuery(event);
  const { userId, brokerId } = query;
  // Parse the POST body
  const body = await readBody(event);

  if (!userId || !brokerId) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameters: userId or brokerId",
    });
  }

  // This is the Standard-broker endpoint. The Legacy (GBE) journey posts its
  // datasource-shaped handover to /api/user-consent instead — two separate
  // public APIs, deliberately not merged, since each broker family calls only
  // its own and a body valid for one is invalid for the other.
  const validationResult = AcceptConsentSchema.validate(body, {
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

  // Persist on accept, and seed the KYC draft at the same moment. Accept is when
  // consent is actually given — writing at login instead would record a grant
  // for someone who then declines. The KYC draft has to be written explicitly
  // because the form reads it from KYCInfo and never from the handover body.
  // Inert unless the database is configured.
  const { dbPatchTool } = useRuntimeConfig(event);
  let persisted = null;
  let kycSeeded = null;
  if (isDbPatchToolConfigured(dbPatchTool)) {
    try {
      // Resolve the accounts rather than passing none. A Standard broker is not
      // gated on datasource3 so it would not need them — but this endpoint can
      // be pointed at a broker configured Legacy, and a Legacy row without
      // datasource3 resets its own Status to 0. Supplying them is harmless for
      // Standard (nothing reads the body) and correct for Legacy.
      const accounts = await resolveUserAccounts(dbPatchTool, {
        userId: Number(userId),
        brokerId: Number(brokerId),
      });
      persisted = await grantConsentOnLogin(dbPatchTool, {
        userId: Number(userId),
        brokerId: Number(brokerId),
        accountNumbers: handoverAccountNumbers(accounts),
      });
      try {
        kycSeeded = await seedKycDraft(dbPatchTool, { userId: Number(userId) });
      } catch (error: any) {
        kycSeeded = { error: error?.message ?? "Failed to seed the KYC draft" };
      }
    } catch (error: any) {
      persisted = { error: error?.message ?? "Failed to persist consent" };
    }
  } else {
    persisted = {
      applied: false,
      reason: "Database not configured — consent was validated but not stored.",
    };
  }

  const response = {
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
      Consent: {
        UserID: String(userId),
        BrokerID: String(brokerId),
        Persisted: persisted,
        KycDraft: kycSeeded,
      },
    },
  };

  // Return the response
  return response;
});
