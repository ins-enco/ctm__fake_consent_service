/**
 * Grant broker consent at login time — a testing shortcut.
 *
 * Consent properly belongs to the approval step: a real broker calls
 * api/user-consent (GBE) or api/user/consent/accept (Standard) *after* the
 * customer approves. Writing it at login means a customer who then declines has
 * already been recorded as consenting, so this is not how the real flow behaves.
 *
 * It exists so the flow can be driven without clicking through, and is guarded
 * twice over:
 *   - CONSENT_AUTOPATCH_ON_LOGIN must be explicitly enabled, and
 *   - the CTM_DB_* credentials must be configured.
 * With either absent this endpoint is inert and reports that it did nothing, so
 * it cannot fire by accident against a shared database.
 */
export default defineEventHandler(async (event) => {
  const { dbPatchTool, consentAutopatchOnLogin } = useRuntimeConfig(event);

  if (consentAutopatchOnLogin !== "true") {
    return {
      applied: false,
      reason:
        "Login-time consent patching is disabled. Set CONSENT_AUTOPATCH_ON_LOGIN=true in .env to enable it.",
    };
  }

  if (!isDbPatchToolConfigured(dbPatchTool)) {
    return {
      applied: false,
      reason:
        "Login-time consent patching is enabled but the database is not configured — set CTM_DB_* and DB_PATCH_TOOL_KEY in .env.",
    };
  }

  const body = await readBody(event);
  const { userId, brokerId, accountNumbers } = body || {};

  if (!userId || !brokerId) {
    throw createError({
      statusCode: 400,
      message: "userId and brokerId are required",
    });
  }

  const logins = Array.isArray(accountNumbers)
    ? accountNumbers.map((n: unknown) => String(n))
    : String(accountNumbers ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const consent = await grantConsentOnLogin(dbPatchTool, {
    userId: Number(userId),
    brokerId: Number(brokerId),
    accountNumbers: logins,
  });

  // KYCInfo is never touched by any consent endpoint anymore — see
  // /api/user-consent for why (a seeded KYCInfo row outranks consent-derived
  // prefill and made that behavior impossible to observe).
  return consent;
});
