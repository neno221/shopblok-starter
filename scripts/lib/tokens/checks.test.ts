import { describe, expect, it } from "vitest";
import {
  CheckError,
  checkCoverage,
  checkFontVariable,
  checkRadius,
  checkSpacing,
  COVERAGE_EXEMPT,
  declaredFontVariable,
  describeFailure,
  evaluatePair,
  expectedSpacing,
  needsPair,
  RADIUS_OFFSETS,
  type PairSpec,
} from "./checks.ts";

describe("checkRadius", () => {
  const kit = {
    xs: 2,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 14,
    "2xl": 18,
    "3xl": 22,
    "4xl": 26,
  };

  it("passes the kit's scale: xs 2 to 4xl 26 on a 10 px base", () => {
    expect(checkRadius(kit)).toEqual([]);
  });

  it("names a step that is off the derived scale", () => {
    expect(checkRadius({ ...kit, "3xl": 24 })).toEqual([
      "radius 3xl: the kit has 24px; --radius (10px) + 12px gives 22px",
    ]);
    expect(checkRadius({ ...kit, xs: 4 })[0]).toMatch(
      /radius xs: the kit has 4px; .* - 8px gives 2px/,
    );
  });

  it("moves every step when the base moves", () => {
    expect(checkRadius({ ...kit, lg: 12 })).toHaveLength(
      Object.keys(RADIUS_OFFSETS).length - 1,
    );
  });

  it("fails on a missing or an extra step", () => {
    const { xl: _, ...without } = kit;
    expect(checkRadius(without)).toEqual([
      "radius xl: the kit has no such step",
    ]);
    expect(checkRadius({ ...kit, "5xl": 30 })).toEqual([
      "radius 5xl: the kit has a step with no derived value",
    ]);
  });
});

describe("expectedSpacing", () => {
  it("is 4 px per Tailwind step, with half steps written with a comma", () => {
    expect(expectedSpacing("gap-2")).toBe(8);
    expect(expectedSpacing("w-0,5")).toBe(2);
    expect(expectedSpacing("s-0,75")).toBe(3);
    expect(expectedSpacing("size-96")).toBe(384);
    expect(expectedSpacing("m-0")).toBe(0);
  });

  it("reads px, and the kit's pb-pb, as one pixel", () => {
    expect(expectedSpacing("gap-px")).toBe(1);
    expect(expectedSpacing("pb-pb")).toBe(1);
    expect(expectedSpacing("px-px")).toBe(1);
  });

  it("treats Infinite as no step, and anything else as a name it doesn't know", () => {
    expect(expectedSpacing("h-Infinite")).toBe("full");
    expect(expectedSpacing("gap-2xl")).toBeUndefined();
    expect(expectedSpacing("nothing")).toBeUndefined();
  });
});

describe("checkSpacing", () => {
  it("passes steps on the 4 px grid and counts them", () => {
    const result = checkSpacing([
      { key: "TailwindCSS.gap.gap-1", name: "gap-1", px: 4 },
      { key: "TailwindCSS.gap.gap-px", name: "gap-px", px: 1 },
      { key: "TailwindCSS.width.h-Infinite", name: "h-Infinite", px: 9999 },
    ]);
    expect(result).toEqual({ errors: [], checked: 2, full: 1 });
  });

  it("names a value off the step", () => {
    const { errors } = checkSpacing([
      { key: "TailwindCSS.gap.gap-3", name: "gap-3", px: 13 },
    ]);
    expect(errors).toEqual([
      "spacing TailwindCSS.gap.gap-3: 13px, but Tailwind's gap-3 is 12px (a 4px step)",
    ]);
  });

  it("fails on a name that follows no step", () => {
    expect(
      checkSpacing([{ key: "TailwindCSS.gap.gap-big", name: "gap-big", px: 4 }])
        .errors,
    ).toHaveLength(1);
  });
});

describe("evaluatePair", () => {
  const side = (name: string, hex: string) => ({ name, hex });
  const spec = (over: Partial<PairSpec> = {}): PairSpec => ({
    id: "ui.input-on-background",
    foreground: side("input", "#949494"),
    background: side("background", "#ffffff"),
    minimum: 3,
    alpha: 1,
    ...over,
  });

  it("passes at the threshold and fails just under it", () => {
    expect(evaluatePair(spec()).passes).toBe(true);
    expect(
      evaluatePair(spec({ foreground: side("input", "#959595") })).passes,
    ).toBe(false);
  });

  it("composites the foreground at its alpha before it measures", () => {
    const half = evaluatePair(
      spec({ foreground: side("ring", "#a1a1a1"), alpha: 0.5 }),
    );
    expect(half.seen.foreground).toBe("#d0d0d0");
    expect(half.ratio).toBeCloseTo(1.54, 2);
    expect(half.passes).toBe(false);
  });

  it("composites a translucent surface over the one it sits on", () => {
    const result = evaluatePair({
      id: "text.overlay-foreground-on-overlay",
      foreground: side("overlay-foreground", "#ffffff"),
      background: side("overlay", "#00000099"),
      over: side("background", "#ffffff"),
      minimum: 4.5,
      alpha: 1,
    });
    expect(result.seen.background).toBe("#666666");
    expect(result.passes).toBe(true);
  });

  it("refuses a translucent surface that names nothing under it", () => {
    expect(() =>
      evaluatePair(spec({ background: side("overlay", "#00000099") })),
    ).toThrow(/translucent/);
    expect(() =>
      evaluatePair(spec({ background: side("overlay", "#00000099") })),
    ).toThrow(CheckError);
  });

  it("describes a failure with the pair, both colours and the ratio", () => {
    const failing = evaluatePair(
      spec({ foreground: side("input", "#e5e5e5") }),
    );
    expect(describeFailure(failing)).toBe(
      "contrast ui.input-on-background: input #e5e5e5 on background #ffffff is 1.26:1, needs 3:1",
    );
  });

  it("says the alpha in a failure that has one", () => {
    const failing = evaluatePair(
      spec({ foreground: side("ring", "#a1a1a1"), alpha: 0.5 }),
    );
    expect(describeFailure(failing)).toContain(
      "ring #a1a1a1 at 50 % on background #ffffff is 1.54:1",
    );
  });
});

describe("checkCoverage", () => {
  const names = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "ring",
    "sidebar-ring",
    "border",
    "chart-1",
  ];
  const paired = new Set(["foreground", "card-foreground", "ring"]);

  it("applies to foreground, *-foreground, ring and *-ring, and to nothing else", () => {
    expect(names.filter(needsPair)).toEqual([
      "foreground",
      "card-foreground",
      "ring",
      "sidebar-ring",
    ]);
    expect(needsPair("overlay-foreground")).toBe(true);
    expect(needsPair("foregrounds")).toBe(false);
    expect(needsPair("sidebar-border")).toBe(false);
  });

  it("names a foreground or a ring that sits in no pair", () => {
    expect(checkCoverage(names, paired, {})).toEqual([
      expect.stringMatching(/^semantic\.sidebar-ring sits in no contrast pair/),
    ]);
    expect(
      checkCoverage([...names, "badge-new-foreground"], paired, {}),
    ).toEqual([
      expect.stringContaining("semantic.sidebar-ring "),
      expect.stringContaining("semantic.badge-new-foreground "),
    ]);
  });

  it("lets an exempt token go without a pair", () => {
    expect(
      checkCoverage(names, paired, {
        "sidebar-ring": "the storefront has no sidebar",
      }),
    ).toEqual([]);
  });

  it("keeps the list honest: no unknown token, no empty reason, nothing already paired", () => {
    const exempt = (entry: Record<string, string>) =>
      checkCoverage(names, new Set([...paired, "sidebar-ring"]), entry);
    expect(exempt({ "no-such-foreground": "x" })).toEqual([
      "COVERAGE_EXEMPT lists no-such-foreground, which is no semantic token",
    ]);
    expect(exempt({ border: " " })).toEqual([
      "COVERAGE_EXEMPT lists border without a reason",
    ]);
    expect(exempt({ ring: "x" })).toEqual([
      "COVERAGE_EXEMPT lists ring, which sits in a pair now: remove the entry",
    ]);
    expect(exempt({ border: "decorative" })).toEqual([
      "COVERAGE_EXEMPT lists border, which the rule does not apply to: remove the entry",
    ]);
  });

  it("ships an allow-list whose entries all have a reason", () => {
    for (const [name, reason] of Object.entries(COVERAGE_EXEMPT))
      expect(reason.trim(), name).not.toBe("");
  });
});

describe("checkFontVariable", () => {
  const fonts = `export const inter = Inter({\n  display: "swap",\n  variable: "--font-inter",\n});`;

  it("reads the variable fonts.ts gives next/font", () => {
    expect(declaredFontVariable(fonts)).toBe("--font-inter");
    expect(declaredFontVariable("export const inter = Inter({});")).toBe(
      undefined,
    );
  });

  it("passes when tokens.css reads that variable", () => {
    expect(checkFontVariable("--font-inter", "Inter", fonts)).toEqual([]);
  });

  it("fails when the kit's font name would change the variable", () => {
    expect(
      checkFontVariable("--font-inter-variable", "Inter Variable", fonts),
    ).toEqual([
      expect.stringMatching(
        /tokens\.css reads --font-inter-variable \(from the kit's font "Inter Variable"\), but .*fonts\.ts sets --font-inter;/,
      ),
    ]);
  });

  it("fails when fonts.ts gives no variable at all", () => {
    expect(checkFontVariable("--font-inter", "Inter", "export {}")).toEqual([
      expect.stringContaining("declares no `variable:"),
    ]);
  });
});
