import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// `e2e/**/*.spec.ts` are Playwright's: Vitest's default include would pick them up and fail. The
// helpers under `e2e/support` have unit tests of their own (`*.test.ts`, T42), which Playwright's
// config does not match (`testMatch` there is `*.spec.ts`).
// `server-only` throws outside Next's server bundle; the data layer imports it. The Medusa SDK is
// loaded by Node as it is: Vite would transform its ESM build, whose source maps point to files the
// package does not ship (hundreds of warnings). country-flag-icons imports `react` without
// declaring it, so Node would resolve it from pnpm's shared store, which may hold another major:
// Vite processes the package instead (`inline`) and resolves its `react` from here (`dedupe`).
export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "server-only": fileURLToPath(new URL("./src/test-support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**/*.spec.ts"],
    server: { deps: { external: [/@medusajs\/js-sdk/], inline: ["country-flag-icons"] } },
  },
});
