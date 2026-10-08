// Shared Prettier preset. Indentation, line endings and the final newline come from the root
// .editorconfig, which Prettier reads.
/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  endOfLine: "lf",
};

export default config;
