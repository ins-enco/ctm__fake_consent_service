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
    // Server-only — never exposed to the client bundle. Deliberately kept
    // out of `public` since this is DB write credentials.
    // Testing shortcut: grant consent when the broker login succeeds, rather
    // than on approval as the real flow does. Off unless set to "true".
    consentAutopatchOnLogin: process.env.CONSENT_AUTOPATCH_ON_LOGIN || "false",
    dbPatchTool: {
      host: process.env.CTM_DB_HOST || "",
      port: process.env.CTM_DB_PORT || "3306",
      database: process.env.CTM_DB_NAME || "",
      user: process.env.CTM_DB_USER || "",
      password: process.env.CTM_DB_PASS || "",
      key: process.env.DB_PATCH_TOOL_KEY || "",
    },
    public: {
      APPNAME: process.env.APPNAME || "CTM Fake Consent Service",
      baseURL: process.env.BASE_URL || "http://localhost:3000", // Default for development
      apiUrl: process.env.CTM_API_URL || "http://localhost:8080/api",
      // Where the Standard (ConsentType=1) journey hands the follower back to,
      // so the pending onboarding resumes. Mirrors the backend's
      // Docusign:DefaultReturnUrl — a configured address, not a guess from the
      // referrer. Empty falls back to the local dev-test dashboard.
      consentReturnUrl: process.env.CONSENT_RETURN_URL || "",
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