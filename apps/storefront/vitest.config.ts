import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// `e2e/*.spec.ts` are Playwright's: Vitest's default include would pick them up and fail.
// `server-only` throws outside Next's server bundle; the data layer imports it. The Medusa SDK is
// loaded by Node as it is: Vite would transform its ESM build, whose source maps point to files the
// package does not ship (hundreds of warnings).
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./src/test-support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    server: { deps: { external: [/@medusajs\/js-sdk/] } },
  },
});
