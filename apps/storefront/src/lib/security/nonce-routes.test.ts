import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NONCE_PAGES, NONCE_ROUTES, isNonceRoute } from "./nonce-routes";

// M7 D139 (T107): the nonce pages are exactly the pages under the nine routes, so a page added
// there gets the nonce policy (or this test fails), and none is listed that the app does not have.

const MARKET_DIR = fileURLToPath(new URL("../../app/(storefront)/[market]", import.meta.url));

/** Every `page.tsx` and `route.ts` under `dir`, as the segments of its path (`[id]` is `*`). */
function pagesUnder(dir: string): string[][] {
  const out: string[][] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "page.tsx" || entry.name === "route.ts") {
        const segments = relative(MARKET_DIR, current)
          .split(sep)
          .filter((segment) => segment !== "" && !/^\(.*\)$/.test(segment))
          .map((segment) => (/^\[.*\]$/.test(segment) ? "*" : segment));
        out.push(segments);
      }
    }
  };
  walk(dir);
  return out;
}

const key = (segments: readonly string[]) => segments.join("/");

describe("NONCE_PAGES", () => {
  it("lists exactly the app's pages under the nine routes", () => {
    const found = NONCE_ROUTES.flatMap((route) => pagesUnder(join(MARKET_DIR, route)));
    expect(found.map(key).sort()).toEqual(NONCE_PAGES.map(key).sort());
  });

  it("starts each page with one of the nine routes", () => {
    for (const page of NONCE_PAGES) {
      expect(NONCE_ROUTES as readonly string[], key(page)).toContain(page[0]);
    }
  });
});

describe("isNonceRoute", () => {
  it.each([
    "/cart",
    "/checkout",
    "/checkout/delivery",
    "/account",
    "/account/orders/order_01",
    "/account/payment-methods/new",
    "/order/lookup",
    "/order/order_01/confirmed",
    "/order/order_01/transfer/tok",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify",
  ])("takes %s", (path) => {
    expect(isNonceRoute(path)).toBe(true);
  });

  it.each([
    "/",
    "/store",
    "/products/shirt",
    "/search",
    "/journal",
    "/cartography",
    "/account-help",
    // Under the nine routes but no page: the CMS catch-all's 404, whose prerendered shell has no
    // nonce (T107's spike).
    "/cart/x",
    "/account/x",
    "/order",
    "/order/x",
    "/login/x",
    "/checkout/a/b",
  ])("leaves %s to the static policy", (path) => {
    expect(isNonceRoute(path)).toBe(false);
  });
});
