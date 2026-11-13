import type { H3Event } from "h3";
import { buildBackendUrl } from "~/utils/backendForward";

/**
 * Forward a broker consent callback to the real CTM_Admin_Backend.
 *
 * When CTM_BACKEND_URL is set, the fake broker stops answering its own
 * callbacks and posts them to the backend instead — the way GBE and BlackBull
 * reach CTM in production — so the backend's endpoints can be tested end to
 * end. The call is made server-side, not from the browser, so it does not
 * depend on the backend sending CORS headers for this origin.
 *
 * Nothing is validated or written locally in this mode: the raw body and query
 * go through untouched, and the backend's status code and body come back
 * untouched, so what the page sees is exactly what the backend answered.
 */

const FORWARD_TIMEOUT_MS = 15000;

export function isCtmBackendConfigured(event: H3Event): boolean {
  const { ctmBackendUrl } = useRuntimeConfig(event);
  return Boolean(ctmBackendUrl && String(ctmBackendUrl).trim());
}

export async function forwardToCtmBackend(event: H3Event, path: string) {
  const { ctmBackendUrl } = useRuntimeConfig(event);
  const target = buildBackendUrl(
    String(ctmBackendUrl),
    path,
    getRequestURL(event).search,
  );

  const rawBody = (await readRawBody(event)) ?? "";
  const contentType = getHeader(event, "content-type") || "application/json";

  let response: Response;
  try {
    response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": contentType, Accept: "application/json" },
      body: rawBody,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
  } catch (error: any) {
    // The backend never answered (down, wrong URL, timeout). Say so plainly
    // rather than letting it look like a backend-side rejection.
    throw createError({
      statusCode: 502,
      message: `Could not reach CTM backend at ${target}: ${error?.message ?? error}`,
    });
  }

  const text = await response.text();

  setResponseStatus(event, response.status, response.statusText);
  setHeader(
    event,
    "Content-Type",
    response.headers.get("content-type") || "application/json",
  );
  // Lets the page (and anyone reading the network tab) tell a forwarded answer
  // from the local mock's.
  setHeader(event, "X-Consent-Forwarded-To", target);

  return text;
}
