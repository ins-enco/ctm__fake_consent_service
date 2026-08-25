/**
 * Tracks the site that sent the user into the consent flow, so the flow can
 * hand control back to it at the end.
 *
 * The Standard journey (ConsentType = 1) is a full-page redirect from CTM to
 * Broker.ApiUrl carrying only userId/accountId/brokerId/strategyId — there is no
 * return-URL parameter to read. The only signal the browser gives us is the
 * referrer, and it is fragile:
 *
 *   - it is only present on the *entry* request (the login page). By the time
 *     the user reaches the approval page via in-app navigation, reading it again
 *     may yield this service's own URL instead of CTM's;
 *   - a full reload of the approval page makes the referrer the login page,
 *     i.e. same-origin and useless;
 *   - `Referrer-Policy` can strip it to the bare origin or drop it entirely.
 *
 * So it is captured once, at the entry point, and persisted in sessionStorage
 * for the rest of the flow. sessionStorage (not localStorage) because this is
 * per-tab, per-flow state that must not leak into a later unrelated session.
 *
 * Both the server-side `Referer` header and `document.referrer` are consulted:
 * on the very first render only the header is available, and it is the more
 * reliable of the two.
 */
export const useOriginSite = () => {
  const STORAGE_KEY = "broker-consent:origin-site";
  const requestUrl = useRequestURL();
  const headers = useRequestHeaders(["referer"]);

  /**
   * Keep a candidate only if it is a real, different site. A same-origin
   * referrer means we arrived from this fake service itself, which is not an
   * origin to return to.
   */
  const foreignOnly = (candidate?: string | null): string | null => {
    if (!candidate) return null;
    try {
      const url = new URL(candidate);
      if (!/^https?:$/.test(url.protocol)) return null;
      return url.origin === requestUrl.origin ? null : url.toString();
    } catch {
      return null;
    }
  };

  /** Call at the entry point, before any in-app navigation loses the referrer. */
  const capture = (): string | null => {
    const found =
      foreignOnly(headers.referer) ??
      (import.meta.client ? foreignOnly(document.referrer) : null);

    if (found && import.meta.client) {
      sessionStorage.setItem(STORAGE_KEY, found);
    }
    return found;
  };

  /** Call wherever the flow needs to hand control back. */
  const resolve = (): string | null => {
    if (import.meta.client) {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    }
    return (
      foreignOnly(headers.referer) ??
      (import.meta.client ? foreignOnly(document.referrer) : null)
    );
  };

  const clear = () => {
    if (import.meta.client) sessionStorage.removeItem(STORAGE_KEY);
  };

  return { capture, resolve, clear };
};
