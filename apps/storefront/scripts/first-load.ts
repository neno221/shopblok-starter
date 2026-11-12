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
// Which routes have a page comes from Next as well: `.next/app-path-routes-manifest.json`, written by
// the same build, maps each app path (`/(storefront)/[market]/products/[handle]/page`) to the route it
// serves (`/[market]/products/[handle]`) with the `normalizeAppPath` that names the stats file's rows
// (`build/index.js`, `build/route-bundle-stats.js`), so the two cannot disagree about a route group, a
// slot or any other kind of folder (PR 69 review, item 6). Route handlers end in `/route` there.
//
// What is kept out (D102, T79): the modules in `keptOut` (a variant's island, the live preview's
// listener) are loaded by `next/dynamic` inside a client component, so their chunk is fetched when
// they render and is no route's first load. Turbopack's production chunks name no module, so a row
// names a string literal of its module that minifying keeps and no other source has (a `data-slot`
// of its own); the chunks under `.next/static/chunks/` that hold it are the module's. The check
// prints each such chunk with its gzipped size.
//
// What fails (exit 1): a kept-out module whose chunk is in a shop route's `firstLoadChunkPaths` (it
// was imported statically, or `dynamic()` was called in a server component; the design system's
// routes draw every member at once and are not judged, `shopRoute`), or whose marker is in no
// chunk (the row is stale); a budgeted route over its budget; a budgeted route that has a page in the
// manifest and no row in the stats (so a change of the stats file's format cannot pass silently); a
// stats file or manifest that is missing or not in the shape above; a chunk file the stats name that
// is not on disk (a size that is too small must not pass). A budgeted route Next built no page for
// yet is said, not failed. The table of every route is always printed.
import { readdirSync, readFileSync } from "node:fs";
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
 * the listing pages'; until Next builds a page for a route its budget is not checked. Change a
 * budget here; a one-off value for an experiment goes on the command line
 * (`--budget "/[market]=1"`).
 *
 * The PLP is three routes (D58: store, categories, collections). The
 * pagination is a path segment (D59), and T50 step 1 says how each route takes it: the category
 * route is a catch-all that parses a trailing `page/{n}`, so `/categories/dresses/page/2` is the one
 * row below; `store/page/[n]` and `collections/[handle]/page/[n]` are explicit routes, which Next
 * names as their own rows. The keys are the ones Next writes for those folders. If T50 builds them
 * another way (an optional catch-all, say), its page will be under another key and these rows will
 * only say "no page yet": T50 changes the table.
 */
export const budgets: readonly Budget[] = [
  // Steven's decisions on PR 77 (T49), in T50 and in T52: the shell's layout alone is ~293 KB, so
  // SPEC §13's 170 KB cannot hold; the PDP measured 322.9 KB and the listing pages 318.6 KB (330 KB
  // each), then the header's cart drawer and quick cart (T52) brought them to 332.4 and 331.5 KB,
  // and both have 335 KB. T83: the listings have 336 KB (Steven, 2026-11-07), for the quick view's
  // opener on their cards (D101, D102), the dialog itself kept out. M6 D129 (approved with M6's
  // scope, 2026-11-11): 337 and 338 KB, for what M6 puts in every first load; T96 took the first
  // 433 bytes (the root `global-error.tsx`, which every page loads; Sentry's queue only with a DSN).
  { route: "/[market]/products/[handle]", label: "PDP", maxKB: 337 },
  {
    route: "/[market]/categories/[...handle]",
    label: "PLP, categories",
    maxKB: 338,
  },
  { route: "/[market]/store", label: "PLP, store", maxKB: 338 },
  { route: "/[market]/store/page/[n]", label: "PLP, store page n", maxKB: 338 },
  {
    route: "/[market]/collections/[handle]",
    label: "PLP, collections",
    maxKB: 338,
  },
  {
    route: "/[market]/collections/[handle]/page/[n]",
    label: "PLP, collections page n",
    maxKB: 338,
  },
];

export type KeptOut = {
  /** The module, as a path from this package (`src/components/cms/live-preview-listener.tsx`). */
  module: string;
  /**
   * A string literal of the module's own code that minifying keeps and no other source of the
   * workspace has (`first-load.test.ts` checks both): the chunks that hold it are the module's.
   */
  marker: string;
  /** What the module is, for the messages. */
  label: string;
  /**
   * The build variable without which the module is not built at all (T96: Sentry's browser SDK
   * exists only in a build with `NEXT_PUBLIC_SENTRY_DSN`). A module the build holds is checked as
   * any other; one it does not hold is "not built" when this run lacks the variable too, and a
   * failure when the run has it (the marker changed).
   */
  onlyWith?: string;
};

/**
 * The modules no route may load at first (D102): each variant's island, loaded by `lazyIsland`,
 * `next/dynamic` in a client component, `React.lazy` or `import()`, as SETUP.md "How to add a
 * variant (M5)", step 4, says. A variant task adds its island here; the live preview's listener
 * (D74) is the first row, loaded by `next/dynamic` since T61.
 */
export const keptOut: readonly KeptOut[] = [
  {
    module: "src/components/cms/live-preview-listener.tsx",
    marker: "shopblok:live-preview-listener",
    label: "live preview's listener (D74)",
  },
  {
    // T80: the `collection-switcher` hero's tabs, loaded by its island's `next/dynamic`.
    module: "../../packages/ui/src/sections/hero/collection-tabs.tsx",
    marker: "shopblok:hero-collection-tabs",
    label: "the collection switcher hero's tabs (T80)",
  },
  {
    // T81: the `tabs` product collection's tabs, loaded by its island's `next/dynamic`.
    module: "../../packages/ui/src/sections/product-collection/tabs-panels.tsx",
    marker: "shopblok:product-collection-tabs",
    label: "the tabs product collection's tabs (T81)",
  },
  {
    // T82: the promo banner's popup card, loaded by its island's `next/dynamic`.
    module: "src/components/cms/promo-popup-card.tsx",
    marker: "shopblok:promo-popup-card",
    label: "the promo banner's popup card (T82)",
  },
  // T84: the listing's filter layouts other than M3's, which the listing island loads on their
  // branch (`src/components/listing/listing-layouts.tsx`, `React.lazy`).
  ...(
    [
      ["top-bar", "top bar"],
      ["drawer", "drawer"],
      ["accordion", "accordion"],
      ["chips", "chips"],
      ["rail", "rail"],
      ["inline", "inline"],
    ] as const
  ).map(([layout, name]) => ({
    module: `../../packages/ui/src/templates/listing-layouts/${layout}.tsx`,
    marker: `shopblok:listing-${layout}`,
    label: `the listing's ${name} layout (T84)`,
  })),
  // T83: the quick view, which the listing's opener loads on a card's first press
  // (`src/components/listing/quick-view-opener.tsx`, `import()`), and its three members.
  {
    module: "src/components/listing/quick-view-island.tsx",
    marker: "shopblok:quick-view-island",
    label: "the quick view's island (T83)",
  },
  ...(["default", "drawer", "compact"] as const).map((member) => ({
    module: `../../packages/ui/src/organisms/quick-view/${member}.tsx`,
    marker: `shopblok:quick-view-${member}`,
    label: `the quick view's ${member} member (T83)`,
  })),
  // T87: the blocks' islands, which a page's blocks and, since T87, a product's or a listing's
  // sections draw, each loaded when its block is drawn (`lib/lazy-island.ts`, React's `lazy`): the
  // storefront's (`src/components/cms/lazy-islands.tsx`) and `@shopblok/ui`'s `*-island.tsx`
  // loaders. Not here: the countdown's clock, which the account's e-mail check imports too
  // (`createClock`), and ProductCarousel, which the product page's own rows draw.
  ...(
    [
      ["src/components/cms/form-block-island.tsx", "form-block-island", "the form block's island"],
      [
        "src/components/cms/newsletter-section-island.tsx",
        "newsletter-section-island",
        "the newsletter block's island",
      ],
      ["src/components/cms/offer-end.tsx", "offer-end", "the promo banner's end"],
      [
        "src/components/cms/promo-popup.tsx",
        "promo-banner-popup",
        "the promo banner's popup island",
      ],
      [
        "src/components/cms/recently-viewed-block.tsx",
        "recently-viewed-block",
        "the recently viewed block's island",
      ],
      ["../../packages/ui/src/sections/video-embed.tsx", "video-embed", "the video's player"],
      [
        "../../packages/ui/src/molecules/copy-code-control.tsx",
        "copy-code-control",
        "the promo code's copy button",
      ],
      [
        "../../packages/ui/src/sections/testimonials/carousel.tsx",
        "testimonials-carousel",
        "the testimonials' carousel",
      ],
      [
        "../../packages/ui/src/sections/category-showcase/carousel.tsx",
        "category-showcase-carousel",
        "the category showcase's carousel",
      ],
    ] as const
  ).map(([module, marker, label]) => ({
    module,
    marker: `shopblok:${marker}`,
    label: `${label} (T87)`,
  })),
  // T96 (M6 D129): Sentry's browser SDK, imported by `instrumentation-client.ts` once the page is
  // idle, and only in a build with a DSN (`integrations-live` builds one).
  {
    module: "src/lib/sentry/browser.ts",
    marker: "shopblok:sentry-browser",
    label: "Sentry's browser SDK (T96)",
    onlyWith: "NEXT_PUBLIC_SENTRY_DSN",
  },
  // T97 (M6 D124, D129): `posthog-js`, which the consent island imports only after analytics
  // consent, and only in a build with a key (`integrations-live` builds one).
  {
    module: "src/lib/analytics/loader.ts",
    marker: "shopblok:posthog-loader",
    label: "PostHog's loader (T97)",
    onlyWith: "NEXT_PUBLIC_POSTHOG_KEY",
  },
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
    return { route, firstLoadUncompressedJsBytes, firstLoadChunkPaths };
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

export const routesManifestFile = ".next/app-path-routes-manifest.json";

/**
 * The routes that have a page, from `.next/app-path-routes-manifest.json`: an object from each app
 * path (`/(storefront)/[market]/products/[handle]/page`; `…/route` for a route handler) to the route
 * it serves (`/[market]/products/[handle]`). The value is the name the stats file's rows carry.
 */
export function pageRoutes(json: unknown): Set<string> {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("expected an object from each app path to its route.");
  }
  const routes = new Set<string>();
  for (const [appPath, route] of Object.entries(json)) {
    if (typeof route !== "string")
      throw new Error(`\`${appPath}\` is not mapped to a route string.`);
    if (appPath.endsWith("/page")) routes.add(route);
  }
  if (routes.size === 0) throw new Error("no app path ends in `/page`: Next wrote no page.");
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
 * Judges the measured routes. `pages` are the routes Next built a page for, which decides whether a
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
        `${budget.route} (${budget.label}) is a page in ${routesManifestFile} and has no row in route-bundle-stats.json: the stats file's format may have changed, or Next skipped the route. Not passing without a size.`,
      );
    } else {
      lines.push([budget.route, "-", "-", "-", String(budget.maxKB), "no page yet"]);
      notes.push(
        `${budget.route} (${budget.label}): Next built no page for it yet (not in ${routesManifestFile}), so its ${budget.maxKB} KB budget is not checked.`,
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

/** A chunk file under `.next/static/chunks/`, as the stats name it, with its text. */
export type ChunkText = { chunk: string; text: string };

export const chunksDir = ".next/static/chunks";

/** Every JavaScript chunk of the build's client, as `{ chunk, text }`. */
export function readChunks(root: string): ChunkText[] {
  const dir = path.join(root, chunksDir);
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".js"))
    .map((file) => ({
      chunk: `${chunksDir}/${file.split(path.sep).join("/")}`,
      text: readFileSync(path.join(dir, file), "utf8"),
    }));
}

/**
 * Whether D102's kept-out check judges a route: every route but the design system's (T83). The design
 * system draws every member of a family on one page, so it imports each member statically, and a
 * client member's chunk (the quick view's three) is in its first load by design; it is a tool for the
 * shop's makers, never a page a shopper loads.
 */
export const shopRoute = (route: string) =>
  route !== "/design-system" && !route.startsWith("/design-system/");

/**
 * D102's check: each kept-out module's chunks (the ones holding its marker) with their gzipped
 * size, and a failure for a chunk that is in a route's first load or a marker in no chunk.
 */
export function checkKeptOut(
  rows: readonly StatsRow[],
  list: readonly KeptOut[],
  chunks: readonly ChunkText[],
  gzipOf: (chunk: string) => number,
  buildEnv: Readonly<Record<string, string | undefined>> = {},
): Report {
  const failures: string[] = [];
  const notes: string[] = [];
  const lines: string[][] = [["kept-out module", "chunk", "gzip KB", "result"]];
  for (const item of list) {
    const found = chunks.filter((each) => each.text.includes(item.marker));
    // The build decides: a module whose marker is there is judged whatever this run's environment
    // says (the build may have read the variable from `.env`, which this check does not).
    if (found.length === 0 && item.onlyWith !== undefined && !buildEnv[item.onlyWith]?.trim()) {
      lines.push([item.module, "-", "-", "not built"]);
      notes.push(
        `${item.module} (${item.label}) is built only with ${item.onlyWith}: neither the build nor this run has it, so there is nothing to check.`,
      );
      continue;
    }
    if (found.length === 0) {
      lines.push([item.module, "-", "-", "NOT FOUND"]);
      failures.push(
        `${item.module} (${item.label}): no chunk holds its marker "${item.marker}", so the build has no such module or its marker changed. Fix the row in \`keptOut\`.`,
      );
      continue;
    }
    for (const { chunk } of found) {
      const routes = rows.filter(
        (row) => shopRoute(row.route) && row.firstLoadChunkPaths.includes(chunk),
      );
      lines.push([
        item.module,
        chunk,
        kb(gzipOf(chunk)),
        routes.length === 0 ? "kept out" : "FIRST LOAD",
      ]);
      if (routes.length > 0)
        failures.push(
          `${item.module} (${item.label}): its chunk ${chunk} is in the first load of ${routes.map((row) => row.route).join(", ")}. Load it with next/dynamic inside a client component (D102), never statically or from a server component.`,
        );
    }
  }
  const widths = lines[0]!.map((_, column) =>
    Math.max(...lines.map((line) => line[column]!.length)),
  );
  const table = lines.map((line) =>
    line
      .map((cell, column) =>
        column < 2 ? cell.padEnd(widths[column]!) : cell.padStart(widths[column]!),
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
  keepOut: readonly KeptOut[] = keptOut,
  buildEnv: Readonly<Record<string, string | undefined>> = {},
): number {
  const args = parseArgs(argv);
  if ("usage" in args) {
    fail(`first-load: ${args.usage}\n${usageText}`);
    return 2;
  }
  const readJson = (file: string): unknown =>
    JSON.parse(readFileSync(path.join(root, file), "utf8"));
  let reading = statsFile;
  let rows: StatsRow[];
  let pages: Set<string>;
  try {
    rows = parseStats(readJson(statsFile));
    reading = routesManifestFile;
    pages = pageRoutes(readJson(routesManifestFile));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    fail(
      `first-load: cannot use ${reading}: ${reason}\nRun \`pnpm build\` first. Next 16.4 writes both files after a Turbopack build; a build with another bundler, or another Next, may not.`,
    );
    return 1;
  }
  const report = evaluate(measure(rows, root), withOverrides(tableBudgets, args.overrides), pages);
  print("First-load JS per route, each chunk gzipped on its own and summed (SPEC §13):");
  for (const line of report.table) print(line);
  for (const note of report.notes) print(note);
  let kept: Report = { table: [], failures: [], notes: [] };
  if (keepOut.length > 0) {
    let chunks: ChunkText[];
    try {
      chunks = readChunks(root);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      fail(`first-load: cannot read ${chunksDir}: ${reason}\nRun \`pnpm build\` first.`);
      return 1;
    }
    kept = checkKeptOut(
      rows,
      keepOut,
      chunks,
      (chunk) => gzipBytes(readFileSync(path.join(root, chunk))),
      buildEnv,
    );
    print("Kept out of every route's first load (D102), each chunk gzipped:");
    for (const line of kept.table) print(line);
    for (const note of kept.notes) print(note);
  }
  const failures = [...report.failures, ...kept.failures];
  if (failures.length > 0) {
    for (const failure of failures) fail(`first-load: ${failure}`);
    return 1;
  }
  print(
    keepOut.length > 0
      ? "first-load: no route is over its budget, and no kept-out module is in a first load."
      : "first-load: no route is over its budget.",
  );
  return 0;
}

/**
 * Workflow-command data as GitHub reads it: `%` first (or the `%0A` below would be escaped again),
 * then CR and LF. What `escapeData` of @actions/core does; a message that quotes a percent-encoded
 * path or a JSON parse error stays as written in the annotation.
 */
export function escapeData(text: string): string {
  return text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

/** A line for stderr: an `::error::` annotation under GitHub Actions, the line itself elsewhere. */
export function errorLine(line: string, github: boolean): string {
  return github ? `::error::${escapeData(line)}` : line;
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
    (line) => console.error(errorLine(line, github)),
    budgets,
    keptOut,
    // The environment of the build: the check runs right after it, in the same job (T96).
    process.env,
  );
}
