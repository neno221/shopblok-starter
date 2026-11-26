// M7 D138 (T106, step 1): the inventory behind `src/lib/security/csp.ts`'s hosts. `csp.ts` (the
// fixture) writes one JSON line per request in recording mode (`CSP_RECORD=<file>`); this turns the
// file into one row per route type: each foreign origin the shop's own documents asked for, by
// resource type, and each frame they opened. Run it with Node, which strips the types:
//
//   node e2e/support/csp-inventory.ts /tmp/csp.jsonl
//
// Pure apart from `main`, so `csp-inventory.test.ts` checks the summary.
import { readFileSync } from "node:fs";

export type RecordedRequest = {
  route: string;
  /** The origin, or `data:` / `blob:`. */
  origin: string;
  /** Playwright's resource type: `document`, `script`, `stylesheet`, `image`, `fetch`, … */
  type: string;
  /** A frame the shop's document opened (the parent's `frame-src`). */
  frame: boolean;
};

export type Violation = {
  directive: string;
  blocked: string;
  source?: string;
  line?: number;
  disposition: string;
  page: string;
  sample?: string;
};

const MARKET = /^[a-z]{2}$/;

/**
 * A page's route type, from its path: `home` for a market's root, else the first segment after the
 * market's prefix (`/us/products/x` and `/products/x` are both `products`; `/ch/fr/store` is
 * `store`), and `design-system`, `admin` and `next` as they are.
 */
export function routeType(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "design-system" || segments[0] === "admin" || segments[0] === "next") {
    return segments[0];
  }
  let rest = segments;
  if (rest[0] !== undefined && MARKET.test(rest[0])) rest = rest.slice(1);
  if (rest[0] !== undefined && MARKET.test(rest[0])) rest = rest.slice(1);
  return rest[0] ?? "home";
}

export type InventoryRow = {
  route: string;
  /** `type origin` for each foreign request, and `frame origin` for each frame. */
  foreign: string[];
  /** Same-origin resource types seen (`script`, `image`, …), and `data:`/`blob:` uses. */
  own: string[];
  violations: string[];
};

/** The rows for a recording, sorted by route; `site` is the shop's origin. */
export function summarize(text: string, site: string): InventoryRow[] {
  const rows = new Map<
    string,
    { foreign: Set<string>; own: Set<string>; violations: Set<string> }
  >();
  const row = (route: string) => {
    let entry = rows.get(route);
    if (entry === undefined) {
      entry = { foreign: new Set(), own: new Set(), violations: new Set() };
      rows.set(route, entry);
    }
    return entry;
  };
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const entry = JSON.parse(line) as Partial<RecordedRequest> & { violation?: string };
    if (typeof entry.route !== "string") continue;
    const target = row(entry.route);
    if (typeof entry.violation === "string") {
      target.violations.add(entry.violation);
      continue;
    }
    if (typeof entry.origin !== "string") continue;
    const kind = entry.frame === true ? "frame" : (entry.type ?? "other");
    if (entry.origin === site) target.own.add(kind);
    else if (entry.origin === "data:" || entry.origin === "blob:")
      target.own.add(`${kind} ${entry.origin}`);
    else target.foreign.add(`${kind} ${entry.origin}`);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, entry]) => ({
      route,
      foreign: [...entry.foreign].sort(),
      own: [...entry.own].sort(),
      violations: [...entry.violations].sort(),
    }));
}

/** The rows as a Markdown table. */
export function table(rows: InventoryRow[]): string {
  const cell = (values: string[]) => (values.length === 0 ? "none" : values.join(", "));
  return [
    "| Route type | Foreign origins | Same origin | Violations |",
    "|---|---|---|---|",
    ...rows.map(
      (r) => `| \`${r.route}\` | ${cell(r.foreign)} | ${cell(r.own)} | ${cell(r.violations)} |`,
    ),
  ].join("\n");
}

function main(argv: string[]): void {
  const [file, site = "http://localhost:8000"] = argv;
  if (file === undefined) {
    console.error("usage: node e2e/support/csp-inventory.ts <recording.jsonl> [site origin]");
    process.exit(2);
  }
  console.log(table(summarize(readFileSync(file, "utf8"), site)));
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
