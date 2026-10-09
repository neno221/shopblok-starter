import { configDefaults, defineConfig } from "vitest/config";

// `e2e/*.spec.ts` are Playwright's: Vitest's default include would pick them up and fail.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "e2e/**"] },
});
