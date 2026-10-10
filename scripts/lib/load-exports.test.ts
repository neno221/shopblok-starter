import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadExports } from "./load-exports.ts";

const directory = mkdtempSync(path.join(tmpdir(), "load-exports-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function write(name: string, text: string): string {
  const file = path.join(directory, name);
  writeFileSync(file, text);
  return file;
}

describe("loadExports", () => {
  it("returns the named exports of a TypeScript file, types stripped", async () => {
    const file = write(
      "ok.ts",
      `export type Locale = "en-US";\nexport const LOCALES = ["en-US", "el-GR"] as const;\nexport const NAME: string = "x";\nexport const unused = 1;\n`,
    );
    expect(await loadExports(file, ["LOCALES", "NAME"])).toEqual({
      exports: { LOCALES: ["en-US", "el-GR"], NAME: "x" },
    });
  });

  it("a name the file does not export is absent from the result (JSON drops undefined)", async () => {
    const file = write("absent.ts", `export const A = 1;\n`);
    expect(await loadExports(file, ["A", "B"])).toEqual({ exports: { A: 1 } });
  });

  it("reads a file of a package with no `type` (the backend's case)", async () => {
    // The directory has no package.json at all, like the backend's has no "type": Node reparses the
    // file as a module and warns on the child's stderr, which does not get in the way.
    const file = write("typeless.ts", `export const A = [1];\n`);
    const result = await loadExports(file, ["A"]);
    expect(result).toEqual({ exports: { A: [1] } });
  });

  it("reads the real backend config", async () => {
    const file = path.resolve(import.meta.dirname, "../../apps/backend/src/config/markets.ts");
    const result = await loadExports(file, ["SUPPORTED_LOCALES", "MARKET_REGIONS"]);
    if ("error" in result) throw new Error(result.error);
    expect(Array.isArray(result.exports.SUPPORTED_LOCALES)).toBe(true);
    expect(Array.isArray(result.exports.MARKET_REGIONS)).toBe(true);
  });

  it("a thrown value that is not an Error is reported, not Node's version banner", async () => {
    const file = write("throws-string.ts", `throw "plain text";\n`);
    const result = await loadExports(file, ["A"]);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).not.toMatch(/^Node\.js v\d/);
    expect((result as { error: string }).error).not.toBe("");
  });

  it("says why when the file throws or is missing", async () => {
    const throws = write("throws.ts", `throw new Error("boom in config");\n`);
    const thrown = await loadExports(throws, ["A"]);
    expect(thrown).toHaveProperty("error");
    expect((thrown as { error: string }).error).toContain("boom in config");

    const missing = await loadExports(path.join(directory, "nope.ts"), ["A"]);
    expect(missing).toHaveProperty("error");
  });
});
