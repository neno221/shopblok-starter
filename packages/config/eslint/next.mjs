// ESLint preset for the Next.js storefront: base plus eslint-config-next (core-web-vitals and
// typescript), as in the Next ESLint docs.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import base from "./base.mjs";

export default defineConfig([
  ...base,
  ...nextVitals,
  ...nextTs,
  // eslint-config-next's own default ignores. Listing them again keeps them in force.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
