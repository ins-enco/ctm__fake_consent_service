<script lang="ts" setup>
definePageMeta({
  layout: "broker-consent",
  title: "Verify Accept consent dev test",
  description: "Verify to your callback URL",
  pageTransition: {
    name: "rotate",
  },
});

const router = useRouter();
const query = router.currentRoute.value.query;
const messages = ref<string[]>([]);

onMounted(() => {
  {
    const { userId, accountId, brokerId, strategyId, consentApprove } = query;
    // Helper function to check if a value is a number
    const isNumber = (value: any) =>
      !isNaN(parseFloat(value)) && isFinite(value);
    // Create a mapping for fields to be validated and their error messages
    const fieldsToValidate = [
      { field: userId, name: "userId", type: "number" },
      { field: accountId, name: "accountId", type: "number" },
      { field: brokerId, name: "brokerId", type: "number" },
      { field: strategyId, name: "strategyId", type: "number" },
      { field: consentApprove, name: "consentApprove", type: "boolean" },
    ];

    // Check each field and push messages if necessary
    fieldsToValidate.forEach(({ field, name, type }) => {
      if (!field) {
        messages.value.push(`${name} is missing`);
      } else {
        if (type === "number" && !isNumber(field)) {
          messages.value.push(`${name} is not a number`);
        }
        if (type === "boolean" && field !== "yes" && field !== "no") {
          messages.value.push(`${name} is not 'yes' or 'no'`);
        }
      }
    });
  }
});
</script>
<template>
  <ClientOnly>
    <div class="flex h-full items-start justify-center pt-52">
      <UCard
        :class="{
          'w-[400px] px-4': true,
          '!bg-green-300 text-green-800': !messages.length,
          '!bg-red-300 text-red-800': messages.length,
        }"
      >
        <div v-if="messages.length">
          <h2 class="mb-6 text-center text-2xl font-bold">
            Verify callback URL failed.
          </h2>
          <p
            v-for="(message, index) in messages"
            :key="index"
            class="font-medium"
          >
            - {{ message }}
          </p>
        </div>
        <h2 v-else class="mb-6 text-center text-2xl font-bold">
          Verify callback URL successfully. The callback URL has been validated
        </h2>
      </UCard>
    </div>
  </ClientOnly>
</template>
