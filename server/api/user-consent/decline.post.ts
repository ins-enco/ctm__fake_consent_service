import { parseConsentUid } from "~/utils/consentHandover";

/**
 * Record that the follower declined broker consent.
 *
 * Called by both journeys' Decline buttons. Without it nothing is written, and a
 * missing UserBrokerConsents row makes consent-check throw NotFound — which the
 * portal reports as an unrecoverable error and answers by returning the follower
 * to the dashboard. A row at Status=0 says "session exists, not granted", so the
 * poll answers 200 {completed:false} instead.
 *
 * Accepts the Legacy `uid` (<userId>a<brokerId>) or explicit userId/brokerId, so
 * the same endpoint serves the popup and the redirect page.
 */
export default defineEventHandler(async (event) => {
  const { dbPatchTool } = useRuntimeConfig(event);
  const query = getQuery(event);
  const body = await readBody(event).catch(() => ({}));

  const fromUid = parseConsentUid(query.uid ?? (body as any)?.uid);
  const userId = Number(fromUid?.userId ?? body?.userId ?? query.userId);
  const brokerId = Number(fromUid?.brokerId ?? body?.brokerId ?? query.brokerId);

  if (!userId || !brokerId) {
    throw createError({
      statusCode: 400,
      message:
        "Need either uid=<userId>a<brokerId>, or userId and brokerId explicitly.",
    });
  }

  if (!isDbPatchToolConfigured(dbPatchTool)) {
    return {
      applied: false,
      reason:
        "Database is not configured — the decline was accepted but not recorded.",
    };
  }

  const result = await declineConsent(dbPatchTool, {
    userId,
    brokerId,
    // Create the empty KYC row so the manual fill path has one to work with.
    withEmptyKyc: body?.withEmptyKyc !== false,
  });

  return { applied: true, userId: String(userId), brokerId: String(brokerId), ...result };
});
