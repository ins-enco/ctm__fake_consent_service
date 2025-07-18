<script setup lang="ts">
const error = useError();
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <div class="space-y-8 max-w-xl break-words">
      <div>
        <h5 class="text-center text-2xl text-primary">
          {{ error?.statusCode }}
        </h5>
        <h1 class="text-4xl font-bold text-white">
          {{ error?.statusMessage }}
        </h1>
      </div>
      <p class="text-white">The page you are looking for does not exist.</p>
      <div class="text-center">
        <UButton to="/" color="primary">Go back home</UButton>
      </div>
    </div>
  </div>
</template>
