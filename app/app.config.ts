export default defineAppConfig({
  ui: {
    strategy: "override",
    primary: "blue",
    card: {
      background: "bg-white dark:bg-[#151419]",
    },
    notifications: {
      position: "top-0 right-0",
    },
    button: {
      color: {
        gray: {
          solid:
            "shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 dark:bg-[#1f1e25] dark:hover:bg-gray-700/50 dark:disabled:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400",
        },
      },
    },
    input: {
      color: {
        gray: {
          outline:
            "dark:bg-[#1f1e25] text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400",
        },
      },
    },
    textarea: {
      color: {
        gray: {
          outline:
            "shadow-sm bg-gray-50 dark:bg-[#1f1e25] text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400",
        },
      },
    },
  },
});
