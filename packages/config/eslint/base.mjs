// Base ESLint preset (flat config): ESLint's recommended rules plus typescript-eslint's.
// The next and library presets build on it; a plain package can use it directly.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/.medusa/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/coverage/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/blob-report/**",
    "**/playwright/.cache/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // Plain JavaScript here is config and tooling that runs in Node.
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // verbatimModuleSyntax needs `import type` for type-only imports.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);
