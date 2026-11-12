import { defineConfig } from "tsup";

// D121: CommonJS for the backend (Medusa runs CommonJS) and ESM for the storefront, with their
// types. React and React Email stay outside the bundle (dependencies are external by default).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  target: "node22",
  platform: "node",
  sourcemap: false,
});
