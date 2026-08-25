<script setup>
/**
 * Legacy consent journey (ConsentType = 0) — the GBE / Syntellicore entry point.
 *
 * CTM opens this in a popup window at `<Broker.ApiUrl>/my-syntellicore?is_ms=1&uid=...`,
 * where uid is the composite `<userId>a<brokerId>`. Unlike the Standard journey
 * this receives no accountId/strategyId: the broker is expected to know which
 * trading accounts the customer holds, and reports them back in datasource3.
 *
 * On approval the handover goes to /api/user-consent (the endpoint GBE calls),
 * not to /api/user/consent/accept.json (which the Standard brokers call).
 */
definePageMeta({
  layout: "broker-consent",
  title: "Syntellicore Consent",
  description: "GBE broker consent (Legacy journey)",
});

const route = useRoute();
const toast = useToast();
const { isLoading, showLoader, hideLoader } = useLoader();

const isConsentApproved = ref(false);
const submitted = ref(false);
const result = ref(null);

// uid is the only identity this journey gets, so a malformed one is fatal —
// better to say so than to post a handover under a half-parsed identity.
const identity = computed(() => parseConsentUid(route.query.uid));

// The Legacy popup is given only `uid` — no account — so the accounts to confirm
// are resolved server-side from the broker's own records, which is what a real
// broker does (the live GBE handover listed every account the customer held).
// An explicit ?accountNumbers= still wins, for driving specific cases in tests.
const resolved = ref([]);
const resolveError = ref("");

const accountNumbers = computed(() => {
  const explicit = parseAccountNumbers(
    route.query.accountNumbers,
    route.query.accountId,
  );
  return explicit.length > 0 ? explicit : resolved.value;
});

onMounted(async () => {
  if (!identity.value) return;
  if (parseAccountNumbers(route.query.accountNumbers, route.query.accountId).length > 0) {
    return; // caller pinned the accounts explicitly
  }
  try {
    const data = await $fetch("/api/user-consent/accounts", {
      params: { uid: route.query.uid },
    });
    resolved.value = data?.handoverNumbers ?? [];
    if (!data?.configured) resolveError.value = data?.reason ?? "";
  } catch (e) {
    resolveError.value = e?.data?.message || "Could not resolve trading accounts.";
  }
});

const isMultiSelect = computed(() => route.query.is_ms === "1");

const handleApprove = async () => {
  if (!identity.value || accountNumbers.value.length === 0) return;

  const handover = buildBrokerHandover({
    userId: identity.value.userId,
    brokerId: identity.value.brokerId,
    accountNumbers: accountNumbers.value,
    platform:
      route.query.platform === "MetaTrader 5" ? "MetaTrader 5" : "MetaTrader 4",
  });

  try {
    showLoader();
    // Relative for the same reason as the Standard journey: an absolute apiUrl
    // makes this a cross-origin POST whenever the app is not served from that
    // exact host, and it fails with no CORS headers.
    result.value = await $fetch(
      `/api/user-consent?uid=${encodeURIComponent(route.query.uid)}`,
      { method: "POST", body: handover },
    );
    submitted.value = true;

    // Closing the popup is the completion signal. The portal watches for it
    // (useSfOnboardingConnectionPopup polls `popup.closed` every 500ms) and only
    // then starts polling /consent-check — per the contract, "after the popup
    // closes, poll". Its other completion path is a BroadcastChannel message,
    // which is same-origin only and therefore unreachable from this service, so
    // closing is the one signal that actually works cross-origin.
    window.close();
  } catch (e) {
    toast.add({
      id: "consent_error",
      title: "Error",
      description: e?.data?.message || "Failed to register consent.",
      color: "red",
    });
  } finally {
    hideLoader();
  }
};

const handleDecline = async () => {
  // Record the decline before closing. Leaving no row at all makes consent-check
  // throw NotFound, which the portal treats as unrecoverable and answers by
  // sending the follower back to the dashboard; a row at Status=0 answers
  // {completed:false} instead. Closing is still the only signal this window can
  // give the opener, since a cross-origin popup cannot message it.
  try {
    await $fetch("/api/user-consent/decline", {
      method: "POST",
      params: { uid: route.query.uid },
    });
  } catch {
    // Best-effort — closing regardless is better than trapping the user here.
  }
  window.close();
};
</script>

<template>
  <div class="flex h-full items-center justify-center p-4">
    <div class="w-full max-w-2xl rounded-lg p-8 shadow-xl dark:bg-[#151419]">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl font-bold">Syntellicore — Data Sharing Consent</h2>
        <span class="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
          Legacy · ConsentType 0
        </span>
      </div>

      <!-- Malformed / missing uid -->
      <div v-if="!identity" class="rounded-lg bg-red-300 p-4 text-red-800">
        <p class="font-semibold">Invalid or missing uid.</p>
        <p class="mt-1 text-sm">
          This journey is identified by the composite
          <code>uid=&lt;userId&gt;a&lt;brokerId&gt;</code> — for example
          <code>uid=12345a67</code>. Received:
          <code>{{ route.query.uid ?? "(nothing)" }}</code>
        </p>
      </div>

      <template v-else-if="!submitted">
        <div class="mb-6 grid grid-cols-3 gap-3 text-sm">
          <div class="rounded bg-black/20 p-3">
            <div class="text-gray-400">User ID</div>
            <div class="font-semibold">{{ identity.userId }}</div>
          </div>
          <div class="rounded bg-black/20 p-3">
            <div class="text-gray-400">Broker ID</div>
            <div class="font-semibold">{{ identity.brokerId }}</div>
          </div>
          <div class="rounded bg-black/20 p-3">
            <div class="text-gray-400">Multi-select</div>
            <div class="font-semibold">{{ isMultiSelect ? "yes" : "no" }}</div>
          </div>
        </div>

        <p class="mb-4">
          GBE Brokers will share your identification, questionnaire and trading
          account data with CTM so your asset management mandate can be set up.
        </p>

        <!-- The accounts that will land in datasource3 -->
        <div class="mb-6 rounded-lg bg-black/20 p-4">
          <h3 class="mb-2 font-semibold">Trading accounts to confirm</h3>
          <p v-if="resolveError" class="mb-2 text-sm text-red-400">
            {{ resolveError }}
          </p>
          <p v-if="accountNumbers.length === 0" class="text-sm text-yellow-500">
            No trading account supplied. Pass
            <code>?accountNumbers=&lt;MT login&gt;</code> (comma-separated for
            several). Consent cannot be granted without at least one — an empty
            handover would register as confirming no account.
          </p>
          <ul v-else class="text-sm">
            <li v-for="n in accountNumbers" :key="n" class="font-mono">
              · {{ n }}
            </li>
          </ul>
        </div>

        <div class="mb-6 flex items-center">
          <input
            id="approve-consent"
            v-model="isConsentApproved"
            type="checkbox"
            class="mr-2 h-4 w-4 rounded border-gray-300"
          />
          <label for="approve-consent" class="text-sm">
            I approve sharing my information with CTM.
          </label>
        </div>

        <div class="flex justify-between">
          <button
            class="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            @click="handleDecline"
          >
            Decline
          </button>
          <button
            :disabled="!isConsentApproved || isLoading || accountNumbers.length === 0"
            class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
            @click="handleApprove"
          >
            {{ isLoading ? "Submitting..." : "Approve" }}
          </button>
        </div>
      </template>

      <div v-else class="rounded-lg bg-green-300 p-4 text-green-900">
        <p class="font-semibold">Data exchange completed.</p>
        <p class="mt-1 text-sm">
          {{ accountNumbers.length }} account(s) registered against user
          {{ identity.userId }} / broker {{ identity.brokerId }}. You can close
          this window and continue with the KYC form.
        </p>
        <pre class="mt-3 overflow-x-auto rounded bg-black/20 p-2 text-xs">{{ result }}</pre>
      </div>
    </div>
  </div>
</template>
