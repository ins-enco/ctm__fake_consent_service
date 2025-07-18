// https://nuxt.com/docs/api/configuration/nuxt-config
import path from "path";
export default defineNuxtConfig({
  compatibilityDate: "2024-10-31",
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
  },
  css: ["@/assets/css/app.css"],
  imports: {
    dirs: ["app/types", "app/store/*.ts"],
  },
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
    {
      path: "~/components/icons",
      pathPrefix: true,
      prefix: "Icon",
    },
  ],
  runtimeConfig: {
    //define variables available only on the server side
    DATABASE_URL: process.env.DATABASE_URL,
    public: {
      APPNAME: process.env.APPNAME || "Pammbo2",
      baseURL: process.env.BASE_URL || "http://localhost:3000", // Default for development
      apiUrl: process.env.CTM_API_URL || "http://localhost:8080/api",
    },
  },

  nitro: {
    storage: {
      pammbooConfig: {
        driver: "fs",
        base: path.resolve(__dirname, "configs"), // Use absolute path
      },
    },
  },

  modules: ["@nuxt/ui", "@pinia/nuxt", "nuxt-lodash"],
  colorMode: {
    preference: "dark",
  },

  pinia: {
    storesDirs: ["./app/stores/**"],
  },
  lodash: {
    prefix: "_",
    prefixSkip: ["string"],
    upperAfterPrefix: false,
    exclude: ["map"],
    alias: [
      ["camelCase", "stringToCamelCase"], // => stringToCamelCase
      ["kebabCase", "stringToKebab"], // => stringToKebab
      ["isDate", "isLodashDate"], // => _isLodashDate
    ],
  },
  sourcemap: {
    server: true,
    client: true,
  },
});