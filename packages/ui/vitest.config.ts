import { defineConfig } from "vitest/config";

// Component tests (T21, SPEC §14): Testing Library in happy-dom. `cleanup` runs after each test
// because Vitest's globals are off, so Testing Library cannot register it itself.
export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-support/setup.ts"],
  },
});
