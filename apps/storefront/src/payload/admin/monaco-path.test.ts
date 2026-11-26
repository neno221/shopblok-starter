import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loaderVersion } from "../../../scripts/copy-monaco";
import { MONACO_PUBLIC_DIR, MONACO_VERSION, MONACO_VS } from "./monaco-path";

// M7 D141 (T107): the provider only works if it configures the very loader Payload's code editor
// uses, and the copy only if it is the version that loader expects.

const app = fileURLToPath(new URL("../../..", import.meta.url));
const fromApp = createRequire(join(app, "package.json"));

/** The package folder (its `package.json`'s directory, with links resolved) a require finds. */
const packageDir = (req: NodeJS.Require, name: string): string =>
  realpathSync(dirname(req.resolve(`${name}/package.json`)));

/** `@payloadcms/ui`'s folder: its `exports` has no `./package.json`, so through the link. */
const payloadUi = (): string => realpathSync(join(app, "node_modules", "@payloadcms", "ui"));

describe("Monaco's loader and copy", () => {
  it("is one @monaco-editor/loader for the provider and @payloadcms/ui's editor", () => {
    const ours = packageDir(fromApp, "@monaco-editor/loader");
    const ui = createRequire(join(payloadUi(), "package.json"));
    const react = createRequire(join(packageDir(ui, "@monaco-editor/react"), "package.json"));
    expect(packageDir(react, "@monaco-editor/loader")).toBe(ours);
  });

  it("copies the monaco-editor version the loader would fetch from jsdelivr", () => {
    const loaderDir = packageDir(fromApp, "@monaco-editor/loader");
    const config = readFileSync(join(loaderDir, "lib", "es", "config", "index.js"), "utf8");
    expect(config).toContain(`monaco-editor@${MONACO_VERSION}/min/vs`);
    const installed = JSON.parse(
      readFileSync(join(packageDir(fromApp, "monaco-editor"), "package.json"), "utf8"),
    ) as { version: string };
    expect(installed.version).toBe(MONACO_VERSION);
    const pinned = JSON.parse(readFileSync(join(app, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    expect(pinned.devDependencies["monaco-editor"]).toBe(MONACO_VERSION);
    // `copy-monaco.ts` reads the loader's version on its own (it imports no app source).
    expect(loaderVersion()).toBe(MONACO_VERSION);
  });

  it("serves the copy from the shop's own public folder, never a CDN", () => {
    expect(MONACO_PUBLIC_DIR).toBe("vendor/monaco/0.55.1/vs");
    expect(MONACO_VS).toBe("/vendor/monaco/0.55.1/vs");
  });
});
