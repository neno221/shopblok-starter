// The first-load JS budget (M3 plan, D67 item 4; T42; SPEC §13: "First-load JS (PLP/PDP) ≤ 170 KB gz").
// Run after a production build, from this package: `pnpm check:first-load`
// (`node scripts/first-load.ts`; Node 22.18 and newer run the file as it is).
//
// Where the numbers come from: with Turbopack, Next 16.4 prints no First Load JS column, and writes
// `.next/diagnostics/route-bundle-stats.json` after the build instead (`writeRouteBundleStats` in
// `next/dist/build/route-bundle-stats.js`): an array with a row per page route,
// `{ route, firstLoadUncompressedJsBytes, firstLoadChunkPaths }`. The chunk paths are relative to
// this package and include the shared chunks (`rootMainFiles`) and the chunks of every layout above
// the page. The row's own byte count is uncompressed; this script gzips each chunk file and sums
// the sizes, which is what a visitor's first load transfers.
//
// What fails (exit 1): a budgeted route over its budget; a budgeted route whose `page.tsx` exists
// under `src/app` and which has no row (so a change of the file's format cannot pass silently); a
// stats file that is missing or not in the shape above; a chunk file the stats name that is not on
// disk (a size that is too small must not pass). A budgeted route with no page yet is said, not
// failed. The table of every route is always printed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/** One kilobyte, as Lighthouse counts it (KiB). */
export const KB = 1024;

export type Budget = {
  /** The route as Next names it in the stats file: route groups removed (`/[market]/products/[handle]`). */
  route: string;
  /** What the route is, for the messages. */
  label: string;
  /** Gzipped, in KB (1024 bytes). A route at exactly this size passes. */
  maxKB: number;
};

/**
 * The budgeted routes. Every other route is printed and not judged. T49 adds the PDP's page and T50
 * the PLP's; until a route has a `page.tsx` its budget is not checked. Change a budget here; a
 * one-off value for an experiment goes on the command line (`--budget "/[market]=1"`).
 */
export const budgets: readonly Budget[] = [
  { route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 },
  { route: "/[market]/categories/[...handle]", label: "PLP", maxKB: 170 },
];

export type StatsRow = {
  route: string;
  firstLoadUncompressedJsBytes: number;
  firstLoadChunkPaths: string[];
};

/** The stats file's content, checked against the shape this script reads. */
export function parseStats(json: unknown): StatsRow[] {
  if (!Array.isArray(json)) {
    throw new Error("expected an array of rows, one per route.");
  }
  if (json.length === 0) {
    throw new Error("the array has no rows: Next wrote no route.");
  }
  return json.map((row: unknown, index): StatsRow => {
    const at = `row ${index}`;
    if (typeof row !== "object" || row === null) throw new Error(`${at} is not an object.`);
    const { route, firstLoadUncompressedJsBytes, firstLoadChunkPaths } = row as Record<
      string,
      unknown
    >;
    if (typeof route !== "string" || route === "") {
      throw new Error(`${at} has no \`route\` string.`);
    }
    if (typeof firstLoadUncompressedJsBytes !== "number") {
      throw new Error(`${at} (${route}) has no \`firstLoadUncompressedJsBytes\` number.`);
    }
    if (
      !Array.isArray(firstLoadChunkPaths) ||
      firstLoadChunkPaths.some((chunk) => typeof chunk !== "string")
    ) {
      throw new Error(`${at} (${route}) has no \`firstLoadChunkPaths\` array of strings.`);
    }
    return {
      route,
      firstLoadUncompressedJsBytes,
      firstLoadChunkPaths: firstLoadChunkPaths,
    };
  });
}

/** Gzipped size of a file's bytes (zlib's default level, as a server compresses on the fly). */
export function gzipBytes(content: Uint8Array): number {
  return gzipSync(content).length;
}

export type Measured = {
  route: string;
  /** What Next counted: the sum of the chunk files, uncompressed. */
  rawBytes: number;
  /** The sum of each chunk file gzipped on its own. */
  gzipBytes: number;
  chunks: number;
  /** Chunk files the stats name and the disk lacks. */
  missing: string[];
};

/**
 * Gzips the chunks of each row. `root` is the folder the chunk paths are relative to (this
 * package). A chunk shared by several routes is read once. `gzipOf` is a seam for the tests.
 */
export function measure(
  rows: readonly StatsRow[],
  root: string,
  gzipOf: (file: string) => number | undefined = (file) => {
    try {
      return gzipBytes(readFileSync(file));
    } catch {
      return undefined;
    }
  },
): Measured[] {
  const cache = new Map<string, number | undefined>();
  const sizeOf = (chunk: string): number | undefined => {
    if (!cache.has(chunk)) cache.set(chunk, gzipOf(path.resolve(root, chunk)));
    return cache.get(chunk);
  };
  return rows.map((row) => {
    let total = 0;
    const missing: string[] = [];
    for (const chunk of row.firstLoadChunkPaths) {
      const size = sizeOf(chunk);
      if (size === undefined) missing.push(chunk);
      else total += size;
    }
    return {
      route: row.route,
      rawBytes: row.firstLoadUncompressedJsBytes,
      gzipBytes: total,
      chunks: row.firstLoadChunkPaths.length,
      missing,
    };
  });
}

/**
 * The route a page file serves, as Next names it in the stats file: the folder's path below
 * `src/app`, without route groups (`(storefront)`) and parallel-route slots (`@modal`).
 * `undefined` for a folder Next does not route (`_private`).
 */
export function routeOfFolder(folder: string): string | undefined {
  const segments = folder.split("/").filter((segment) => segment !== "" && segment !== ".");
  if (segments.some((segment) => segment.startsWith("_"))) return undefined;
  const routed = segments.filter(
    (segment) => !/^\(.+\)$/.test(segment) && !segment.startsWith("@"),
  );
  return `/${routed.join("/")}`;
}

const pageFile = /^page\.(?:tsx|ts|jsx|js|mdx)$/;

/** The routes that have a `page` file under `appDir` (a missing folder has none). */
export function pageRoutes(appDir: string): Set<string> {
  const routes = new Set<string>();
  const walk = (folder: string): void => {
    for (const entry of readdirSync(path.join(appDir, folder), {
      withFileTypes: true,
    })) {
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path.posix.join(folder, entry.name));
      } else if (entry.isFile() && pageFile.test(entry.name)) {
        const route = routeOfFolder(folder);
        if (route !== undefined) routes.add(route);
      }
    }
  };
  if (existsSync(appDir)) walk(".");
  return routes;
}

export type Report = {
  /** The table, one line each, header first. */
  table: string[];
  /** What failed. Empty means the check passed. */
  failures: string[];
  /** What was said and did not fail. */
  notes: string[];
};

const kb = (bytes: number): string => (bytes / KB).toFixed(1);

/**
 * Judges the measured routes. `pages` are the routes that have a page file, which decides whether a
 * budgeted route without a row is a failure (the format changed) or only not built yet.
 */
export function evaluate(
  measured: readonly Measured[],
  budgetList: readonly Budget[],
  pages: ReadonlySet<string>,
): Report {
  const failures: string[] = [];
  const notes: string[] = [];
  const budgetOf = new Map(budgetList.map((budget) => [budget.route, budget]));
  const lines: string[][] = [["route", "chunks", "raw KB", "gzip KB", "budget KB", "result"]];

  for (const row of [...measured].sort((a, b) => b.gzipBytes - a.gzipBytes)) {
    const budget = budgetOf.get(row.route);
    let result = "not budgeted";
    if (row.missing.length > 0) {
      result = `${row.missing.length} chunk file(s) missing`;
      failures.push(
        `${row.route}: the stats name ${row.missing.length} chunk file(s) that are not on disk (${row.missing.slice(0, 3).join(", ")}${row.missing.length > 3 ? ", …" : ""}), so its size is too small. Run the build again.`,
      );
    } else if (budget !== undefined) {
      if (row.gzipBytes > budget.maxKB * KB) {
        result = "OVER";
        failures.push(
          `${row.route} (${budget.label}): ${kb(row.gzipBytes)} KB gzipped, over its ${budget.maxKB} KB budget by ${kb(row.gzipBytes - budget.maxKB * KB)} KB.`,
        );
      } else {
        result = "ok";
      }
    }
    lines.push([
      row.route,
      String(row.chunks),
      kb(row.rawBytes),
      kb(row.gzipBytes),
      budget === undefined ? "-" : String(budget.maxKB),
      result,
    ]);
  }

  const rowRoutes = new Set(measured.map((row) => row.route));
  for (const budget of budgetList) {
    if (rowRoutes.has(budget.route)) continue;
    if (pages.has(budget.route)) {
      lines.push([budget.route, "-", "-", "-", String(budget.maxKB), "NO ROW"]);
      failures.push(
        `${budget.route} (${budget.label}) has a page under src/app and no row in route-bundle-stats.json: the file's format may have changed, or the build skipped the route. Not passing without a size.`,
      );
    } else {
      lines.push([budget.route, "-", "-", "-", String(budget.maxKB), "no page yet"]);
      notes.push(
        `${budget.route} (${budget.label}): no page.tsx under src/app yet, so its ${budget.maxKB} KB budget is not checked.`,
      );
    }
  }

  const widths = lines[0]!.map((_, column) =>
    Math.max(...lines.map((line) => line[column]!.length)),
  );
  const table = lines.map((line) =>
    line
      .map((cell, column) =>
        column === 0 ? cell.padEnd(widths[column]!) : cell.padStart(widths[column]!),
      )
      .join("  ")
      .trimEnd(),
  );
  return { table, failures, notes };
}

/** `--budget "<route>=<KB>"`, repeatable: the budget for that route in this run only. */
export function parseArgs(argv: readonly string[]): { overrides: Budget[] } | { usage: string } {
  const overrides: Budget[] = [];
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag !== "--budget") return { usage: `unknown argument '${flag}'.` };
    const value = argv[++index];
    const cut = value?.lastIndexOf("=") ?? -1;
    const route = value?.slice(0, cut);
    const limit = Number(value?.slice(cut + 1));
    if (value === undefined || cut < 1 || !route?.startsWith("/") || !(limit > 0)) {
      return {
        usage: `--budget needs <route>=<KB>, for example --budget "/[market]=1" (got '${value ?? ""}').`,
      };
    }
    overrides.push({ route, label: "overridden", maxKB: limit });
  }
  return { overrides };
}

/** The budgets with the run's overrides: an override replaces the table's row for its route. */
export function withOverrides(table: readonly Budget[], overrides: readonly Budget[]): Budget[] {
  const replaced = new Set(overrides.map((budget) => budget.route));
  return [...table.filter((budget) => !replaced.has(budget.route)), ...overrides];
}

export const statsFile = ".next/diagnostics/route-bundle-stats.json";
const usageText = "usage: node scripts/first-load.ts [--budget <route>=<KB>]...";

/**
 * Runs the check for the package at `root`. Returns the exit code: 0 passed, 1 failed, 2 usage.
 * `print` and `fail` are the output (stdout and stderr in the CLI).
 */
export function run(
  argv: readonly string[],
  root: string,
  print: (line: string) => void,
  fail: (line: string) => void,
  tableBudgets: readonly Budget[] = budgets,
): number {
  const args = parseArgs(argv);
  if ("usage" in args) {
    fail(`first-load: ${args.usage}\n${usageText}`);
    return 2;
  }
  const file = path.join(root, statsFile);
  let rows: StatsRow[];
  try {
    rows = parseStats(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    fail(
      `first-load: cannot use ${statsFile}: ${reason}\nRun \`pnpm build\` first. Next 16.4 writes the file after a Turbopack build; a build with another bundler, or another Next, may not.`,
    );
    return 1;
  }
  const budgetList = withOverrides(tableBudgets, args.overrides);
  const report = evaluate(
    measure(rows, root),
    budgetList,
    pageRoutes(path.join(root, "src", "app")),
  );
  print("First-load JS per route, each chunk gzipped on its own and summed (SPEC §13):");
  for (const line of report.table) print(line);
  for (const note of report.notes) print(note);
  if (report.failures.length > 0) {
    for (const failure of report.failures) fail(`first-load: ${failure}`);
    return 1;
  }
  print("first-load: no route is over its budget.");
  return 0;
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(import.meta.dirname, "..");
  const github = process.env["GITHUB_ACTIONS"] === "true";
  process.exitCode = run(
    process.argv.slice(2),
    root,
    (line) => console.log(line),
    (line) => console.error(github ? `::error::${line.replaceAll("\n", "%0A")}` : line),
  );
}
