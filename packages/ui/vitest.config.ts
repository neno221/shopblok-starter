import { defineConfig } from "vitest/config";

// Component tests (T21, SPEC §14): Testing Library in happy-dom. `cleanup` runs after each test
// because Vitest's globals are off, so Testing Library cannot register it itself.
export default defineConfig({
  // country-flag-icons imports `react` without declaring it, so Node would resolve it from pnpm's
  // shared store, which may hold another major. Vite processes the package instead (`inline`) and
  // resolves its `react` from here (`dedupe`), where it is React 19.3.0.
  resolve: { dedupe: ["react", "react-dom"] },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-support/setup.ts"],
    server: { deps: { inline: ["country-flag-icons"] } },
  },
});
