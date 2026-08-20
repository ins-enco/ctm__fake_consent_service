/**
 * Shared loading state for the broker consent flow.
 *
 * Backed by `useState` so the flag is SSR-safe and shared across every
 * component that calls the composable, rather than being per-instance.
 */
export const useLoader = () => {
  const isLoading = useState<boolean>("broker-consent-loading", () => false);

  const showLoader = () => {
    isLoading.value = true;
  };

  const hideLoader = () => {
    isLoading.value = false;
  };

  return { isLoading, showLoader, hideLoader };
};
