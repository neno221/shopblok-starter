// WCAG 2.2 contrast (SPEC §13; M1 plan, D35, T19). Pure functions on sRGB hex strings, with no
// colour-space conversion: the kit's colours are sRGB hex and stay so (D27).
// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance and #dfn-contrast-ratio

export type Rgba = { r: number; g: number; b: number; a: number };

const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;

/** `#rrggbb` or `#rrggbbaa`; channels 0 to 255, alpha 0 to 1. Anything else throws. */
export function parseHex(hex: string): Rgba {
  const match = HEX.exec(hex);
  if (!match) throw new Error(`"${hex}" is not a #rrggbb or #rrggbbaa colour`);
  const digits = match[1]!;
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
    a: match[2] === undefined ? 1 : parseInt(match[2], 16) / 255,
  };
}

/** `foreground` laid over `background` (which must be opaque), at `extraAlpha` on top of its own. */
export function compositeOver(
  foreground: Rgba,
  background: Rgba,
  extraAlpha = 1,
): Rgba {
  if (background.a !== 1)
    throw new Error("the surface a colour is composited over must be opaque");
  const alpha = foreground.a * extraAlpha;
  const mix = (f: number, b: number) => f * alpha + b * (1 - alpha);
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The ratio of two opaque colours, 1 to 21. Not rounded: 2.999 does not pass 3. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The contrast of `foreground` (drawn at `alpha`, and with the alpha its hex holds) over the
 * opaque surface `background`: the foreground is composited over the surface first.
 */
export function pairRatio(
  foreground: string,
  background: string,
  alpha = 1,
): number {
  const surface = parseHex(background);
  if (surface.a !== 1)
    throw new Error(`the surface ${background} is translucent`);
  return contrastRatio(
    compositeOver(parseHex(foreground), surface, alpha),
    surface,
  );
}

/**
 * Two decimals, rounded to the nearest, except that a ratio below `minimum` never prints as the
 * minimum: 2.999 against 3 prints "2.99".
 */
export function formatRatio(ratio: number, minimum?: number): string {
  const rounded = Math.round(ratio * 100) / 100;
  if (minimum !== undefined && ratio < minimum && rounded >= minimum)
    return (Math.floor(ratio * 100) / 100).toFixed(2);
  return rounded.toFixed(2);
}

export function toHex(color: Rgba): string {
  const channel = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}
