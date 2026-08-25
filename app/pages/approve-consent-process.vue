<template>
  <div class="flex h-full items-center justify-center">
    <div
      class="w-[800px]! rounded-lg p-8 shadow-xl dark:bg-[#151419]"
      style="max-width: 800px"
    >
      <h2 class="mb-4 text-3xl font-bold">Approval Consent</h2>

      <p class="mb-6 text-lg">
        In order to proceed, we need your consent to share your information with
        our trusted broker, CTM. Please read the details below carefully:
      </p>

      <!-- Information about consent -->
      <div class="mb-6 rounded-lg p-4">
        <h3 class="text-xl font-semibold">Why We Need Your Consent</h3>
        <p class="mt-2 italic text-yellow-600">
          We will share your basic personal information, such as your name,
          email, and contact details, with CTM to help them provide you with
          better services and financial recommendations.
        </p>
        <p class="mt-2 italic text-yellow-600">
          Your information will be handled with utmost confidentiality, and you
          can withdraw your consent at any time by contacting our support team.
        </p>
      </div>

      <!-- Consent agreement -->
      <div class="mb-6 flex items-center">
        <input
          type="checkbox"
          id="approve-consent"
          v-model="isConsentApproved"
          class="mr-2 h-4 w-4 rounded border-gray-300"
        />
        <label for="approve-consent" class="text-sm">
          I approve sharing my information with CTM for better services.
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-between">
        <button
          @click="handleDecline"
          class="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          Decline
        </button>
        <button
          :disabled="!isConsentApproved || isLoading"
          @click="handleApprove"
          class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          {{ isLoading ? "Submitting..." : "Approve" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: "broker-consent",
  title: "Broker Consent",
  description: "Login to your account to approve consent",
  middleware: ["broker-consent-middleware"],
  pageTransition: {
    name: "rotate",
  },
});

const {
  public: { consentReturnUrl },
} = useRuntimeConfig();

const router = useRouter();
const toast = useToast();
const { isLoading, hideLoader, showLoader } = useLoader();
const { resolve: resolveOriginSite, clear: clearOriginSite } = useOriginSite();
const isConsentApproved = ref(false);

/**
 * Build the callback URL we hand control back to.
 *
 * Two different spellings are emitted on purpose, because two different
 * consumers read this callback and they disagree:
 *
 *   consentApproved=true|false — what the real portal reads. See ctm_fe's
 *     useSfBrokerConsentCallback: it is mounted on the dashboard, accepts only
 *     the literal "true"/"false", and on "true" navigates to the onboarding
 *     setup step with `awaitConsentCheck`, which is what starts the
 *     consent-check polling. On "false" it flags manual setup and goes straight
 *     to the KYC form.
 *   consentApprove=yes|no — what this service's own dev-test dashboard
 *     validates.
 *
 * Both are harmless to the other: each consumer reads its own key and ignores
 * unknown params, so emitting both keeps one redirect working against the real
 * portal and the local verifier alike.
 */
const buildCallbackUrl = (approved) => {
  const { userId, accountId, brokerId, strategyId, returnUrl } =
    router.currentRoute.value.query;

  // Where to hand control back to, in order of preference:
  //   1. an explicit ?returnUrl= — CTM does not send one, but it makes manual
  //      testing and any future caller that can supply it straightforward;
  //   2. CONSENT_RETURN_URL — the configured address of the pending onboarding.
  //      This is the intended mechanism: the redirect journey does not poll
  //      consent-check (FR-015), so the broker must actively return the follower
  //      to the portal for onboarding to resume. The backend resolves Docusign
  //      returns the same way, from config rather than from request context;
  //   3. the origin site captured at the login page, as a best-effort guess when
  //      nothing is configured;
  //   4. the local dev-test dashboard, so the flow stays walkable standalone.
  let target = null;
  if (typeof returnUrl === "string" && returnUrl) {
    target = returnUrl;
  } else if (consentReturnUrl) {
    target = consentReturnUrl;
  } else {
    target = resolveOriginSite();
  }

  // Merge via the URL API rather than string concatenation: the target may
  // already carry its own query string, and appending `?a=b` to it produced a
  // mangled URL that resolved to the wrong route entirely.
  // Fall back to the dev-test dashboard on the origin actually serving this
  // page, not on BASE_URL — the two differ whenever the app runs on another
  // host or port, and the env value would send the user somewhere dead.
  const url = new URL(
    target ?? `${window.location.origin}/accept-consent-dev-test/dashboard`,
  );
  for (const [key, value] of Object.entries({
    brokerId,
    userId,
    accountId,
    strategyId,
    consentApproved: approved ? "true" : "false", // the real portal
    consentApprove: approved ? "yes" : "no", // this service's dev-test dashboard
  })) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};
// This page is the Standard journey (ConsentType = 1): CTM redirects the whole
// page here with userId/accountId/brokerId/strategyId, and the handover body is
// never inspected by the read path — so the PersonalDetails payload is correct.
// The Legacy (ConsentType = 0) journey is a popup and lives in my-syntellicore.vue.
// Handle consent approval
const handleApprove = async () => {
  const { userId, accountId, brokerId, strategyId } =
    router.currentRoute.value.query;
  if (!userId || !accountId || !strategyId || !brokerId) {
    return;
  }
  try {
    showLoader();
    // Same-origin, relative on purpose. This service hosts its own mock of the
    // consent-accept endpoint, and an absolute apiUrl breaks as soon as the app
    // is served from anywhere other than that exact host: browsing on :3010
    // while CTM_API_URL says localhost:3000 makes this a cross-origin POST,
    // which Nitro answers without CORS headers, so the fetch throws and the
    // approval silently does nothing.
    const data = await fetch(
      `/api/user/consent/accept.json?userId=${userId}&brokerId=${brokerId}`,
      {
        method: "POST",
        body: JSON.stringify(SAMPLE_CONSENT_PAYLOAD),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (data.status === 200) {
      toast.add({
        id: "consent_success",
        title: "Success",
        description: `Your consent has been saved successfully.`,
        color: "green",
      });
      // Redirect user to the next step
      // Resolve the target before clearing, then drop the captured origin so a
      // later unrelated flow in this tab cannot inherit it.
      const callbackUrl = buildCallbackUrl(true);
      clearOriginSite();
      window.location.href = callbackUrl;
    } else {
      toast.add({
        id: "consent_error",
        title: "Error",
        description: `An error occurred while saving your consent. Please try again`,
        color: "red",
      });
    }
  } catch (error) {
    toast.add({
      id: "consent_error",
      title: "Error",
      description: `An error occurred while saving your consent. Please try again`,
      color: "red",
    });
  } finally {
    hideLoader();
  }
};

const handleDecline = async () => {
  // Record the decline so a consent session exists at Status=0. Without a row,
  // consent-check throws NotFound rather than reporting "not granted".
  const { userId, brokerId } = router.currentRoute.value.query;
  try {
    await $fetch("/api/user-consent/decline", {
      method: "POST",
      body: { userId, brokerId },
    });
  } catch {
    // Best-effort — the redirect below still has to happen.
  }

  const callbackUrl = buildCallbackUrl(false);
  clearOriginSite();
  window.location.href = callbackUrl;
};
</script>

<style scoped>
/* Optional: Add custom styles if needed */
</style>
