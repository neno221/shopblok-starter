// The build's checks (M1 plan, T19 step 4; D27, D35; SPEC §13). Pure functions on plain data:
// `model.ts` reads the resolved tokens and passes numbers and colours in. A failed check is an
// error message, and the build collects all of them before it stops.
import {
  compositeOver,
  contrastRatio,
  formatRatio,
  parseHex,
  toHex,
} from "./contrast.ts";

// ---------------------------------------------------------------------------------------------
// Radius (D27): `--radius` is the kit's `lg`, and shadcn derives the rest from it.

/** px added to `--radius` for each step of the scale: shadcn's `calc(var(--radius) + …)`. */
export const RADIUS_OFFSETS: Readonly<Record<string, number>> = {
  xs: -8,
  sm: -4,
  md: -2,
  lg: 0,
  xl: 4,
  "2xl": 8,
  "3xl": 12,
  "4xl": 16,
};

/** `kit` maps a step ("xs" to "4xl") to the kit's px value. The derived value must equal it. */
export function checkRadius(kit: Readonly<Record<string, number>>): string[] {
  const base = kit["lg"];
  if (base === undefined)
    return ["radius: the kit has no `lg`, which is --radius"];
  const errors: string[] = [];
  for (const [step, offset] of Object.entries(RADIUS_OFFSETS)) {
    const value = kit[step];
    if (value === undefined)
      errors.push(`radius ${step}: the kit has no such step`);
    else if (value !== base + offset)
      errors.push(
        `radius ${step}: the kit has ${value}px; --radius (${base}px) ${offset < 0 ? "-" : "+"} ${Math.abs(offset)}px gives ${base + offset}px`,
      );
  }
  for (const step of Object.keys(kit))
    if (!(step in RADIUS_OFFSETS))
      errors.push(`radius ${step}: the kit has a step with no derived value`);
  return errors;
}

// ---------------------------------------------------------------------------------------------
// Spacing (D27): Tailwind's 4 px step; the output is `--spacing` alone.

export const SPACING_STEP_PX = 4;

/**
 * The px the variable `name` (its last segment: `gap-2`, `w-0,5`, `px-px`) must have, `"full"`
 * for the kit's `Infinite` (9999, no step), or undefined if the name follows no pattern. The kit
 * writes a half step with a comma (`0,5`), and names the one-pixel padding `pb-pb`, `pl-pl`… .
 */
export function expectedSpacing(name: string): number | "full" | undefined {
  const match = /^([a-z]+)-(.+)$/.exec(name);
  if (!match) return undefined;
  const [, prefix, step] = match;
  if (step === "px" || step === prefix) return 1;
  if (step === "Infinite") return "full";
  if (/^\d+(,\d+)?$/.test(step!))
    return Number(step!.replace(",", ".")) * SPACING_STEP_PX;
  return undefined;
}

/** `entries`: the variable's key (for the message), its last name segment and its px value. */
export function checkSpacing(
  entries: readonly { key: string; name: string; px: number }[],
): {
  errors: string[];
  checked: number;
  full: number;
} {
  const errors: string[] = [];
  let checked = 0;
  let full = 0;
  for (const { key, name, px } of entries) {
    const expected = expectedSpacing(name);
    if (expected === undefined)
      errors.push(`spacing ${key}: the name follows no Tailwind step`);
    else if (expected === "full") full++;
    else {
      checked++;
      if (px !== expected)
        errors.push(
          `spacing ${key}: ${px}px, but Tailwind's ${name} is ${expected}px (a ${SPACING_STEP_PX}px step)`,
        );
    }
  }
  return { errors, checked, full };
}

// ---------------------------------------------------------------------------------------------
// Contrast (D35; SPEC §13)

export type Side = { name: string; hex: string };

/** One declared pair. Text is 4.5:1, UI components 3:1 (the `minimum` says which). */
export type PairSpec = {
  id: string;
  foreground: Side;
  /** The surface. If it is translucent (an overlay), `over` is what it sits on. */
  background: Side;
  over?: Side;
  minimum: number;
  /** The alpha the foreground is drawn with, on top of its own (a ring at 50 %: 0.5). */
  alpha: number;
};

export type PairResult = {
  id: string;
  minimum: number;
  alpha: number;
  foreground: Side;
  background: Side;
  over?: Side;
  /** The composited colours the ratio was measured between. */
  seen: { foreground: string; background: string };
  ratio: number;
  passes: boolean;
};

export function evaluatePair(spec: PairSpec): PairResult {
  let surface = parseHex(spec.background.hex);
  if (spec.over) surface = compositeOver(surface, parseHex(spec.over.hex));
  else if (surface.a !== 1)
    throw new Error(
      `${spec.id}: ${spec.background.name} is translucent and the pair names no surface under it`,
    );
  const foreground = compositeOver(
    parseHex(spec.foreground.hex),
    surface,
    spec.alpha,
  );
  const ratio = contrastRatio(foreground, surface);
  return {
    id: spec.id,
    minimum: spec.minimum,
    alpha: spec.alpha,
    foreground: spec.foreground,
    background: spec.background,
    ...(spec.over ? { over: spec.over } : {}),
    seen: { foreground: toHex(foreground), background: toHex(surface) },
    ratio,
    passes: ratio >= spec.minimum,
  };
}

/** The message of a failed pair: the pair, both colours and the ratio. */
export function describeFailure(result: PairResult): string {
  const alpha =
    result.alpha === 1 ? "" : ` at ${Math.round(result.alpha * 100)} %`;
  const over = result.over
    ? ` over ${result.over.name} ${result.over.hex}`
    : "";
  return `contrast ${result.id}: ${result.foreground.name} ${result.foreground.hex}${alpha} on ${result.background.name} ${result.background.hex}${over} is ${formatRatio(result.ratio, result.minimum)}:1, needs ${result.minimum}:1`;
}
