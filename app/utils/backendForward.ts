/**
 * Pure helpers for forwarding a consent callback to the real CTM backend.
 *
 * Kept free of Nuxt/h3 imports so jest can exercise them directly; the
 * request plumbing lives in server/utils/ctmBackend.ts.
 */

/** The two broker callbacks CTM_Admin_Backend exposes (CR-1268). */
export const BACKEND_LEGACY_CONSENT_PATH = "api/user-consent";
export const BACKEND_STANDARD_CONSENT_PATH = "api/user/consent/accept";

/**
 * Join the backend root with a callback path and carry the caller's query
 * string over unchanged — `uid` for Legacy, `userId`/`brokerId` for Standard.
 * The query is passed through verbatim rather than rebuilt, so whatever the
 * page sent (malformed ids included) is what the backend gets to validate.
 */
export function buildBackendUrl(
  backendRoot: string,
  path: string,
  search: string,
): string {
  const root = backendRoot.trim().replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const query = search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `${root}/${cleanPath}${query}`;
}
