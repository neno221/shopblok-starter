// M7 D136 (5), T109: Medusa's three CORS lists as Medusa reads them, and what a deployment's must
// not hold. Medusa 2.23 (`parseCorsOrigins`, `@medusajs/utils`) splits a value on commas and turns
// an entry written between slashes (or another of its delimiters) into a regular expression;
// anything else is an origin compared as a whole string. `cors-check.test.ts` checks this parser
// against Medusa's own on the same inputs.

/** One entry of a CORS list: an exact origin, or a pattern. */
export type CorsEntry = { kind: "origin"; value: string } | { kind: "pattern"; value: RegExp };

/** Medusa's delimiters for a pattern (`buildRegexpIfValid`): `/…/`, and the rarer ones. */
const PATTERN = /^([/~@;%#'])(.*?)\1([gimsuy]*)$/;

/** The list as Medusa 2.23 parses it (`parseCorsOrigins`). */
export function parseCors(value: string | undefined): CorsEntry[] {
  if (!value) return [];
  return value.split(",").map((entry): CorsEntry => {
    const match = PATTERN.exec(entry);
    if (match !== null) {
      try {
        new RegExp(match[2]!, match[3]);
        return { kind: "pattern", value: new RegExp(match[2]!, match[3]!.replace(/[gy]/g, "")) };
      } catch {
        // Not a valid expression: Medusa keeps the text as an origin.
      }
    }
    return { kind: "origin", value: entry };
  });
}

/** Whether a browser at `origin` passes the list (the `cors` package: exact string or `test`). */
export function corsAllows(entries: readonly CorsEntry[], origin: string): boolean {
  return entries.some((entry) =>
    entry.kind === "origin" ? entry.value === origin : entry.value.test(origin),
  );
}

/**
 * Whether a pattern holds the whole origin: `^` first, an unescaped `$` last, and no `|` outside a
 * group or a class (`/^a|b$/` is `^a` or `b$`, which match inside other origins).
 */
export function anchored(source: string): boolean {
  if (!source.startsWith("^") || !source.endsWith("$")) return false;
  let depth = 0;
  let inClass = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === "\\") {
      // An escaped character; an escaped `$` at the end is a literal, not the anchor.
      if (i === source.length - 2) return false;
      i += 1;
      continue;
    }
    if (inClass) {
      if (char === "]") inClass = false;
      continue;
    }
    if (char === "[") inClass = true;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "|" && depth === 0) return false;
  }
  return true;
}

/** Origins no deployment's list may let in, whatever its patterns say. */
const FOREIGN = [
  "https://example.com",
  "https://evil.vercel.app",
  "https://vercel.app",
  "http://localhost:8000",
  "null",
];

/**
 * What is wrong with one of a deployment's lists: an entry that is not an `https://` origin as a
 * browser sends it (no path, no trailing slash, no wildcard), a pattern that does not hold the whole
 * origin (`anchored`: Medusa tests it anywhere in the origin, so `/shop\.vercel\.app/` also lets
 * `https://shop.vercel.app.evil.com` in, and `/^a|evil\.com$/` any origin ending in evil.com), a blank entry (a stray comma), or a list that lets in a foreign origin.
 */
export function corsProblems(name: string, value: string | undefined): string[] {
  const entries = parseCors(value);
  if (entries.length === 0) return [`${name} is blank: the browser calls nothing on Medusa.`];
  const problems: string[] = [];
  for (const entry of entries) {
    if (entry.kind === "pattern") {
      const source = entry.value.source;
      if (!anchored(source))
        problems.push(
          `${name}: the pattern /${source}/ must hold the whole origin (^ first, $ last, no | outside a group), or it matches inside other origins.`,
        );
      continue;
    }
    const text = entry.value;
    if (text.trim() === "") {
      problems.push(`${name}: an empty entry (a stray comma).`);
      continue;
    }
    if (text !== text.trim())
      problems.push(`${name}: "${text}" has spaces, so no origin equals it.`);
    let url: URL | undefined;
    try {
      url = new URL(text.trim());
    } catch {
      url = undefined;
    }
    if (url === undefined || url.origin !== text.trim() || url.protocol !== "https:")
      problems.push(
        `${name}: "${text}" is not an https origin as a browser sends it (scheme and host, no path or trailing slash).`,
      );
  }
  const letIn = FOREIGN.filter((origin) => corsAllows(entries, origin));
  if (letIn.length > 0) problems.push(`${name} lets in ${letIn.join(", ")}.`);
  return problems;
}
