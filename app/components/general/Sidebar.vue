<script setup>
import { ref } from "vue";

const isCollapsed = ref(false);

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>
<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <aside
      :class="[
        'flex h-screen flex-col overflow-y-auto px-5 py-8 transition-all duration-500 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64',
      ]"
    >
      <!-- Logo and Toggle Button -->
      <div class="flex items-center justify-between">
        <a href="/">
          <h2 :class="['text-3xl font-bold', isCollapsed ? 'hidden' : 'block']">
            Pammboo2
          </h2>
        </a>
        <button @click="toggleSidebar" class="mx-auto">
          <svg
            v-if="isCollapsed"
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="block h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <div class="mt-6 flex flex-1 flex-col justify-between">
        <nav :class="isCollapsed ? 'space-y-3' : '-mx-3 space-y-6'">
          <div class="space-y-3">
            <label
              v-if="!isCollapsed"
              class="px-3 text-xs uppercase text-gray-500 dark:text-gray-400"
              >Pamm</label
            >
            <NuxtLink class="navlink" to="/" exactActiveClass="navlink-active">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="block h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                />
              </svg>

              <span
                class="mx-2 text-sm font-medium"
                :class="isCollapsed ? 'hidden' : 'block'"
                >Dashboard</span
              >
            </NuxtLink>

            <NuxtLink
              class="navlink"
              to="/pamm"
              exactActiveClass="navlink-active"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="block h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                />
              </svg>

              <span
                class="mx-2 text-sm font-medium"
                :class="isCollapsed ? 'hidden' : 'block'"
                >Pamm</span
              >
            </NuxtLink>
          </div>

          <div class="space-y-3">
            <label
              v-if="!isCollapsed"
              class="px-3 text-xs uppercase text-gray-500 dark:text-gray-400"
              >CTM</label
            >
            <div
              :class="`mx-auto w-8 border-t border-gray-700 transition-opacity ease-in ${
                isCollapsed ? 'opacity-100 duration-1000' : 'opacity-0'
              }`"
            ></div>

            <a class="navlink" href="#">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="block h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>

              <span
                class="mx-2 text-sm font-medium"
                :class="isCollapsed ? 'hidden' : 'block'"
                >Guides</span
              >
            </a>

            <a class="navlink" href="#">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="block h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
                />
              </svg>

              <span
                class="mx-2 text-sm font-medium"
                :class="isCollapsed ? 'hidden' : 'block'"
                >Hotspots</span
              >
            </a>

            <a class="navlink" href="#">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="block h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>

              <span
                class="mx-2 text-sm font-medium"
                :class="isCollapsed ? 'hidden' : 'block'"
                >Checklists</span
              >
            </a>
          </div>
        </nav>
      </div>

      <div class="mt-6 flex">
        <ModeTheme />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.navlink {
  @apply flex transform items-center rounded-lg px-3 py-2 text-gray-600 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-200 dark:hover:bg-dark-secondary dark:hover:text-gray-200;
}
.navlink-active {
  @apply bg-[#f3f3f3] dark:bg-dark-secondary;
}
</style>
