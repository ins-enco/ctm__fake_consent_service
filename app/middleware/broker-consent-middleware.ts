export default defineNuxtRouteMiddleware((to, from) => {
  console.log("broker-consent-middleware");
  const { userId, accountId, brokerId, strategyId } = to.query;
  if (!userId || !accountId || !brokerId || !strategyId) {
    throw createError({
      statusCode: 404,
      statusMessage: "Query params are missing.",
      data: {
        myCustomField: true,
      },
    });
  }
  return true;
});
