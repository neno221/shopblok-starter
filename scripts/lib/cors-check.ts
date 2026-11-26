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
 * browser sends it (no path, no trailing slash, no wildcard), a pattern without `^…$` (Medusa tests
 * it anywhere in the origin, so `/shop\.vercel\.app/` also lets `https://shop.vercel.app.evil.com`
 * in), a blank entry (a stray comma), or a list that lets in a foreign origin.
 */
export function corsProblems(name: string, value: string | undefined): string[] {
  const entries = parseCors(value);
  if (entries.length === 0) return [`${name} is blank: the browser calls nothing on Medusa.`];
  const problems: string[] = [];
  for (const entry of entries) {
    if (entry.kind === "pattern") {
      const source = entry.value.source;
      if (!source.startsWith("^") || !source.endsWith("$"))
        problems.push(
          `${name}: the pattern /${source}/ needs ^ and $, or it matches inside other origins.`,
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
