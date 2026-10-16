// The build's checks (M1 plan, T19 step 4; D27, D35; SPEC §13). Pure functions on plain data:
// `model.ts` reads the resolved tokens and passes numbers and colours in. A failed check is an
// error message; `model.ts` collects them and the build stops with all of them in one message.
import {
  compositeOver,
  contrastRatio,
  formatRatio,
  parseHex,
  toHex,
} from "./contrast.ts";

/**
 * A problem with the token files (a missing token, a value of the wrong kind, a pair that cannot
 * be read), as opposed to a bug in this code. `model.ts` turns each one into a line of the one
 * message the build stops with, and lets any other error through.
 */
export class CheckError extends Error {}

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
    throw new CheckError(
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

// ---------------------------------------------------------------------------------------------
// Coverage (D35): the gate is only as wide as the pairs declared, so every text colour and every
// focus ring has to be in one.

/** A token the coverage rule applies to: `foreground`, `*-foreground`, `ring` and `*-ring`. */
export const needsPair = (name: string): boolean =>
  /(^|-)(foreground|ring)$/.test(name);

/**
 * The `*-foreground` and `*-ring` tokens that need no contrast pair, each with the reason. A
 * colour used for text or as the edge of a control belongs in a pair, not here: this is for a
 * token that is decorative, or that draws no text and no edge. It is empty today: the 17
 * foregrounds and the two rings are all in pairs. (`border`, `sidebar-border` and `chart-1` to
 * `chart-5` do not match the rule, so they need no entry; D35 calls `border` decorative.)
 */
export const COVERAGE_EXEMPT: Readonly<Record<string, string>> = {};

/**
 * Every token of `names` that `needsPair` matches must be in `paired` (the names that some
 * declared pair uses on any side) or in `exempt`. An exemption that names no token, has no
 * reason, or is not needed any more is an error too, so the list cannot go stale.
 */
export function checkCoverage(
  names: readonly string[],
  paired: ReadonlySet<string>,
  exempt: Readonly<Record<string, string>> = COVERAGE_EXEMPT,
): string[] {
  const errors: string[] = [];
  for (const name of names)
    if (needsPair(name) && !paired.has(name) && !(name in exempt))
      errors.push(
        `semantic.${name} sits in no contrast pair: declare one in shopblok.tokens.json, or list it in COVERAGE_EXEMPT (checks.ts) with the reason it needs none`,
      );
  for (const [name, reason] of Object.entries(exempt)) {
    if (!names.includes(name))
      errors.push(`COVERAGE_EXEMPT lists ${name}, which is no semantic token`);
    else if (reason.trim() === "")
      errors.push(`COVERAGE_EXEMPT lists ${name} without a reason`);
    else if (paired.has(name))
      errors.push(
        `COVERAGE_EXEMPT lists ${name}, which sits in a pair now: remove the entry`,
      );
    else if (!needsPair(name))
      errors.push(
        `COVERAGE_EXEMPT lists ${name}, which the rule does not apply to: remove the entry`,
      );
  }
  return errors;
}

// ---------------------------------------------------------------------------------------------
// Font variable (D28): tokens.css reads the variable `next/font` sets, and only a check can tie
// the two together, because next/font needs a string literal in fonts.ts, not an import.

/** The `variable: "--font-…"` that `fonts.ts` passes to `next/font`, if it has one. */
export function declaredFontVariable(fontsSource: string): string | undefined {
  return /\bvariable:\s*"([^"]+)"/.exec(fontsSource)?.[1];
}

export function checkFontVariable(
  variable: string,
  family: string,
  fontsSource: string,
): string[] {
  const declared = declaredFontVariable(fontsSource);
  if (declared === undefined)
    return [
      'font: apps/storefront/src/lib/fonts.ts declares no `variable: "--…"` for next/font',
    ];
  if (declared !== variable)
    return [
      `font: tokens.css reads ${variable} (from the kit's font "${family}"), but apps/storefront/src/lib/fonts.ts sets ${declared}; the site would fall back to the system font`,
    ];
  return [];
}
