import { describe, expect, it } from "vitest";
import { NONCE_ROUTES } from "../security/nonce-routes";
import { germanyClosed, seeded, withDomains } from "../markets/test-maps";
import {
  CLOSED_ROBOTS,
  DISALLOWED_SEGMENTS,
  disallowedPaths,
  MARKET_DISALLOWED_SEGMENTS,
  marketsOnHost,
  openRobots,
  ROOT_DISALLOWED_SEGMENTS,
  robotsOpen,
  sitemapUrl,
} from "./robots";
import { listMarkets } from "../markets/market";

// M7 D147 (T110): `robots.txt`. `seo.spec.ts` checks the closed one on `next start` (CI is not
// production); these check the open one, which only the live shop answers.

const base = new URL("https://shop.example");
const keys = (map: typeof seeded) => listMarkets(map).map((market) => market.key);
const sitemapsOf = (map: typeof seeded) => Object.fromEntries(keys(map).map((key) => [key, [key]]));

describe("robotsOpen (D133's order, as HSTS's)", () => {
  it("is open only with DEPLOY_ENV=production", () => {
    expect(robotsOpen({ DEPLOY_ENV: "production" })).toBe(true);
    expect(robotsOpen({ DEPLOY_ENV: "production", VERCEL_ENV: "production" })).toBe(true);
  });

  it("is closed in development, CI, staging and every Vercel preview", () => {
    expect(robotsOpen({})).toBe(false);
    expect(robotsOpen({ NODE_ENV: "production" })).toBe(false);
    expect(robotsOpen({ VERCEL_ENV: "production" })).toBe(false);
    expect(robotsOpen({ DEPLOY_ENV: "staging", NODE_ENV: "production" })).toBe(false);
    expect(robotsOpen({ DEPLOY_ENV: "production", VERCEL_ENV: "preview" })).toBe(false);
  });

  it("closes everything when closed", () => {
    expect(CLOSED_ROBOTS).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("the disallowed segments", () => {
  it("are the nonce routes and the search in each market, Payload's, the API's, Next's and the design system's at the root", () => {
    for (const route of NONCE_ROUTES) expect(MARKET_DISALLOWED_SEGMENTS).toContain(route);
    expect(MARKET_DISALLOWED_SEGMENTS).toContain("search");
    expect(ROOT_DISALLOWED_SEGMENTS).toEqual(["admin", "api", "next", "design-system"]);
    expect(DISALLOWED_SEGMENTS).toEqual([
      ...MARKET_DISALLOWED_SEGMENTS,
      ...ROOT_DISALLOWED_SEGMENTS,
    ]);
  });
});

describe("marketsOnHost", () => {
  it("is every market without a domain on the main host", () => {
    expect(marketsOnHost(seeded, "shop.example").map((m) => m.key)).toEqual(keys(seeded));
    expect(marketsOnHost(withDomains, "shop.example").map((m) => m.key)).toEqual([
      "en-us",
      "en-gb",
      "de-de",
      "fr-fr",
    ]);
  });

  it("is a domain's own markets on that domain, whatever its case or port", () => {
    expect(marketsOnHost(withDomains, "SHOP.ch:443").map((m) => m.key)).toEqual(["de-ch", "fr-ch"]);
    expect(marketsOnHost(withDomains, "shop.com.cy").map((m) => m.key)).toEqual(["el-cy"]);
  });

  it("leaves a closed market out", () => {
    expect(marketsOnHost(germanyClosed, "shop.example").map((m) => m.key)).not.toContain("de-de");
  });
});

describe("disallowedPaths", () => {
  it("closes each market segment under each prefix, as the page, below it and with a query", () => {
    const paths = disallowedPaths(listMarkets(seeded), seeded);
    for (const prefix of ["", "/us", "/gb", "/de", "/fr", "/ch", "/ch/fr"])
      for (const segment of MARKET_DISALLOWED_SEGMENTS)
        for (const end of ["$", "/", "?"]) expect(paths).toContain(`${prefix}/${segment}${end}`);
    expect(paths).toHaveLength(
      (ROOT_DISALLOWED_SEGMENTS.length + 7 * MARKET_DISALLOWED_SEGMENTS.length) * 3,
    );
  });

  it("closes the root segments once at the root, never under a prefix, where no page has them", () => {
    const paths = disallowedPaths(listMarkets(seeded), seeded);
    for (const segment of ROOT_DISALLOWED_SEGMENTS)
      for (const end of ["$", "/", "?"]) {
        expect(paths.filter((path) => path === `/${segment}${end}`)).toHaveLength(1);
        expect(paths).not.toContain(`/us/${segment}${end}`);
      }
  });

  it("closes the root segments on a host whose markets all have a prefix", () => {
    // With Cyprus on its own domain, the main host's markets are `/us`, `/gb`, `/de`, `/fr`.
    const markets = marketsOnHost(withDomains, "shop.example");
    const paths = disallowedPaths(markets, withDomains);
    expect(paths).not.toContain("/cart$");
    for (const segment of ROOT_DISALLOWED_SEGMENTS)
      for (const end of ["$", "/", "?"]) expect(paths).toContain(`/${segment}${end}`);
  });

  it("never closes a bare prefix, which would hide a page that starts the same (`/cartography`)", () => {
    const paths = disallowedPaths(listMarkets(seeded), seeded);
    expect(paths).not.toContain("/cart");
    expect(paths.every((path) => /[$/?]$/.test(path))).toBe(true);
  });
});

describe("sitemapUrl", () => {
  it("is on the site's origin for a market without a domain, on its own domain otherwise", () => {
    const [us] = listMarkets(withDomains).filter((m) => m.key === "en-us");
    const [ch] = listMarkets(withDomains).filter((m) => m.key === "de-ch");
    expect(us && sitemapUrl(us, "en-us", base)).toBe("https://shop.example/sitemap/en-us.xml");
    expect(ch && sitemapUrl(ch, "de-ch_2", base)).toBe("https://shop.ch/sitemap/de-ch_2.xml");
  });
});

describe("openRobots (the live shop)", () => {
  it("allows the rest and lists the sitemaps of the markets on the main host", () => {
    const robots = openRobots({
      host: "shop.example",
      map: withDomains,
      base,
      sitemaps: { ...sitemapsOf(withDomains), "en-us": ["en-us", "en-us_2"] },
    });
    expect(robots.rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(robots.sitemap).toEqual([
      "https://shop.example/sitemap/en-us.xml",
      "https://shop.example/sitemap/en-us_2.xml",
      "https://shop.example/sitemap/en-gb.xml",
      "https://shop.example/sitemap/de-de.xml",
      "https://shop.example/sitemap/fr-fr.xml",
    ]);
    const disallow = (robots.rules as { disallow: string[] }).disallow;
    expect(disallow).toContain("/us/cart$");
    // Cyprus and Switzerland are on domains of their own: their paths are closed there, not here.
    expect(disallow).not.toContain("/cart$");
    expect(disallow).not.toContain("/ch/fr/cart$");
  });

  it("lists a domain's own sitemaps and paths on that domain", () => {
    const robots = openRobots({
      host: "shop.ch",
      map: withDomains,
      base,
      sitemaps: sitemapsOf(withDomains),
    });
    expect(robots.sitemap).toEqual([
      "https://shop.ch/sitemap/de-ch.xml",
      "https://shop.ch/sitemap/fr-ch.xml",
    ]);
    const disallow = (robots.rules as { disallow: string[] }).disallow;
    expect(disallow).toContain("/cart$");
    expect(disallow).toContain("/fr/cart$");
    expect(disallow).not.toContain("/us/cart$");
  });

  it("never lists a closed market's sitemap", () => {
    const robots = openRobots({
      host: "shop.example",
      map: germanyClosed,
      base,
      sitemaps: { ...sitemapsOf(germanyClosed), "de-de": ["de-de"] },
    });
    expect(robots.sitemap).not.toContain("https://shop.example/sitemap/de-de.xml");
    expect((robots.rules as { disallow: string[] }).disallow).not.toContain("/de/cart$");
  });

  it("is closed with no market on the host", () => {
    const empty = { ...seeded, countries: seeded.countries.map((c) => ({ ...c, enabled: false })) };
    expect(openRobots({ host: "shop.example", map: empty, base, sitemaps: {} })).toEqual(
      CLOSED_ROBOTS,
    );
  });
});
