import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type Budget,
  KB,
  budgets,
  errorLine,
  escapeData,
  evaluate,
  gzipBytes,
  measure,
  pageRoutes,
  parseArgs,
  parseStats,
  routesManifestFile,
  run,
  statsFile,
  withOverrides,
} from "./first-load";

// A trimmed copy of the file Next 16.4.1 wrote after a Turbopack build of this app (T42): three of
// its eight rows. It pins the shape the script reads; a Next that renames a key fails the first
// test here and then, in CI, the script itself.
const fixture = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "route-bundle-stats.fixture.json"), "utf8"),
);
const rows = parseStats(fixture);
const market = rows.find((row) => row.route === "/[market]")!;

// Likewise a trimmed copy of `.next/app-path-routes-manifest.json` from the same build: the page
// entries of the three rows above, an admin and a design-system page with a route group in their
// path, and two route handlers (`…/route`).
const manifest: unknown = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "app-path-routes-manifest.fixture.json"), "utf8"),
);

/** The chunk path the stats name, from the absolute path `measure` asks about (Windows spells it with backslashes). */
const chunkOf = (file: string): string => path.relative("/pkg", file).split(path.sep).join("/");

const pdp: Budget = { route: "/[market]", label: "PDP stand-in", maxKB: 170 };

/** Sizes for the `/[market]` row's chunks that add up to `total` bytes, in no particular split. */
function sizesAdding(total: number): Map<string, number> {
  const chunks = market.firstLoadChunkPaths;
  const each = Math.floor(total / chunks.length);
  const sizes = new Map(chunks.map((chunk) => [chunk, each]));
  sizes.set(chunks[0]!, each + (total - each * chunks.length));
  return sizes;
}

const judged = (total: number, budget: Budget = pdp, pages = new Set<string>()) =>
  evaluate(
    measure([market], "/pkg", (file) => sizesAdding(total).get(chunkOf(file))),
    [budget],
    pages,
  );

describe("parseStats", () => {
  it("reads the shape Next 16.4.1 writes", () => {
    expect(rows.map((row) => row.route).sort()).toEqual([
      "/[market]",
      "/_not-found",
      "/design-system/[locale]/preview/[...entry]",
    ]);
    expect(market.firstLoadChunkPaths).toHaveLength(12);
    expect(
      market.firstLoadChunkPaths.every((chunk) => chunk.startsWith(".next/static/chunks/")),
    ).toBe(true);
    expect(market.firstLoadUncompressedJsBytes).toBe(740704);
  });

  it.each([
    ["not an array", { route: "/" }, /array of rows/],
    ["no rows", [], /no rows/],
    ["a row that is not an object", [3], /row 0 is not an object/],
    [
      "a row without a route",
      [{ firstLoadUncompressedJsBytes: 1, firstLoadChunkPaths: [] }],
      /no `route`/,
    ],
    [
      "a row whose size is a string",
      [
        {
          route: "/",
          firstLoadUncompressedJsBytes: "1",
          firstLoadChunkPaths: [],
        },
      ],
      /no `firstLoadUncompressedJsBytes` number/,
    ],
    [
      "the chunk list under another name",
      [{ route: "/", firstLoadUncompressedJsBytes: 1, chunks: [] }],
      /no `firstLoadChunkPaths` array/,
    ],
    [
      "a chunk that is not a string",
      [
        {
          route: "/",
          firstLoadUncompressedJsBytes: 1,
          firstLoadChunkPaths: [1],
        },
      ],
      /no `firstLoadChunkPaths` array/,
    ],
  ])("rejects %s", (_name, json, message) => {
    expect(() => parseStats(json)).toThrow(message);
  });
});

describe("the budget", () => {
  it("passes a route at 170 KB gzipped and fails it at 171 KB (T42's Verify)", () => {
    const at170 = judged(170 * KB);
    expect(at170.failures).toEqual([]);
    expect(at170.table.at(-1)).toMatch(/\/\[market\].* {2}ok$/);

    const at171 = judged(171 * KB);
    expect(at171.failures).toEqual([
      "/[market] (PDP stand-in): 171.0 KB gzipped, over its 170 KB budget by 1.0 KB.",
    ]);
    expect(at171.table.at(-1)).toMatch(/\/\[market\].* {2}OVER$/);
  });

  it("fails by one byte", () => {
    expect(judged(170 * KB).failures).toEqual([]);
    expect(judged(170 * KB + 1).failures).toHaveLength(1);
  });

  it("budgets the PDP and the three listing pages at 170 KB, with the page/[n] routes T50 makes explicit", () => {
    expect(budgets).toEqual([
      { route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 },
      { route: "/[market]/categories/[...handle]", label: "PLP, categories", maxKB: 170 },
      { route: "/[market]/store", label: "PLP, store", maxKB: 170 },
      { route: "/[market]/store/page/[n]", label: "PLP, store page n", maxKB: 170 },
      { route: "/[market]/collections/[handle]", label: "PLP, collections", maxKB: 170 },
      {
        route: "/[market]/collections/[handle]/page/[n]",
        label: "PLP, collections page n",
        maxKB: 170,
      },
    ]);
  });

  it("does not judge a route that has no budget, and prints it", () => {
    const report = judged(900 * KB, {
      route: "/elsewhere",
      label: "x",
      maxKB: 1,
    });
    expect(report.failures).toEqual([]);
    expect(report.table.at(-2)).toMatch(/^\/\[market\] .*not budgeted$/);
  });

  it("fails a budgeted route that has a page and no row, so a changed format cannot pass", () => {
    const gone = evaluate(
      measure([market], "/pkg", () => 1),
      [{ route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 }],
      new Set(["/[market]/products/[handle]"]),
    );
    expect(gone.failures).toHaveLength(1);
    expect(gone.failures[0]).toMatch(
      /PDP\) is a page in \.next\/app-path-routes-manifest\.json and has no row/,
    );
    expect(gone.table.at(-1)).toMatch(/NO ROW$/);
  });

  // PR 69 review, item 4: a heavy listing page must not pass because its route is not in the table.
  it.each(budgets.map((budget) => [budget.route, budget] as const))(
    "fails %s when it has a page and no row, and only says so when it has no page",
    (route, budget) => {
      const measured = measure([market], "/pkg", () => 1);
      const withPage = evaluate(measured, budgets, new Set([route]));
      expect(withPage.failures).toHaveLength(1);
      expect(withPage.failures[0]).toContain(`${route} (${budget.label}) is a page in`);
      expect(withPage.table.filter((line) => line.endsWith("NO ROW"))).toHaveLength(1);

      const withoutPage = evaluate(measured, budgets, new Set(["/[market]"]));
      expect(withoutPage.failures).toEqual([]);
      expect(withoutPage.notes).toHaveLength(budgets.length);
    },
  );

  // SPEC §13: the PDP and every PLP route, the page/[n] ones included, over 170 KB gzipped fail.
  it.each(budgets.map((budget) => [budget.route, budget.label] as const))(
    "%s: passes at 170 KB and fails at 171 KB",
    (route, label) => {
      const failuresAt = (total: number) => {
        const sizes = sizesAdding(total);
        return evaluate(
          measure([{ ...market, route }], "/pkg", (file) => sizes.get(chunkOf(file))),
          budgets,
          new Set([route]),
        ).failures;
      };
      expect(failuresAt(170 * KB)).toEqual([]);
      expect(failuresAt(171 * KB)).toEqual([
        `${route} (${label}): 171.0 KB gzipped, over its 170 KB budget by 1.0 KB.`,
      ]);
    },
  );

  it("says, and does not fail, when a budgeted route has no page yet", () => {
    const report = evaluate(
      measure([market], "/pkg", () => 1),
      [{ route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 }],
      new Set(["/[market]"]),
    );
    expect(report.failures).toEqual([]);
    expect(report.notes).toEqual([
      "/[market]/products/[handle] (PDP): Next built no page for it yet (not in .next/app-path-routes-manifest.json), so its 170 KB budget is not checked.",
    ]);
    expect(report.table.at(-1)).toMatch(/no page yet$/);
  });

  it("fails when a chunk the stats name is not on disk, whatever the route's budget", () => {
    const sizes = sizesAdding(10 * KB);
    sizes.delete(market.firstLoadChunkPaths[3]!);
    const report = evaluate(
      measure([market], "/pkg", (file) => sizes.get(chunkOf(file))),
      [],
      new Set(),
    );
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]).toContain("1 chunk file(s) that are not on disk");
    expect(report.failures[0]).toContain(market.firstLoadChunkPaths[3]);
  });

  it("counts a chunk shared by several routes once per route, and reads it once", () => {
    const reads: string[] = [];
    const measured = measure(rows, "/pkg", (file) => {
      reads.push(file);
      return 100;
    });
    expect(new Set(reads).size).toBe(reads.length);
    expect(measured.every((row) => row.gzipBytes === row.chunks * 100)).toBe(true);
  });
});

describe("withOverrides and parseArgs", () => {
  it("replaces the table's budget for a route and adds one for a new route", () => {
    const merged = withOverrides(budgets, [
      { route: "/[market]/products/[handle]", label: "overridden", maxKB: 1 },
      { route: "/[market]", label: "overridden", maxKB: 1 },
    ]);
    expect(merged).toEqual([
      ...budgets.filter((budget) => budget.route !== "/[market]/products/[handle]"),
      { route: "/[market]/products/[handle]", label: "overridden", maxKB: 1 },
      { route: "/[market]", label: "overridden", maxKB: 1 },
    ]);
  });

  it("reads --budget <route>=<KB>, repeatable", () => {
    expect(parseArgs(["--budget", "/[market]=1", "--budget", "/x/[y]=0.5"])).toEqual({
      overrides: [
        { route: "/[market]", label: "overridden", maxKB: 1 },
        { route: "/x/[y]", label: "overridden", maxKB: 0.5 },
      ],
    });
    expect(parseArgs([])).toEqual({ overrides: [] });
  });

  it.each([
    [["--max", "1"]],
    [["--budget"]],
    [["--budget", "/[market]"]],
    [["--budget", "[market]=1"]],
    [["--budget", "/[market]=0"]],
    [["--budget", "/[market]=big"]],
    [["--budget", "=1"]],
  ])("rejects %j as a usage error", (argv) => {
    expect(parseArgs(argv)).toHaveProperty("usage");
  });
});

describe("the pages Next built", () => {
  it("takes the routes of the page entries from the manifest, as Next names them", () => {
    expect([...pageRoutes(manifest)].sort()).toEqual([
      "/[market]",
      "/_not-found",
      "/admin/[[...segments]]",
      "/design-system/[locale]/[...entry]",
      "/design-system/[locale]/preview/[...entry]",
    ]);
  });

  it("agrees with the stats file about every row's route (the two come from one build)", () => {
    const pages = pageRoutes(manifest);
    expect(rows.filter((row) => !pages.has(row.route))).toEqual([]);
  });

  it("leaves out route handlers", () => {
    const pages = pageRoutes(manifest);
    expect(pages.has("/api/[...slug]")).toBe(false);
    expect(pages.has("/next/markets")).toBe(false);
    expect(pages.has("/favicon.ico")).toBe(false);
  });

  it.each([
    ["an array", [], /expected an object/],
    ["null", null, /expected an object/],
    [
      "a route that is not a string",
      { "/x/page": 1 },
      /`\/x\/page` is not mapped to a route string/,
    ],
    ["no page entry", { "/x/route": "/x" }, /no app path ends in `\/page`/],
    ["an empty object", {}, /no app path ends in `\/page`/],
  ])("rejects %s", (_name, json, message) => {
    expect(() => pageRoutes(json)).toThrow(message);
  });
});

describe("the ::error:: annotation", () => {
  it("escapes % first, then CR and LF, as GitHub reads workflow-command data", () => {
    expect(escapeData("100% of /a%20b.js\r\nnext\nline")).toBe(
      "100%25 of /a%2520b.js%0D%0Anext%0Aline",
    );
    // A literal %0A in the message stays a literal: it must not become a newline in the annotation.
    expect(escapeData("a%0Ab")).toBe("a%250Ab");
    expect(escapeData("nothing to escape")).toBe("nothing to escape");
  });

  it("is written under GitHub Actions only", () => {
    expect(errorLine("first-load: x\ny 50%", true)).toBe("::error::first-load: x%0Ay 50%25");
    expect(errorLine("first-load: x\ny 50%", false)).toBe("first-load: x\ny 50%");
  });
});

describe("a package on disk", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "first-load-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const write = (file: string, content: string | Uint8Array) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  const stats = (rowList: unknown[]) => write(statsFile, JSON.stringify(rowList));
  const pagesBuilt = (appPaths: Record<string, string>) =>
    write(routesManifestFile, JSON.stringify(appPaths));

  it("gzips the files: a compressible chunk counts for far less than its size", () => {
    const zeros = new Uint8Array(1024 * KB);
    expect(gzipBytes(zeros)).toBeLessThan(2 * KB);
    write(".next/static/chunks/a.js", zeros);
    write(".next/static/chunks/b.js", zeros);
    const [row] = measure(
      [
        {
          route: "/x",
          firstLoadUncompressedJsBytes: 2048 * KB,
          firstLoadChunkPaths: [".next/static/chunks/a.js", ".next/static/chunks/b.js"],
        },
      ],
      root,
    );
    expect(row!.rawBytes).toBe(2048 * KB);
    expect(row!.gzipBytes).toBe(2 * gzipBytes(zeros));
    expect(row!.missing).toEqual([]);
  });

  it("run: prints the table, passes under the budget and fails over it (exit 1) with the route named", () => {
    // Incompressible chunks, so the gzipped size is the file's size plus gzip's header.
    write(".next/static/chunks/a.js", randomBytes(120 * KB));
    write(".next/static/chunks/b.js", randomBytes(60 * KB));
    pagesBuilt({ "/(storefront)/[market]/page": "/[market]" });
    stats([
      {
        route: "/[market]",
        firstLoadUncompressedJsBytes: 180 * KB,
        firstLoadChunkPaths: [".next/static/chunks/a.js", ".next/static/chunks/b.js"],
      },
    ]);
    const lines: string[] = [];
    const errors: string[] = [];
    const exec = (argv: string[]) => {
      lines.length = 0;
      errors.length = 0;
      return run(
        argv,
        root,
        (line) => lines.push(line),
        (line) => errors.push(line),
        [
          { route: "/[market]", label: "wiring", maxKB: 200 },
          { route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 },
        ],
      );
    };

    expect(exec([])).toBe(0);
    expect(errors).toEqual([]);
    expect(lines.join("\n")).toMatch(/\/\[market\]\s+2\s+180\.0\s+18[0-9]\.\d\s+200\s+ok/);
    expect(lines.join("\n")).toContain(
      "/[market]/products/[handle] (PDP): Next built no page for it yet",
    );

    expect(exec(["--budget", "/[market]=1"])).toBe(1);
    expect(lines.join("\n")).toMatch(/\/\[market\]\s+2\s+180\.0\s+18[0-9]\.\d\s+1\s+OVER/);
    expect(errors.join("\n")).toMatch(
      /first-load: \/\[market\] \(overridden\): 18[0-9]\.\d KB gzipped, over its 1 KB budget by 17[0-9]\.\d KB\./,
    );
  });

  it("run: a budgeted route with a page and no row fails; so does a stats file or a manifest that is missing or has another shape", () => {
    const errors: string[] = [];
    const exec = () =>
      run(
        [],
        root,
        () => undefined,
        (line) => errors.push(line),
      );

    expect(exec()).toBe(1);
    expect(errors.pop()).toMatch(
      /cannot use \.next\/diagnostics\/route-bundle-stats\.json: .*ENOENT/,
    );

    write(statsFile, JSON.stringify({ routes: [] }));
    expect(exec()).toBe(1);
    expect(errors.pop()).toMatch(/expected an array of rows/);

    stats([
      {
        route: "/[market]",
        firstLoadUncompressedJsBytes: 1,
        firstLoadChunkPaths: [],
      },
    ]);
    expect(exec()).toBe(1);
    expect(errors.pop()).toMatch(/cannot use \.next\/app-path-routes-manifest\.json: .*ENOENT/);

    write(routesManifestFile, JSON.stringify(["/[market]"]));
    expect(exec()).toBe(1);
    expect(errors.pop()).toMatch(/expected an object from each app path/);

    write(routesManifestFile, JSON.stringify({ "/next/status/route": "/next/status" }));
    expect(exec()).toBe(1);
    expect(errors.pop()).toMatch(/no app path ends in `\/page`/);

    pagesBuilt({
      "/(storefront)/[market]/page": "/[market]",
      "/(storefront)/[market]/products/[handle]/page": "/[market]/products/[handle]",
    });
    expect(exec()).toBe(1);
    expect(errors.pop()).toMatch(
      /\/\[market\]\/products\/\[handle\] \(PDP\) is a page in \.next\/app-path-routes-manifest\.json and has no row/,
    );
  });

  it("run: a bad argument is a usage error (exit 2) and reads no file", () => {
    const errors: string[] = [];
    expect(
      run(
        ["--budget", "nope"],
        root,
        () => undefined,
        (line) => errors.push(line),
      ),
    ).toBe(2);
    expect(errors[0]).toMatch(/--budget needs <route>=<KB>/);
  });
});
