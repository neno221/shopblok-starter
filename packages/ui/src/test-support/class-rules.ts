// The rules every file in src/atoms/ keeps (plan T21 step 5; SETUP.md, "shadcn and ReUI (T21)"),
// checked on the class names in its string literals:
// - logical, not physical, directions (`ps-`, `me-`, `start-`, `text-end`…), so a right-to-left
//   market needs no second set of classes;
// - colours from the tokens only: no hex, no colour function, no Tailwind palette colour, no named
//   colour in an arbitrary value;
// - light only (D27): no `dark:` variant, which in Tailwind v4 follows the reader's OS setting;
// - the focus ring at full strength (D35, SETUP.md "Tokens (T19)", Overrides item 2): `ring-ring`,
//   never `ring-ring/50`.

export type Violation = { rule: string; token: string };

const PHYSICAL = [
  /^(?:scroll-)?[pm][lr]-/,
  /^(?:left|right)-/,
  /^text-(?:left|right)$/,
  /^rounded-(?:l|r|tl|tr|bl|br)(?:-|$)/,
  /^border-[lr](?:-|$)/,
  /^(?:slide-in-from|slide-out-to)-(?:left|right)(?:-|$)/,
  /^(?:float|clear)-(?:left|right)$/,
];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOUR_UTILITY =
  "bg|text|border(?:-[xytrblse])?|ring|ring-offset|outline|fill|stroke|from|via|to|shadow|inset-shadow|drop-shadow|decoration|accent|caret|divide|placeholder";
const PALETTE_CLASS = new RegExp(
  `^(?:${COLOUR_UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?:/|$)`,
);
// An arbitrary value that starts with a letter is a keyword (`Canvas`, `red`), not a length.
const NAMED_ARBITRARY = new RegExp(
  `^(?:${COLOUR_UTILITY})-\\[(?!var\\(|color-mix\\(|length:|calc\\()[a-zA-Z]`,
);
const HEX = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/;
const COLOUR_FUNCTION = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/;

/** Removes comments, so a comment that names a rule (`dark:`, "Loading") is not read as code. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

/** The contents of every string literal ("…", '…' and `…` without `${}`). */
function stringLiterals(source: string): string[] {
  return [...stripComments(source).matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`$]*)`/g)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? "",
  );
}

/** A class split into its variants (`md`, `hover`, `data-[side=top]`) and its utility, without `!`
 * and the negative sign. */
export function splitClass(token: string): { variants: string[]; utility: string } {
  let depth = 0;
  let lastColon = -1;
  for (let index = 0; index < token.length; index++) {
    const char = token[index];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === ":" && depth === 0) lastColon = index;
  }
  const variants = lastColon === -1 ? [] : splitVariants(token.slice(0, lastColon));
  const utility = token
    .slice(lastColon + 1)
    .replace(/^!|!$/g, "")
    .replace(/^-/, "");
  return { variants, utility };
}

function splitVariants(prefix: string): string[] {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < prefix.length; index++) {
    const char = prefix[index];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === ":" && depth === 0) {
      variants.push(prefix.slice(start, index));
      start = index + 1;
    }
  }
  variants.push(prefix.slice(start));
  return variants;
}

export function findViolations(source: string): Violation[] {
  const found: Violation[] = [];
  for (const literal of stringLiterals(source)) {
    if (HEX.test(literal) || COLOUR_FUNCTION.test(literal)) {
      found.push({ rule: "colour literal", token: literal });
    }
    for (const token of literal.split(/\s+/).filter(Boolean)) {
      const { variants, utility } = splitClass(token);
      if (PHYSICAL.some((rule) => rule.test(utility))) {
        found.push({ rule: "physical direction", token });
      }
      if (PALETTE_CLASS.test(utility) || NAMED_ARBITRARY.test(utility)) {
        found.push({ rule: "colour literal", token });
      }
      if (variants.includes("dark")) {
        found.push({ rule: "dark variant", token });
      }
      if (/^ring-ring\/\d/.test(utility)) {
        found.push({ rule: "ring alpha", token });
      }
    }
  }
  return found;
}
