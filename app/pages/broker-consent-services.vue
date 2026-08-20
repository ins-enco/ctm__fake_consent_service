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
const router = useRouter();
const toast = useToast();
const email = ref("");
const password = ref("");

const { capture } = useOriginSite();
const originSite = ref(null);

// This page is the entry point of the Standard journey, so it is the only place
// the referrer still identifies CTM rather than this service. Capture it now and
// persist it for the approval step to redirect back to.
onMounted(() => {
  originSite.value = capture();
});

const patchNotice = ref("");
const isSubmitting = ref(false);
const countdown = ref(0);

/** Pause between a successful login and the consent write. */
const PATCH_DELAY_MS = 3000;

const handleSubmit = async () => {
  const { userId, accountId, brokerId, strategyId, accountNumbers } =
    router.currentRoute.value.query;
  if (!userId || !accountId || !strategyId || !brokerId) {
    return;
  }
  // Guard against a double submit during the delay, which would fire the patch
  // twice and, on a Legacy broker, race two writes against the same row.
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  // Hold for PATCH_DELAY_MS before writing, surfaced as a countdown so the
  // pause reads as progress rather than an unresponsive form.
  countdown.value = Math.ceil(PATCH_DELAY_MS / 1000);
  const ticker = setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1);
  }, 1000);
  try {
    await new Promise((resolve) => setTimeout(resolve, PATCH_DELAY_MS));
  } finally {
    clearInterval(ticker);
    countdown.value = 0;
  }

  // Testing shortcut: grant consent in the database as soon as login succeeds,
  // rather than waiting for the approval step. Inert unless
  // CONSENT_AUTOPATCH_ON_LOGIN=true, and a failure here must not block the
  // flow — the approval step still works on its own.
  try {
    const result = await $fetch("/api/user/consent/login-grant", {
      method: "POST",
      body: {
        userId,
        brokerId,
        accountNumbers: parseAccountNumbers(accountNumbers, accountId),
      },
    });
    if (result?.applied) {
      toast.add({
        id: "consent_patched",
        title: "Consent granted in database",
        description: `${result.journey} journey · Status ${result.status}${
          result.ds3Accounts ? ` · ${result.ds3Accounts} account(s) in datasource3` : ""
        }`,
        color: "green",
      });
    } else if (result?.reason) {
      patchNotice.value = result.reason;
    }
  } catch (e) {
    toast.add({
      id: "consent_patch_error",
      title: "Consent patch failed",
      description: e?.data?.message || "Could not update the database.",
      color: "red",
    });
  }

  isSubmitting.value = false;
  router.push(
    `/approve-consent-process?brokerId=${brokerId}&userId=${userId}&accountId=${accountId}&strategyId=${strategyId}`,
  );
};
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <UCard class="w-[400px]">
      <h2 class="mb-6 text-center text-2xl font-bold text-gray-100">
        Broker Consent
      </h2>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <UFormGroup label="Username" class="w-full" name="Email">
          <UInput color="gray" v-model="email" required />
        </UFormGroup>

        <UFormGroup label="Password" class="w-full" :name="'Password'">
          <UInput color="gray" type="password" v-model="password" required />
        </UFormGroup>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-blue-500 py-2 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          <template v-if="countdown > 0">
            Granting consent in {{ countdown }}s...
          </template>
          <template v-else-if="isSubmitting">Granting consent...</template>
          <template v-else>Login</template>
        </button>
      </form>
      <p v-if="patchNotice" class="mt-4 text-xs text-yellow-500">
        {{ patchNotice }}
      </p>
    </UCard>
  </div>
</template>

<style scoped>
/* Custom styles can be added here if needed */
</style>
