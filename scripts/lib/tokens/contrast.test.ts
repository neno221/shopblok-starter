import { describe, expect, it } from "vitest";
import {
  compositeOver,
  formatRatio,
  pairRatio,
  parseHex,
  relativeLuminance,
  toHex,
} from "./contrast.ts";

describe("parseHex", () => {
  it("reads #rrggbb and #rrggbbaa", () => {
    expect(parseHex("#ffffff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex("#a1a1a180")).toEqual({
      r: 161,
      g: 161,
      b: 161,
      a: 128 / 255,
    });
  });

  it("refuses anything else", () => {
    for (const bad of ["fff", "#fff", "#12345", "#gggggg", "rgb(0 0 0)", ""]) {
      expect(() => parseHex(bad)).toThrow(/not a #rrggbb/);
    }
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(pairRatio("#000000", "#ffffff")).toBeCloseTo(21, 10);
    expect(pairRatio("#777777", "#777777")).toBe(1);
  });

  it("does not depend on the order of the two colours", () => {
    expect(pairRatio("#ffffff", "#767676")).toBe(
      pairRatio("#767676", "#ffffff"),
    );
  });

  it("matches the published values for #767676 (4.54:1) and #777777 (4.48:1) on white", () => {
    expect(formatRatio(pairRatio("#767676", "#ffffff"))).toBe("4.54");
    expect(formatRatio(pairRatio("#777777", "#ffffff"))).toBe("4.48");
  });

  it("uses the WCAG luminance weights", () => {
    expect(relativeLuminance(parseHex("#ff0000"))).toBeCloseTo(0.2126, 10);
    expect(relativeLuminance(parseHex("#00ff00"))).toBeCloseTo(0.7152, 10);
    expect(relativeLuminance(parseHex("#0000ff"))).toBeCloseTo(0.0722, 10);
  });

  it("matches the values M1 plan D35 computed for shadcn's neutral defaults", () => {
    expect(formatRatio(pairRatio("#e5e5e5", "#ffffff"))).toBe("1.26");
    expect(formatRatio(pairRatio("#a1a1a1", "#ffffff"))).toBe("2.58");
    expect(formatRatio(pairRatio("#a1a1a1", "#ffffff", 0.5))).toBe("1.54");
    expect(formatRatio(pairRatio("#a3a3a3", "#ffffff"))).toBe("2.52");
    expect(formatRatio(pairRatio("#737373", "#f5f5f5"))).toBe("4.35");
  });
});

describe("alpha", () => {
  it("composites a translucent foreground over the surface before it measures", () => {
    const half = compositeOver(parseHex("#000000"), parseHex("#ffffff"), 0.5);
    expect(toHex(half)).toBe("#808080");
    // 50 % black over white is 127.5 per channel, which toHex rounds up to 128.
    expect(formatRatio(pairRatio("#000000", "#ffffff", 0.5))).toBe("3.98");
  });

  it("counts the alpha held in the hex and the extra alpha together", () => {
    expect(pairRatio("#00000080", "#ffffff")).toBeCloseTo(
      pairRatio("#000000", "#ffffff", 128 / 255),
      10,
    );
    expect(pairRatio("#000000ff", "#ffffff", 0.5)).toBeCloseTo(
      pairRatio("#000000", "#ffffff", 0.5),
      10,
    );
  });

  it("refuses a translucent surface", () => {
    expect(() => pairRatio("#000000", "#ffffff80")).toThrow(/translucent/);
  });
});

describe("formatRatio", () => {
  it("rounds to two decimals", () => {
    expect(formatRatio(4.5449)).toBe("4.54");
    expect(formatRatio(4.545)).toBe("4.55");
    expect(formatRatio(21)).toBe("21.00");
  });

  it("never prints a failing ratio as the threshold it fails", () => {
    expect(formatRatio(2.999, 3)).toBe("2.99");
    expect(formatRatio(4.4999, 4.5)).toBe("4.49");
    expect(formatRatio(3, 3)).toBe("3.00");
    expect(formatRatio(4.5, 4.5)).toBe("4.50");
    expect(formatRatio(2.999)).toBe("3.00");
  });
});
