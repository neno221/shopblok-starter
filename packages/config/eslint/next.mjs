// ESLint preset for the Next.js storefront: eslint-config-next (core-web-vitals and typescript),
// as in the Next ESLint docs, with the base preset on top.
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import base from "./base.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Last, because eslint-config-next/typescript sets some typescript-eslint rules to warnings
  // (no-unused-vars, no-unused-expressions). The base keeps them errors, so the presets agree.
  ...base,
]);
