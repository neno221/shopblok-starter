import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { INDEXABLE_ROUTES, NOINDEX_ROUTES, TEST_ROUTES } from "./routes";

// M7 D147 (T110): every page under `[market]` is in exactly one of the lists, so `seo.spec.ts`
// checks the alternates of every indexable route and the `noindex` of every other one, and a page
// added later fails here until it is classified.

const MARKET_DIR = fileURLToPath(new URL("../../app/(storefront)/[market]", import.meta.url));

/** Every `page.tsx` under `[market]`, as its folder inside it (`""` for the home). */
function pageRoutes(): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "page.tsx") out.push(relative(MARKET_DIR, current).split(sep).join("/"));
    }
  };
  walk(MARKET_DIR);
  return out.sort();
}

const source = (route: string) =>
  readFileSync(join(MARKET_DIR, ...route.split("/").filter(Boolean), "page.tsx"), "utf8");

describe("the routes under [market]", () => {
  const indexable = INDEXABLE_ROUTES.map((entry) => entry.route);
  const noindex = Object.keys(NOINDEX_ROUTES);

  it("are each in exactly one list", () => {
    const listed = [...indexable, ...noindex, ...TEST_ROUTES];
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(pageRoutes());
  });

  it("are listed as noindex only where the page says so", () => {
    for (const route of noindex) {
      const text = source(route);
      const own = /index: false|noindex/.test(text);
      // The account's pages and the sign-in pages take theirs from the shared helpers.
      const shared = /accountPageMetadata|authPageMetadata|from "[./]*lib\/(account|auth)-page"/.test(
        text,
      );
      expect(own || shared, route).toBe(true);
    }
  });

  it("give a later page of a listing its first page's metadata, with the page's number", () => {
    for (const entry of INDEXABLE_ROUTES) {
      if (!("samePageAs" in entry)) continue;
      expect(indexable).toContain(entry.samePageAs);
      expect(source(entry.route), entry.route).toContain(`${entry.metadata}(`);
      expect(source(entry.samePageAs), entry.samePageAs).toContain(`${entry.metadata}(`);
    }
  });
});
