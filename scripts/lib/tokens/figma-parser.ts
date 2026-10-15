// The parser for `figma.tokens.json` (M1 plan, T19 step 1; D25, D26); `build.ts` runs it and hands
// Style Dictionary its result as `tokens`, not as a source path. It turns
// the normalised export of the Figma kit into design tokens in the DTCG layout: `$value`, `$type`
// and `{reference}`s, with the collection's name as the first segment of every path and each "/"
// of a variable's name as one more. Light mode only (SPEC §9): the mode named "Light" if the
// collection has one, else its default mode. Colours stay `#rrggbb(aa)` strings, as the kit holds
// them (D27); the DTCG 2025.10 colour objects are not used (D26).
//
// What T18 found in the file (SETUP.md, "Figma export (T18)"):
// - The `shadow/*` effect styles bind to variables the kit no longer lists (`"unlisted": true`).
//   A style's tokens therefore hold the style's own values and no reference at all.
// - Three text-style names appear twice. A style is never keyed by its name alone: the second
//   one gets " (2)" and a test counts the styles in and the tokens out.
// - An alias that points nowhere is left as a reference, so that Style Dictionary fails the
//   build naming the token (its `brokenReferences` is `throw`); the parser fails on its own for
//   what it can see, such as a collection that doesn't exist.
import type { DesignToken, DesignTokens } from "style-dictionary/types";

type FigmaAlias = { alias: string; remote?: boolean; unlisted?: boolean };
type FigmaValue = string | number | boolean | FigmaAlias;
type FigmaVariable = {
  name: string;
  type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  description?: string;
  values: Record<string, FigmaValue>;
};
type FigmaCollection = {
  name: string;
  modes: string[];
  defaultMode: string;
  variables: FigmaVariable[];
};
type FigmaEffect = {
  type: string;
  color?: string;
  offset?: { x: number; y: number };
  radius: number;
  spread?: number;
  visible: boolean;
};
type FigmaFile = {
  collections: FigmaCollection[];
  styles?: {
    text?: {
      name: string;
      fontFamily: string;
      fontStyle: string;
      fontSize: number;
      lineHeight: { unit: string; value?: number };
      letterSpacing: { unit: string; value: number };
      description?: string;
    }[];
    effect?: { name: string; effects: FigmaEffect[]; description?: string }[];
  };
};

/** The groups the styles go in. Not collection names, so they can't collide with a variable. */
export const TEXT_STYLES = "Text styles";
export const EFFECT_STYLES = "Effect styles";

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
const WEIGHTS: Record<string, number> = {
  Regular: 400,
  Medium: 500,
  "Semi Bold": 600,
  Bold: 700,
};

function isAlias(value: unknown): value is FigmaAlias {
  return typeof value === "object" && value !== null && "alias" in value;
}

/** Puts `token` at `segments` below `root`; a name that is a token and a group at once is an error. */
function place(
  root: DesignTokens,
  segments: string[],
  token: DesignToken,
  label: string,
): void {
  let node = root as Record<string, unknown>;
  for (const [index, segment] of segments.entries()) {
    const last = index === segments.length - 1;
    const existing = node[segment];
    if (last) {
      if (existing !== undefined) throw new Error(`${label} is named twice`);
      node[segment] = token;
    } else if (existing === undefined) {
      const group: Record<string, unknown> = {};
      node[segment] = group;
      node = group;
    } else if (
      typeof existing === "object" &&
      existing !== null &&
      !("$value" in existing)
    ) {
      node = existing as Record<string, unknown>;
    } else {
      throw new Error(
        `${label} sits inside the variable ${segments.slice(0, index + 1).join("/")}`,
      );
    }
  }
}

function dtcgType(variable: FigmaVariable, collection: string): string {
  switch (variable.type) {
    case "COLOR":
      return "color";
    case "FLOAT":
      return "number";
    case "STRING":
      return variable.name.startsWith("font/family/") ? "fontFamily" : "string";
    default:
      throw new Error(
        `${collection}/${variable.name}: unsupported type ${variable.type}`,
      );
  }
}

function pickMode(collection: FigmaCollection): string {
  if (collection.modes.includes("Light")) return "Light";
  if (!collection.modes.includes(collection.defaultMode))
    throw new Error(
      `${collection.name}: the default mode ${collection.defaultMode} isn't a mode`,
    );
  return collection.defaultMode;
}

/** `Collection/a/b` as `{Collection.a.b}`; the collection is the longest name that starts it. */
function toReference(
  alias: string,
  collections: readonly string[],
  from: string,
): string {
  const owner = collections
    .filter((name) => alias.startsWith(`${name}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (owner === undefined)
    throw new Error(
      `${from}: the alias "${alias}" names no collection of this file`,
    );
  return `{${[owner, ...alias.slice(owner.length + 1).split("/")].join(".")}}`;
}

function px(value: number): string {
  return `${value}px`;
}

/**
 * A text style. Nothing reads these (the type scale comes from the `TailwindCSS/text/*`
 * variables, and `tokens.css` and `tokens.ts` hold no style), so a unit or a weight this parser
 * doesn't know is recorded as the kit writes it, never an error: a new style in Figma must not
 * stop a token build it has no part in. The effect styles and the variables do feed the
 * output, and they still fail on what they can't read.
 */
function parseText(
  style: NonNullable<NonNullable<FigmaFile["styles"]>["text"]>[number],
): DesignToken {
  const weight = WEIGHTS[style.fontStyle] ?? style.fontStyle;
  const { unit, value } = style.lineHeight;
  const lineHeight =
    unit === "PIXELS"
      ? px(value ?? 0)
      : unit === "PERCENT"
        ? `${value ?? 100}%`
        : unit === "AUTO"
          ? "normal"
          : `${value ?? ""} ${unit}`.trim();
  const spacing = style.letterSpacing;
  const letterSpacing =
    spacing.unit === "PERCENT"
      ? `${spacing.value}%`
      : spacing.unit === "PIXELS"
        ? px(spacing.value)
        : `${spacing.value ?? ""} ${spacing.unit}`.trim();
  return {
    $type: "typography",
    $value: {
      fontFamily: style.fontFamily,
      fontSize: px(style.fontSize),
      fontWeight: weight,
      letterSpacing,
      lineHeight,
    },
    ...(style.description ? { $description: style.description } : {}),
  };
}

function parseEffect(
  style: NonNullable<NonNullable<FigmaFile["styles"]>["effect"]>[number],
): DesignToken {
  const layers = style.effects.filter((effect) => effect.visible);
  const shadows = layers.filter((effect) => effect.type === "DROP_SHADOW");
  const blurs = layers.filter((effect) => effect.type === "BACKGROUND_BLUR");
  if (shadows.length + blurs.length !== layers.length)
    throw new Error(
      `${style.name}: an effect that is neither a drop shadow nor a background blur`,
    );
  if (shadows.length > 0 && blurs.length > 0)
    throw new Error(`${style.name}: shadows and a blur in one style`);
  const description = style.description
    ? { $description: style.description }
    : {};
  if (blurs.length > 0) {
    if (blurs.length > 1) throw new Error(`${style.name}: more than one blur`);
    return { $type: "dimension", $value: px(blurs[0]!.radius), ...description };
  }
  return {
    $type: "shadow",
    $value: shadows.map((effect) => {
      if (
        effect.color === undefined ||
        !HEX.test(effect.color) ||
        !effect.offset
      )
        throw new Error(
          `${style.name}: a shadow without a #rrggbb(aa) colour or an offset`,
        );
      return {
        color: effect.color,
        offsetX: px(effect.offset.x),
        offsetY: px(effect.offset.y),
        blur: px(effect.radius),
        spread: px(effect.spread ?? 0),
      };
    }),
    ...description,
  };
}

/** The text of `figma.tokens.json` in, DTCG tokens out. */
export function parseFigmaTokens(contents: string): DesignTokens {
  const file = JSON.parse(contents) as FigmaFile;
  const names = file.collections.map((collection) => collection.name);
  const root: DesignTokens = {};

  for (const collection of file.collections) {
    const mode = pickMode(collection);
    for (const variable of collection.variables) {
      const label = `${collection.name}/${variable.name}`;
      const value = variable.values[mode];
      if (value === undefined)
        throw new Error(`${label} has no value in the mode ${mode}`);
      let dtcgValue: string | number | boolean;
      if (isAlias(value)) dtcgValue = toReference(value.alias, names, label);
      else if (variable.type === "COLOR") {
        if (typeof value !== "string" || !HEX.test(value))
          throw new Error(
            `${label}: "${String(value)}" is not a lowercase #rrggbb(aa) colour`,
          );
        dtcgValue = value;
      } else dtcgValue = value;
      place(
        root,
        [collection.name, ...variable.name.split("/")],
        {
          $type: dtcgType(variable, collection.name),
          $value: dtcgValue,
          ...(variable.description
            ? { $description: variable.description }
            : {}),
        },
        label,
      );
    }
  }

  /** A name used before gets " (2)", " (3)"…: no style is dropped, none is overwritten. */
  const uniqueIn = (seen: Set<string>, name: string): string => {
    let candidate = name;
    for (let copy = 2; seen.has(candidate); copy++)
      candidate = `${name} (${copy})`;
    seen.add(candidate);
    return candidate;
  };
  const textNames = new Set<string>();
  for (const style of file.styles?.text ?? []) {
    const name = uniqueIn(textNames, style.name);
    place(
      root,
      [TEXT_STYLES, ...name.split("/")],
      parseText(style),
      `${TEXT_STYLES}/${name}`,
    );
  }
  const effectNames = new Set<string>();
  for (const style of file.styles?.effect ?? []) {
    const name = uniqueIn(effectNames, style.name);
    place(
      root,
      [EFFECT_STYLES, ...name.split("/")],
      parseEffect(style),
      `${EFFECT_STYLES}/${name}`,
    );
  }
  return root;
}
