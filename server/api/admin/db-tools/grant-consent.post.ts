/**
 * Flip an existing user+broker consent row to granted (Status=1), the same
 * operation as scripts/patch-consent.sh, triggered from the /admin/db-tools UI.
 *
 * Guarded by DB_PATCH_TOOL_KEY — a shared secret the caller must send back,
 * checked with a constant-time comparison so response timing can't be used to
 * guess it. This is not a real auth system; it exists only so the endpoint
 * isn't a bare unauthenticated write path into a shared database.
 */
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default defineEventHandler(async (event) => {
  const { dbPatchTool } = useRuntimeConfig(event);

  if (!isDbPatchToolConfigured(dbPatchTool)) {
    throw createError({
      statusCode: 503,
      message: "DB patch tool is not configured — set CTM_DB_* and DB_PATCH_TOOL_KEY in .env",
    });
  }

  const body = await readBody(event);
  const key = getHeader(event, "x-db-patch-key") || "";
  if (!key || !safeEqual(key, dbPatchTool.key)) {
    throw createError({ statusCode: 401, message: "Missing or incorrect DB patch key" });
  }

  const { userId, brokerId, accountNumber } = body || {};
  if (!userId || !brokerId || !accountNumber) {
    throw createError({
      statusCode: 400,
      message: "userId, brokerId and accountNumber are all required",
    });
  }

  const result = await grantConsent(dbPatchTool, {
    userId: Number(userId),
    brokerId: Number(brokerId),
    accountNumber: Number(accountNumber),
  });

  return result;
});
