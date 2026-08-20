/**
 * Create N trading accounts + consent for a user+broker, the same operation
 * as scripts/seed-trading-accounts.sh, triggered from the /admin/db-tools UI.
 * See grant-consent.post.ts for the key-check rationale.
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

  const { userId, brokerId, count, startLogin, prefix } = body || {};
  if (!userId || !brokerId || !count || !startLogin) {
    throw createError({
      statusCode: 400,
      message: "userId, brokerId, count and startLogin are all required",
    });
  }

  const result = await seedTradingAccounts(dbPatchTool, {
    userId: Number(userId),
    brokerId: Number(brokerId),
    count: Number(count),
    startLogin: Number(startLogin),
    prefix: typeof prefix === "string" ? prefix : undefined,
  });

  return result;
});
