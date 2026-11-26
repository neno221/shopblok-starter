import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OG_FONT_FILE } from "./og-image";

// M7 D147 (T110): the share picture's font (`OG_FONT_FILE`) is TrueType, which the image renderer
// reads, and has a glyph for every letter of the shop's languages: Greek's, with its accents, and
// the Latin ones of English, German and French. A letter it lacks would be drawn as a box.

/** The font's Unicode code points, read from its `cmap` table (formats 4 and 12). */
function codePoints(font: Buffer): Set<number> {
  const tables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const at = 12 + i * 16;
    if (font.toString("latin1", at, at + 4) === "cmap") cmap = font.readUInt32BE(at + 8);
  }
  if (cmap < 0) throw new Error("no cmap table");
  const points = new Set<number>();
  const subtables = font.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const offset = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = font.readUInt16BE(offset);
    if (format === 4) {
      const segments = font.readUInt16BE(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let s = 0; s < segments; s++) {
        const end = font.readUInt16BE(ends + s * 2);
        const start = font.readUInt16BE(starts + s * 2);
        const delta = font.readInt16BE(deltas + s * 2);
        const range = font.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const glyph =
            range === 0
              ? (c + delta) & 0xffff
              : font.readUInt16BE(ranges + s * 2 + range + (c - start) * 2);
          if (glyph !== 0) points.add(c);
        }
      }
    } else if (format === 12) {
      const groups = font.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const at = offset + 16 + g * 12;
        const start = font.readUInt32BE(at);
        const end = font.readUInt32BE(at + 4);
        for (let c = start; c <= end; c++) points.add(c);
      }
    }
  }
  return points;
}

const font = readFileSync(join(process.cwd(), OG_FONT_FILE));

describe("the share picture's font", () => {
  it("is TrueType (not WOFF or WOFF2, which the renderer refuses)", () => {
    expect(font.readUInt32BE(0)).toBe(0x00010000);
  });

  const points = codePoints(font);
  const missing = (text: string) =>
    [...text].filter((char) => char.trim() !== "" && !points.has(char.codePointAt(0) ?? 0));

  it("is read right: a script the font lacks is reported missing", () => {
    expect(points.size).toBeGreaterThan(1000);
    expect(missing("漢")).toEqual(["漢"]);
  });

  it("has every Greek letter, with its accents and diaeresis", () => {
    expect(
      missing(
        "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ αβγδεζηθικλμνξοπρσςτυφχψω άέήίόύώ ΆΈΉΊΌΎΏ ϊϋΐΰ Ϊ Ϋ",
      ),
    ).toEqual([]);
  });

  it("has the Latin letters of the shop's other languages, and its punctuation", () => {
    expect(missing("ABCXYZ abcxyz 0123456789 äöüß ÄÖÜ éèêëàâçîïôûùÿœæ ÉÈÊÀÇ «»€£… – —|’")).toEqual(
      [],
    );
  });
});
