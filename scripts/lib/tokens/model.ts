// What `tokens.css` and `tokens.ts` say, as plain data (M1 plan, T19; D26 to D28, D35). It reads
// the tokens Style Dictionary resolved (`getPlatformTokens`) and runs every check on them; both
// formats render this one model, so neither can print what the checks did not see. It throws, with
// every failure in one message, before anything is written.
//
// The mapping from the kit's names to CSS variables is this file's, the commerce tokens, the
// overrides and the pairs are `shopblok.tokens.json`'s, and the kit's tokens are read, never
// changed (D27).
import type { Dictionary, TransformedToken } from "style-dictionary/types";
import {
  checkRadius,
  checkSpacing,
  describeFailure,
  evaluatePair,
  RADIUS_OFFSETS,
  SPACING_STEP_PX,
  type PairResult,
  type PairSpec,
  type Side,
} from "./checks.ts";
import { EFFECT_STYLES } from "./figma-parser.ts";

/** shadcn's variable contract (SPEC §9.2), in the order `tokens.css` writes it. */
export const CONTRACT = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

/** SPEC §9.2's commerce additions. Each surface among them also has a `-foreground`. */
export const COMMERCE = [
  "price",
  "price-sale",
  "price-original",
  "rating",
  "success",
  "warning",
  "info",
  "badge-sale",
  "badge-new",
  "stock-in",
  "stock-low",
  "stock-out",
  "overlay",
] as const;

/** The commerce tokens that are surfaces: each has a `-foreground` (SPEC §9.2). */
export const SURFACES = [
  "success",
  "warning",
  "info",
  "badge-sale",
  "badge-new",
  "overlay",
] as const;

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
const SPACING_GROUPS = [
  "gap",
  "margin",
  "padding",
  "size",
  "spacing",
  "width",
  "height",
];
const SHADOW_ORDER = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];
const WEIGHT_NAMES: Record<string, string> = {
  regular: "normal",
  medium: "medium",
  semibold: "semibold",
  bold: "bold",
};

export type Override = {
  /** The kit token it replaces, as a path (`Mode.base.input`). */
  kit: string;
  kitValue: string;
  reason: string;
};

export type ColorEntry = {
  name: string;
  /** The resolved colour, `#rrggbb` or `#rrggbbaa`. */
  value: string;
  /** The primitive it is written as `var(--…)` of, if it comes from one. */
  primitive?: string;
  /** Where it comes from: a kit path or a path in `shopblok.tokens.json`. */
  source: string;
  group: "contract" | "commerce";
  override?: Override;
  description?: string;
};

export type Primitive = {
  name: string;
  value: string;
  source: string;
  own: boolean;
};

export type PairEntry = PairResult & {
  kind: "text" | "ui";
  /** The same pair with the kit's value in place of each override, if there is one. */
  kit?: { ratio: number; passes: boolean };
};

export type ShadowLayer = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
};

export type Model = {
  colors: ColorEntry[];
  primitives: Primitive[];
  radius: {
    base: number;
    steps: { step: string; offset: number; px: number }[];
  };
  spacing: { stepPx: number; checked: number; full: number };
  font: { family: string; variable: string };
  weights: { name: string; value: number }[];
  text: { step: string; sizePx: number; lineHeightPx: number }[];
  breakpoints: { name: string; px: number }[];
  shadows: { name: string; layers: ShadowLayer[] }[];
  viewports: { name: string; value: string }[];
  zIndex: { name: string; value: number }[];
  containers: { name: string; value: string }[];
  durations: { name: string; value: string }[];
  easings: { name: string; value: string }[];
  pairs: PairEntry[];
  /** Kit tokens that nothing above reads, by their first two path segments. */
  unmapped: { group: string; count: number }[];
  /** How many tokens the kit holds (styles included), and how many of them are read. */
  counts: { kit: number; kitRead: number };
};

type Tok = TransformedToken & { original?: { $value?: unknown } };

const refName = (reference: unknown): string => {
  const match =
    typeof reference === "string" ? /^\{(.+)\}$/.exec(reference) : null;
  if (!match) throw new Error(`"${String(reference)}" is not a {reference}`);
  return match[1]!.split(".").at(-1)!;
};

export function buildModel(dictionary: Dictionary): Model {
  const map = dictionary.tokenMap as Map<string, Tok>;
  const errors: string[] = [];
  const read = new Set<string>();

  const token = (key: string): Tok => {
    const found = map.get(`{${key}}`);
    if (!found) throw new Error(`the token ${key} is missing`);
    read.add(key);
    return found;
  };
  const hex = (key: string): string => {
    const value = token(key).$value;
    if (typeof value !== "string" || !HEX.test(value))
      throw new Error(`${key} is "${String(value)}", not a #rrggbb(aa) colour`);
    return value;
  };
  const num = (key: string): number => {
    const value = token(key).$value;
    if (typeof value !== "number")
      throw new Error(`${key} is "${String(value)}", not a number`);
    return value;
  };
  const text = (key: string): string => {
    const value = token(key).$value;
    if (typeof value !== "string") throw new Error(`${key} is not a string`);
    return value;
  };
  const group = (prefix: string): { key: string; token: Tok }[] =>
    [...map.entries()]
      .map(([key, found]) => ({ key: key.slice(1, -1), token: found }))
      .filter((entry) => entry.key.startsWith(`${prefix}.`));

  // --- colours ---------------------------------------------------------------------------
  const isPrimitive = (key: string) =>
    key.startsWith("TailwindCSS - Colors.") || key.startsWith("primitive.");
  const primitiveName = (key: string) => key.split(".").at(-1)!.toLowerCase();

  /** Follows the aliases from `key` to the first palette or primitive token, if there is one. */
  const primitiveOf = (key: string): string | undefined => {
    let current: Tok | undefined = map.get(`{${key}}`);
    for (let hops = 0; current && hops < 20; hops++) {
      const original = current.original?.$value;
      if (typeof original !== "string" || !/^\{[^}]+\}$/.test(original))
        return undefined;
      const target = original.slice(1, -1);
      read.add(target);
      if (isPrimitive(target)) return target;
      current = map.get(original);
    }
    return undefined;
  };

  const semanticKeys = group("semantic").map((entry) => entry.key);
  const semanticNames = semanticKeys.map((key) =>
    key.slice("semantic.".length),
  );
  for (const name of [...CONTRACT, ...COMMERCE])
    if (!semanticNames.includes(name))
      errors.push(`semantic.${name} is missing from shopblok.tokens.json`);
  for (const name of SURFACES)
    if (!semanticNames.includes(`${name}-foreground`))
      errors.push(
        `semantic.${name}-foreground is missing from shopblok.tokens.json`,
      );

  const ordered = [
    ...CONTRACT.filter((name) => semanticNames.includes(name)),
    ...semanticNames.filter(
      (name) => !(CONTRACT as readonly string[]).includes(name),
    ),
  ];
  const emitted = new Map<string, Primitive>();
  const colors: ColorEntry[] = [];
  const kitOverrides = new Map<string, string>(); // css name -> the kit's colour
  for (const name of ordered) {
    const key = `semantic.${name}`;
    const found = token(key);
    const value = hex(key);
    const primitive = primitiveOf(key);
    const extension = (
      found.$extensions as
        Record<string, { kit?: string; reason?: string }> | undefined
    )?.["com.shopblok"];
    let override: Override | undefined;
    if (extension?.kit) {
      override = {
        kit: extension.kit,
        kitValue: hex(extension.kit),
        reason: extension.reason ?? "",
      };
      kitOverrides.set(name, override.kitValue);
    }
    if (primitive) {
      const css = primitiveName(primitive);
      const have = emitted.get(css);
      if (have && have.source !== primitive)
        errors.push(
          `two primitives are called --${css}: ${have.source} and ${primitive}`,
        );
      emitted.set(css, {
        name: css,
        value: hex(primitive),
        source: primitive,
        own: primitive.startsWith("primitive."),
      });
    }
    const original = (found as Tok).original?.$value;
    colors.push({
      name,
      value,
      ...(primitive ? { primitive: primitiveName(primitive) } : {}),
      source:
        typeof original === "string" && /^\{.+\}$/.test(original)
          ? original.slice(1, -1)
          : key,
      group: (CONTRACT as readonly string[]).includes(name)
        ? "contract"
        : "commerce",
      ...(override ? { override } : {}),
      ...(found.$description
        ? { description: String(found.$description) }
        : {}),
    });
  }
  const primitives = [...emitted.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { numeric: true }),
  );

  // --- radius ----------------------------------------------------------------------------
  const kitRadius: Record<string, number> = {};
  for (const entry of group("Shadcn.radius")) {
    read.add(entry.key);
    kitRadius[entry.key.slice("Shadcn.radius.".length)] = num(entry.key);
  }
  errors.push(...checkRadius(kitRadius));
  const radiusBase = kitRadius["lg"] ?? 0;
  const radius = {
    base: radiusBase,
    steps: Object.entries(RADIUS_OFFSETS).map(([step, offset]) => ({
      step,
      offset,
      px: radiusBase + offset,
    })),
  };

  // --- spacing ---------------------------------------------------------------------------
  const spacingEntries = SPACING_GROUPS.flatMap((name) =>
    group(`TailwindCSS.${name}`),
  ).map((entry) => {
    read.add(entry.key);
    return {
      key: entry.key,
      name: entry.key.split(".").at(-1)!,
      px: num(entry.key),
    };
  });
  const spacing = checkSpacing(spacingEntries);
  errors.push(...spacing.errors);
  if (num("TailwindCSS.spacing.s-1") !== SPACING_STEP_PX)
    errors.push(
      `spacing: s-1 is ${num("TailwindCSS.spacing.s-1")}px, not the ${SPACING_STEP_PX}px --spacing`,
    );

  // --- type ------------------------------------------------------------------------------
  const family = text("Shadcn.font.family.font-sans");
  const weights = group("Shadcn.font.weight").map((entry) => {
    read.add(entry.key);
    const kitName = entry.key.split(".").at(-1)!;
    const name = WEIGHT_NAMES[kitName];
    if (!name)
      throw new Error(
        `${entry.key}: no Tailwind name for the weight ${kitName}`,
      );
    return { name, value: num(entry.key) };
  });
  weights.sort((a, b) => a.value - b.value);
  const textSteps = [
    ...new Set(
      group("TailwindCSS.text").map((entry) => entry.key.split(".")[2]!),
    ),
  ];
  const textScale = textSteps
    .map((step) => ({
      step,
      sizePx: num(`TailwindCSS.text.${step}.font-size`),
      lineHeightPx: num(`TailwindCSS.text.${step}.line-height`),
    }))
    .sort((a, b) => a.sizePx - b.sizePx);

  // --- breakpoints, shadows ----------------------------------------------------------------
  const breakpoints = group("TailwindCSS.breakpoint")
    .map((entry) => ({
      name: entry.key.split(".").at(-1)!,
      px: num(entry.key),
    }))
    .sort((a, b) => a.px - b.px);
  const shadows = SHADOW_ORDER.map((name) => {
    const layers = token(`${EFFECT_STYLES}.shadow.${name}`).$value as {
      color: string;
      offsetX: string;
      offsetY: string;
      blur: string;
      spread: string;
    }[];
    const px = (value: string) => Number(value.replace(/px$/, ""));
    // Figma lists a style's layers bottom first; CSS lists the top one first.
    return {
      name,
      layers: [...layers].reverse().map((layer) => ({
        x: px(layer.offsetX),
        y: px(layer.offsetY),
        blur: px(layer.blur),
        spread: px(layer.spread),
        color: layer.color,
      })),
    };
  });

  // --- what the kit lacks (shopblok.tokens.json) -----------------------------------------
  const own = (prefix: string) =>
    group(prefix).map((entry) => ({
      name: entry.key.slice(prefix.length + 1),
      token: entry.token,
    }));
  const strings = (prefix: string) =>
    own(prefix).map(({ name, token: found }) => ({
      name,
      value: String(found.$value),
    }));

  // --- contrast --------------------------------------------------------------------------
  const valueOf = (name: string) =>
    colors.find((color) => color.name === name)!.value;
  const pairs: PairEntry[] = [];
  const failures: string[] = [];
  for (const kind of ["text", "ui"] as const) {
    for (const { key, token: found } of own(`contrast.${kind}`).map(
      (entry) => ({
        key: `contrast.${kind}.${entry.name}`,
        token: entry.token,
      }),
    )) {
      const resolved = found.$value as Record<string, unknown>;
      const written = (found as Tok).original?.$value as Record<
        string,
        unknown
      >;
      const side = (
        field: "foreground" | "background" | "over",
      ): Side | undefined => {
        if (written[field] === undefined) return undefined;
        const name = refName(written[field]);
        if (!semanticNames.includes(name))
          throw new Error(`${key}: ${name} is not a semantic token`);
        return { name, hex: String(resolved[field]) };
      };
      const foreground = side("foreground")!;
      const background = side("background")!;
      const over = side("over");
      const minimum = Number(resolved["minimum"]);
      const alpha =
        resolved["alpha"] === undefined ? 1 : Number(resolved["alpha"]);
      if (minimum !== (kind === "text" ? 4.5 : 3))
        errors.push(
          `${key}: a ${kind} pair needs ${kind === "text" ? 4.5 : 3}:1, it says ${minimum}`,
        );
      const spec: PairSpec = {
        id: key.slice("contrast.".length),
        foreground,
        background,
        ...(over ? { over } : {}),
        minimum,
        alpha,
      };
      const result = evaluatePair(spec);
      const entry: PairEntry = { ...result, kind };
      const touched = [foreground, background, over].some(
        (s) => s && kitOverrides.has(s.name),
      );
      if (touched) {
        const swap = (s: Side): Side => ({
          name: s.name,
          hex: kitOverrides.get(s.name) ?? valueOf(s.name),
        });
        const kit = evaluatePair({
          ...spec,
          foreground: swap(foreground),
          background: swap(background),
          ...(over ? { over: swap(over) } : {}),
        });
        entry.kit = { ratio: kit.ratio, passes: kit.passes };
      }
      pairs.push(entry);
      if (!result.passes) failures.push(describeFailure(result));
    }
  }
  if (pairs.length === 0)
    errors.push("shopblok.tokens.json declares no contrast pair");
  // Every override is a departure from the kit that the gate must be able to see: each one has
  // to sit in at least one declared pair.
  for (const color of colors)
    if (
      color.override &&
      !pairs.some((p) =>
        [p.foreground, p.background, p.over].some(
          (s) => s?.name === color.name,
        ),
      )
    )
      errors.push(
        `semantic.${color.name} overrides the kit and sits in no contrast pair`,
      );

  errors.push(...failures);
  if (errors.length > 0)
    throw new Error(
      `The token build found ${errors.length} problem(s):\n- ${errors.join("\n- ")}`,
    );

  // --- what is left ------------------------------------------------------------------------
  const zIndex = own("z-index").map(({ name, token: found }) => ({
    name,
    value: Number(found.$value),
  }));
  const leftover = new Map<string, number>();
  let kitTotal = 0;
  let kitRead = 0;
  for (const key of [...map.keys()].map((k) => k.slice(1, -1))) {
    if (
      key.startsWith("semantic.") ||
      key.startsWith("primitive.") ||
      key.startsWith("contrast.")
    )
      continue;
    if (
      ["viewport", "z-index", "container", "motion"].some((p) =>
        key.startsWith(`${p}.`),
      )
    )
      continue;
    kitTotal++;
    if (read.has(key)) kitRead++;
    else {
      const parts = key.split(".");
      const label =
        parts[0] === "TailwindCSS - Colors"
          ? parts[0]
          : parts.slice(0, 2).join(".");
      leftover.set(label, (leftover.get(label) ?? 0) + 1);
    }
  }

  return {
    colors,
    primitives,
    radius,
    spacing: {
      stepPx: SPACING_STEP_PX,
      checked: spacing.checked,
      full: spacing.full,
    },
    font: {
      family,
      variable: `--font-${family.toLowerCase().replace(/\s+/g, "-")}`,
    },
    weights,
    text: textScale,
    breakpoints,
    shadows,
    viewports: strings("viewport"),
    zIndex,
    containers: strings("container"),
    durations: strings("motion.duration"),
    easings: strings("motion.easing"),
    pairs,
    unmapped: [...leftover.entries()]
      .map(([name, count]) => ({ group: name, count }))
      .sort((a, b) => a.group.localeCompare(b.group, "en")),
    counts: { kit: kitTotal, kitRead },
  };
}
