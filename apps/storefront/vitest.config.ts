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
//
// next-intl (D62) picks its build by the `react-server` export condition, which Vitest does not set,
// so `next-intl/server` would resolve to stubs that throw. The aliases do what Next does: the server
// build of `next-intl/server`, and the plugin's own alias of `next-intl/config` to the request
// configuration (`createNextIntlPlugin` in next.config.ts). A test that renders a Server Component
// then runs the real `getTranslations` through the real `src/i18n/request.ts`. next-intl and
// use-intl are `inline` so that the alias also applies to the imports inside the package.
//
// W5: under `pnpm test`'s parallel run on Windows, the first test of a file, which pays for the
// file's imports, took over Vitest's 5 s (two to four tests a run, never the same ones; each package
// passes alone), so a test has 20 s here.
const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "server-only": fromHere("./src/test-support/server-only.ts"),
      "next-intl/server": fromHere(
        "./node_modules/next-intl/dist/esm/development/server.react-server.js",
      ),
      "next-intl/config": fromHere("./src/i18n/request.ts"),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**/*.spec.ts"],
    testTimeout: 20_000,
    server: {
      deps: {
        external: [/@medusajs\/js-sdk/],
        inline: ["country-flag-icons", "next-intl", "use-intl"],
      },
    },
  },
});
