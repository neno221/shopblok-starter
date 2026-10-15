import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fnv1a, joinSlices, type Slice } from "./figma-slices.ts";

function slice(text: string, offset: number, size: number): Slice {
  return {
    offset,
    length: text.length,
    fnv1a: fnv1a(text),
    chunk: text.slice(offset, offset + size),
  };
}

describe("fnv1a", () => {
  it("matches the published 32-bit FNV-1a values", () => {
    expect(fnv1a("")).toBe("811c9dc5");
    expect(fnv1a("a")).toBe("e40c292c");
    expect(fnv1a("foobar")).toBe("bf9cf968");
  });

  it("is the same function as the export code's copy", () => {
    const code = readFileSync(
      path.join(import.meta.dirname, "../figma/export-variables.js"),
      "utf8",
    );
    expect(code).toContain("hash ^= text.charCodeAt(i);");
    expect(code).toContain("hash = Math.imul(hash, 0x01000193) >>> 0;");
    expect(code).toContain("let hash = 0x811c9dc5;");
  });
});

describe("joinSlices", () => {
  const text = '{"a":"' + "x".repeat(25) + '"}';

  it("joins slices in any order, from runs with different sizes", () => {
    expect(
      joinSlices([
        slice(text, 20, 100),
        slice(text, 0, 10),
        slice(text, 10, 10),
      ]),
    ).toBe(text);
  });

  it("accepts overlapping slices", () => {
    expect(joinSlices([slice(text, 0, 20), slice(text, 15, 100)])).toBe(text);
  });

  it("fails on no slices, a gap, a short join, another export or a wrong copy", () => {
    expect(() => joinSlices([])).toThrow("no slices");
    expect(() =>
      joinSlices([slice(text, 0, 10), slice(text, 20, 100)]),
    ).toThrow("gap before offset 20");
    expect(() => joinSlices([slice(text, 0, 10)])).toThrow("joined 10 of");
    const other = { ...slice(text, 10, 100), fnv1a: "00000000" };
    expect(() => joinSlices([slice(text, 0, 10), other])).toThrow(
      "different export",
    );
    const wrong = {
      ...slice(text, 10, 100),
      chunk: slice(text, 10, 100).chunk.replace("x", "y"),
    };
    expect(() => joinSlices([slice(text, 0, 10), wrong])).toThrow(
      "FNV-1a hash",
    );
  });
});
