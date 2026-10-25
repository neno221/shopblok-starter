import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type Budget,
  KB,
  budgets,
  evaluate,
  gzipBytes,
  measure,
  pageRoutes,
  parseArgs,
  parseStats,
  routeOfFolder,
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

  it("uses the PDP's and the PLP's routes at 170 KB in its table", () => {
    expect(budgets).toEqual([
      { route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 },
      { route: "/[market]/categories/[...handle]", label: "PLP", maxKB: 170 },
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
    expect(gone.failures[0]).toMatch(/PDP\) has a page under src\/app and no row/);
    expect(gone.table.at(-1)).toMatch(/NO ROW$/);
  });

  it("says, and does not fail, when a budgeted route has no page yet", () => {
    const report = evaluate(
      measure([market], "/pkg", () => 1),
      [{ route: "/[market]/products/[handle]", label: "PDP", maxKB: 170 }],
      new Set(["/[market]"]),
    );
    expect(report.failures).toEqual([]);
    expect(report.notes).toEqual([
      "/[market]/products/[handle] (PDP): no page.tsx under src/app yet, so its 170 KB budget is not checked.",
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
      { route: "/[market]/categories/[...handle]", label: "PLP", maxKB: 170 },
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

describe("the routes under src/app", () => {
  it("names a folder's route as Next does: groups and slots are not in it", () => {
    expect(routeOfFolder(".")).toBe("/");
    expect(routeOfFolder("(storefront)/[market]/products/[handle]")).toBe(
      "/[market]/products/[handle]",
    );
    expect(routeOfFolder("(storefront)/[market]/@modal/categories/[...handle]")).toBe(
      "/[market]/categories/[...handle]",
    );
    expect(routeOfFolder("(payload)/admin/[[...segments]]")).toBe("/admin/[[...segments]]");
    expect(routeOfFolder("_private/x")).toBeUndefined();
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

  it("finds the page files: pages only, not route handlers or layouts", () => {
    write("src/app/(storefront)/[market]/page.tsx", "");
    write("src/app/(storefront)/[market]/layout.tsx", "");
    write("src/app/(storefront)/[market]/products/[handle]/page.tsx", "");
    write("src/app/next/status/route.ts", "");
    write("src/app/_components/page.tsx", "");
    write("src/app/design-system/[locale]/page.mdx", "");
    expect([...pageRoutes(path.join(root, "src/app"))].sort()).toEqual([
      "/[market]",
      "/[market]/products/[handle]",
      "/design-system/[locale]",
    ]);
    expect(pageRoutes(path.join(root, "nowhere")).size).toBe(0);
  });

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
    write("src/app/(storefront)/[market]/page.tsx", "");
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
      "/[market]/products/[handle] (PDP): no page.tsx under src/app yet",
    );

    expect(exec(["--budget", "/[market]=1"])).toBe(1);
    expect(lines.join("\n")).toMatch(/\/\[market\]\s+2\s+180\.0\s+18[0-9]\.\d\s+1\s+OVER/);
    expect(errors.join("\n")).toMatch(
      /first-load: \/\[market\] \(overridden\): 18[0-9]\.\d KB gzipped, over its 1 KB budget by 17[0-9]\.\d KB\./,
    );
  });

  it("run: a budgeted route with a page and no row fails; so does a stats file that is missing or has another shape", () => {
    write("src/app/(storefront)/[market]/products/[handle]/page.tsx", "");
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
    expect(errors.pop()).toMatch(
      /\/\[market\]\/products\/\[handle\] \(PDP\) has a page under src\/app and no row/,
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
