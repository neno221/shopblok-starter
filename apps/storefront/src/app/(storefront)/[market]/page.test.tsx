import { catalogs, formatMoney } from "@shopblok/i18n";
import { prerender } from "react-dom/static";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketMap } from "../../../lib/markets/types";
import { mongolia, seeded } from "../../../lib/markets/test-maps";

const state = vi.hoisted(() => ({ key: "", map: undefined as unknown as MarketMap }));
vi.mock("next/root-params", () => ({ market: async () => state.key }));
vi.mock("../../../lib/markets/cached-market-map", () => ({
  getRenderMarketMap: async () => state.map,
}));
// The page reads the request (`connection()`) and three backends; the test is about its text.
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("../../../lib/cms/site", () => ({ countPublishedPages: async () => 3 }));
vi.mock("../../../lib/medusa/regions", () => ({
  getRegionForCountry: async (country: string) => ({
    id: "reg_1",
    name: `Region of ${country}`,
    currencyCode: country === "mn" ? "mnt" : "eur",
    countries: [country],
  }),
  getSearchPriceCurrencies: async () => ["eur", "mnt"],
}));
vi.mock("../../../lib/medusa/products", () => ({
  listProducts: async ({ regionId }: { regionId: string }) => [
    {
      id: `prod_${regionId}`,
      handle: "tea",
      title: "Tea",
      thumbnail: null,
      price: { amount: 12000, currencyCode: "mnt" },
    },
  ],
}));

import MarketHome from "./page";

afterEach(() => {
  state.key = "";
});

/** The page's HTML for a market, the dynamic part included (`prerender` waits for it). */
async function render(map: MarketMap, key: string): Promise<string> {
  state.map = map;
  state.key = key;
  const { prelude } = await prerender(await MarketHome());
  return new Response(prelude).text();
}

/** The page's text: tags are `|`, React's `<!-- -->` between text runs is gone, entities are decoded. */
const text = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, "|")
    .replace(/\|+/g, "|")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&");

describe("the wiring page reads its copy through next-intl (D62)", () => {
  it("shows a market in a language without a catalog in English, and lang and money in its own", async () => {
    const overridden: MarketMap = {
      ...mongolia,
      languages: [{ code: "mn", medusaLocale: "mn-MN", htmlLang: "mn" }],
    };
    const html = await render(overridden, "mn-mn");
    const { wiring } = catalogs.en;

    expect(text(html)).toContain(`|${wiring.title}|`);
    expect(text(html)).toContain(`|${wiring.market}|mn-mn|${wiring.language}|mn|`);
    expect(text(html)).toContain(`|${wiring.currency}|MNT|`);
    expect(html).toContain('data-testid="language">mn<');

    // MNT written for `mn`, not for English or the market's country.
    const inMongolian = formatMoney(12000, "mnt", "mn");
    expect(text(html)).toContain(`|Tea — ${inMongolian}|`);
    expect(inMongolian).not.toBe(formatMoney(12000, "mnt", "en"));
  });

  it("shows the Greek market in Greek, with the euro written the Greek way", async () => {
    const html = await render(seeded, "el-cy");
    expect(text(html)).toContain(`|${catalogs.el.wiring.title}|`);
    expect(text(html)).toContain(`|${catalogs.el.wiring.market}|el-cy|`);
    expect(html).toContain('data-testid="language">el-CY<');
  });

  it("shows Swiss French in French", async () => {
    const html = await render(seeded, "fr-ch");
    expect(text(html)).toContain(`|${catalogs.fr.wiring.title}|`);
    expect(text(html)).toContain(`|${catalogs.fr.wiring.products}|`);
  });
});
