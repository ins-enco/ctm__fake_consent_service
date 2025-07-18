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
    },
  };

  // Return the response
  return response;
});
