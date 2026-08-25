import { parseConsentUid } from "~/utils/consentHandover";

/**
 * List the trading accounts the Legacy popup should offer to confirm.
 *
 * The popup is handed only `uid` (<userId>a<brokerId>), so it cannot know which
 * accounts to put in datasource3 — this resolves them the way a real broker
 * would, from its own records.
 *
 * Returns an empty list rather than an error when the database is not
 * configured, so the popup degrades to its ?accountNumbers= query fallback
 * instead of breaking.
 */
export default defineEventHandler(async (event) => {
  const { dbPatchTool } = useRuntimeConfig(event);
  const query = getQuery(event);

  const identity = parseConsentUid(query.uid);
  if (!identity) {
    throw createError({
      statusCode: 400,
      message: "Missing or malformed uid — expected <userId>a<brokerId>, e.g. 12345a67",
    });
  }

  if (!isDbPatchToolConfigured(dbPatchTool)) {
    return {
      configured: false,
      userId: identity.userId,
      brokerId: identity.brokerId,
      accounts: [],
      reason:
        "Database is not configured, so accounts cannot be resolved — pass ?accountNumbers= explicitly.",
    };
  }

  const accounts = await resolveUserAccounts(dbPatchTool, {
    userId: Number(identity.userId),
    brokerId: Number(identity.brokerId),
  });

  return {
    configured: true,
    userId: identity.userId,
    brokerId: identity.brokerId,
    accounts,
    handoverNumbers: handoverAccountNumbers(accounts),
  };
});
