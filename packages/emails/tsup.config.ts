import { defineConfig } from "tsup";

// D121: CommonJS for the backend (Medusa runs CommonJS) and ESM for the storefront, with their
// types. React and React Email stay outside the bundle (dependencies are external by default).
// `prepare` builds it on every full `pnpm install` (so a CI job or a fresh clone that starts an app
// directly, without turbo, finds `dist/`), turbo's `^build` before each app's tasks, and `dev`
// watches it; the watch does not empty `dist/` first, so a running app never finds it missing.
export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: !options.watch,
  target: "node22",
  platform: "node",
  sourcemap: false,
}));
