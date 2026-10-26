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

it("is written in the market's language, with a link to the market's home", async () => {
  const html = await render(seeded, "fr-ch");
  expect(html).toContain(catalogs.fr.notFound.title);
  expect(html).toContain(catalogs.fr.notFound.home);
  expect(html).toContain('href="/ch/fr"');
});

it("is in English for a language with no catalog", async () => {
  const html = await render(mongolia, "mn-mn");
  expect(html).toContain(catalogs.en.notFound.title);
  expect(html).toContain(catalogs.en.notFound.body);
});
