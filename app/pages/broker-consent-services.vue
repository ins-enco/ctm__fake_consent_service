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
const email = ref("");
const password = ref("");

onMounted(() => {
  // Check if there is a referrer
  if (document.referrer) {
    console.log("The referring page is: " + document.referrer);
  } else {
    console.log("No referrer information is available.");
  }
});

const handleSubmit = () => {
  const { userId, accountId, brokerId, strategyId } =
    router.currentRoute.value.query;
  if (!userId || !accountId || !strategyId || !brokerId) {
    return;
  }
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
          class="w-full rounded-lg bg-blue-500 py-2 font-semibold text-white transition hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </UCard>
  </div>
</template>

<style scoped>
/* Custom styles can be added here if needed */
</style>
