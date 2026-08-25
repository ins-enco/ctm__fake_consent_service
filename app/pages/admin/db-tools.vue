<script setup>
definePageMeta({
  layout: "broker-consent",
  title: "DB Patch Tool",
  description: "Grant broker consent or seed trading accounts directly in the CTM database",
});

const toast = useToast();
const { isLoading, showLoader, hideLoader } = useLoader();

const dbKey = ref("");
const status = ref(null);
const statusError = ref("");

const grantForm = reactive({ userId: "", brokerId: "", accountNumber: "" });
const grantResult = ref(null);
const grantConfirming = ref(false);

const seedForm = reactive({ userId: "", brokerId: "", count: 10, startLogin: "", prefix: "SEED-" });
const seedResult = ref(null);
const seedConfirming = ref(false);

onMounted(async () => {
  try {
    status.value = await $fetch("/api/admin/db-tools/status");
  } catch (e) {
    statusError.value = e?.data?.message || "Failed to load status";
  }
});

const callTool = async (path, payload) => {
  return await $fetch(path, {
    method: "POST",
    headers: { "x-db-patch-key": dbKey.value },
    body: payload,
  });
};

const submitGrant = async () => {
  grantConfirming.value = false;
  if (!grantForm.userId || !grantForm.brokerId || !grantForm.accountNumber) return;
  try {
    showLoader();
    grantResult.value = await callTool("/api/admin/db-tools/grant-consent", {
      userId: grantForm.userId,
      brokerId: grantForm.brokerId,
      accountNumber: grantForm.accountNumber,
    });
    toast.add({ title: "Consent granted", description: grantResult.value.action, color: "green" });
  } catch (e) {
    toast.add({
      title: "Grant failed",
      description: e?.data?.message || "Unknown error",
      color: "red",
    });
  } finally {
    hideLoader();
  }
};

const submitSeed = async () => {
  seedConfirming.value = false;
  if (!seedForm.userId || !seedForm.brokerId || !seedForm.count || !seedForm.startLogin) return;
  try {
    showLoader();
    seedResult.value = await callTool("/api/admin/db-tools/seed-accounts", {
      userId: seedForm.userId,
      brokerId: seedForm.brokerId,
      count: seedForm.count,
      startLogin: seedForm.startLogin,
      prefix: seedForm.prefix,
    });
    toast.add({
      title: "Accounts seeded",
      description: `${seedResult.value.seededAccounts} accounts created, ${seedResult.value.passingAccounts} pass CheckConsentAsync`,
      color: "green",
    });
  } catch (e) {
    toast.add({
      title: "Seed failed",
      description: e?.data?.message || "Unknown error",
      color: "red",
    });
  } finally {
    hideLoader();
  }
};
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <h2 class="mb-2 text-3xl font-bold">DB Patch Tool</h2>
    <p class="mb-6 text-sm text-gray-400">
      Writes directly to the CTM database (<code>{{ status?.database || "…" }}</code> on
      <code>{{ status?.host || "…" }}</code>). Every write is additive — existing broker
      handover data (<code>UserRawData</code>) is preserved and appended to, never overwritten.
    </p>

    <div v-if="statusError" class="mb-6 rounded-lg bg-red-300 p-4 text-red-800">
      {{ statusError }}
    </div>

    <div v-else-if="status && !status.configured" class="mb-6 rounded-lg bg-yellow-300 p-4 text-yellow-900">
      <p class="font-semibold">Tool is disabled.</p>
      <p class="mt-1 text-sm">
        Set <code>CTM_DB_HOST</code>, <code>CTM_DB_NAME</code>, <code>CTM_DB_USER</code>,
        <code>CTM_DB_PASS</code> and <code>DB_PATCH_TOOL_KEY</code> in <code>.env</code>,
        then restart the dev server.
      </p>
    </div>

    <template v-else-if="status?.configured">
      <UFormGroup label="DB patch key" class="mb-8 w-full">
        <UInput v-model="dbKey" type="password" color="gray" placeholder="value of DB_PATCH_TOOL_KEY" />
      </UFormGroup>

      <!-- Grant consent -->
      <div class="mb-10 rounded-lg border border-gray-700 p-5">
        <h3 class="mb-1 text-xl font-semibold">Grant broker consent</h3>
        <p class="mb-4 text-sm text-gray-400">
          Flips an existing <code>UserBrokerConsents</code> row to granted for one account.
          Fails with 404-equivalent messaging if no row exists for this user+broker yet
          (create one via Seed accounts below, or run it once through the normal consent flow).
        </p>
        <form @submit.prevent="grantConfirming = true" class="grid grid-cols-3 gap-3">
          <UFormGroup label="User ID"><UInput v-model="grantForm.userId" color="gray" required /></UFormGroup>
          <UFormGroup label="Broker ID"><UInput v-model="grantForm.brokerId" color="gray" required /></UFormGroup>
          <UFormGroup label="Account number">
            <UInput v-model="grantForm.accountNumber" color="gray" required />
          </UFormGroup>
          <button
            type="submit"
            :disabled="isLoading || !dbKey"
            class="col-span-3 rounded-lg bg-blue-500 py-2 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            Grant consent
          </button>
        </form>

        <div v-if="grantConfirming" class="mt-4 rounded-lg bg-yellow-300 p-4 text-yellow-900">
          <p>
            This writes to the live database for user <b>{{ grantForm.userId }}</b>, broker
            <b>{{ grantForm.brokerId }}</b>. Confirm?
          </p>
          <div class="mt-3 flex gap-3">
            <button
              @click="submitGrant"
              class="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Yes, patch the DB
            </button>
            <button
              @click="grantConfirming = false"
              class="rounded-lg bg-gray-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>

        <pre v-if="grantResult" class="mt-4 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs">{{ grantResult }}</pre>
      </div>

      <!-- Seed accounts -->
      <div class="rounded-lg border border-gray-700 p-5">
        <h3 class="mb-1 text-xl font-semibold">Seed trading accounts</h3>
        <p class="mb-4 text-sm text-gray-400">
          Creates N tagged <code>Accounts</code> rows, links them to the user via
          <code>UserTradeAccounts</code> (enabled), and grants consent for all of them.
          Max 500 per run; fails without writing anything if any login in the range already exists.
        </p>
        <form @submit.prevent="seedConfirming = true" class="grid grid-cols-2 gap-3">
          <UFormGroup label="User ID"><UInput v-model="seedForm.userId" color="gray" required /></UFormGroup>
          <UFormGroup label="Broker ID"><UInput v-model="seedForm.brokerId" color="gray" required /></UFormGroup>
          <UFormGroup label="Count"><UInput v-model="seedForm.count" type="number" color="gray" required /></UFormGroup>
          <UFormGroup label="Start login">
            <UInput v-model="seedForm.startLogin" color="gray" placeholder="e.g. 900000001" required />
          </UFormGroup>
          <UFormGroup label="Name prefix" class="col-span-2">
            <UInput v-model="seedForm.prefix" color="gray" />
          </UFormGroup>
          <button
            type="submit"
            :disabled="isLoading || !dbKey"
            class="col-span-2 rounded-lg bg-blue-500 py-2 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            Seed accounts
          </button>
        </form>

        <div v-if="seedConfirming" class="mt-4 rounded-lg bg-yellow-300 p-4 text-yellow-900">
          <p>
            This creates <b>{{ seedForm.count }}</b> accounts (logins {{ seedForm.startLogin }}..{{
              Number(seedForm.startLogin) + Number(seedForm.count) - 1
            }}) for user <b>{{ seedForm.userId }}</b> on broker <b>{{ seedForm.brokerId }}</b>. Confirm?
          </p>
          <div class="mt-3 flex gap-3">
            <button
              @click="submitSeed"
              class="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Yes, patch the DB
            </button>
            <button
              @click="seedConfirming = false"
              class="rounded-lg bg-gray-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>

        <pre v-if="seedResult" class="mt-4 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs">{{ seedResult }}</pre>
      </div>
    </template>
  </div>
</template>
