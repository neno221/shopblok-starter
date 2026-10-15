import base from "@shopblok/config/eslint/base";

export default [
  // Figma plugin code, run through the connector's use_figma tool, which
  // wraps it in an async function: its top-level `return` isn't a module.
  { ignores: ["figma/export-variables.js"] },
  ...base,
];
