import next from "@shopblok/config/eslint/next";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...next,
  // Files Payload writes (`payload generate:types`, `generate:importmap`, `migrate:create`): they
  // are committed but not ours to edit, and the CLI regenerates them.
  globalIgnores([
    "src/payload-types.ts",
    "src/app/(payload)/admin/importMap.js",
    "src/migrations/**",
  ]),
]);
