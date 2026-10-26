import { catalogs } from "@shopblok/i18n";
import { prerender } from "react-dom/static";
import { afterEach, expect, it, vi } from "vitest";
import type { MarketMap } from "../../../lib/markets/types";
import { mongolia, seeded } from "../../../lib/markets/test-maps";

const state = vi.hoisted(() => ({ key: "", map: undefined as unknown as MarketMap }));
vi.mock("next/root-params", () => ({ market: async () => state.key }));
vi.mock("../../../lib/markets/cached-market-map", () => ({
  getRenderMarketMap: async () => state.map,
}));
// The shell's data (T48) without Medusa: the market and its public URLs are the real ones.
vi.mock("../../../components/shell/shell-data", async () => {
  const { getCurrentMarket } = await import("../../../lib/current-market");
  const { buildPublicUrl } = await import("../../../lib/markets/url");
  return {
    getShellData: async () => {
      const market = await getCurrentMarket();
      return { url: (path: string) => buildPublicUrl(market, path, state.map) };
    },
  };
});

import MarketNotFound from "./not-found";

afterEach(() => {
  state.key = "";
});

async function render(map: MarketMap, key: string): Promise<string> {
  state.map = map;
  state.key = key;
  const { prelude } = await prerender(await MarketNotFound());
  // React writes an apostrophe as `&#x27;`.
  return (await new Response(prelude).text()).replaceAll("&#x27;", "'");
}

it("is the not-found template in the market's language, linking to its home and its search", async () => {
  const html = await render(seeded, "fr-ch");
  const copy = catalogs.fr.templates.notFound;
  expect(html).toContain('data-slot="not-found-template"');
  for (const text of [copy.title, copy.body, copy.home, copy.search]) expect(html).toContain(text);
  expect(html).toMatch(
    /href="\/ch\/fr"[^>]*data-slot="not-found-home"|data-slot="not-found-home"[^>]*href="\/ch\/fr"/,
  );
  expect(html).toMatch(
    /href="\/ch\/fr\/search"[^>]*data-slot="not-found-search"|data-slot="not-found-search"[^>]*href="\/ch\/fr\/search"/,
  );
});

it("is in English for a language with no catalog", async () => {
  const html = await render(mongolia, "mn-mn");
  expect(html).toContain(catalogs.en.templates.notFound.title);
  expect(html).toContain(catalogs.en.templates.notFound.body);
});
