// ESLint preset for the shared packages under packages/. They export TypeScript source that
// apps compile for both Node and the browser (D3), so console output has to be deliberate.
import { defineConfig } from "eslint/config";
import base from "./base.mjs";

export default defineConfig([
  ...base,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
]);
