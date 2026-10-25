import { catalogs } from "@shopblok/i18n";
import { findMarket, listMarkets } from "../lib/markets/market";
import type { MarketMap } from "../lib/markets/types";
import { brazil, mongolia, seeded } from "../lib/markets/test-maps";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ key: "", map: undefined as unknown as MarketMap }));
vi.mock("next/root-params", () => ({ market: async () => state.key }));
vi.mock("../lib/markets/cached-market-map", () => ({ getRenderMarketMap: async () => state.map }));

import config from "./request";

/** What next-intl asks `getRequestConfig` for, with a `requestLocale` that must stay unread. */
const params = {
  locale: undefined,
  get requestLocale(): Promise<string | undefined> {
    throw new Error("request.ts read requestLocale, which reads the request's headers");
  },
};

async function configFor(map: MarketMap, key: string) {
  state.map = map;
  state.key = key;
  return config(params);
}

afterEach(() => {
  state.key = "";
});

describe("the request configuration (D62)", () => {
  it.each(listMarkets(seeded).map((market) => [market.key, market] as const))(
    "%s: the market's lang value and its language's catalog",
    async (key, market) => {
      const result = await configFor(seeded, key);
      expect(result.locale).toBe(market.htmlLang);
      expect(result.messages).toBe(catalogs[market.language as keyof typeof catalogs]);
    },
  );

  it("gives Swiss French and Swiss German their own catalogs under the one country", async () => {
    expect((await configFor(seeded, "de-ch")).messages).toBe(catalogs.de);
    expect((await configFor(seeded, "fr-ch")).messages).toBe(catalogs.fr);
  });

  // The language Mongolia's market carries has no catalog: English copy, formatted for `mn`. The
  // lang value is `mn-MN` unless the language's row overrides it, as `htmlLang: "mn"` does here.
  it("gives a market in a language with no catalog English messages and its own lang value", async () => {
    const plain = await configFor(mongolia, "mn-mn");
    expect(plain.locale).toBe("mn-MN");
    expect(plain.messages).toBe(catalogs.en);

    const overridden: MarketMap = {
      ...mongolia,
      languages: [{ code: "mn", medusaLocale: "mn-MN", htmlLang: "mn" }],
    };
    const result = await configFor(overridden, "mn-mn");
    expect(result.locale).toBe("mn");
    expect(result.messages).toBe(catalogs.en);
    expect(Intl.getCanonicalLocales(result.locale)).toEqual(["mn"]);
  });

  it("does the same for Brazil's Portuguese, whose lang value has a country", async () => {
    const result = await configFor(brazil, "pt-br");
    expect(result.locale).toBe("pt-BR");
    expect(result.messages).toBe(catalogs.en);
  });

  // PR 70 review, item 1: a lang value that is no language tag (typed into the admin) must not
  // reach next-intl, whose first use of it throws a RangeError in the root layout.
  it("gives a market whose stored lang value is no language tag the one language and country make", async () => {
    for (const stored of ["pt_BR", "Portuguese"]) {
      const map: MarketMap = {
        ...brazil,
        languages: [{ code: "pt", medusaLocale: "pt-BR", htmlLang: stored }],
      };
      const result = await configFor(map, "pt-br");
      expect(result.locale, stored).toBe("pt-BR");
      expect(result.messages).toBe(catalogs.en);
    }
  });

  it("fixes the time zone, so a build and a browser write the same time", async () => {
    for (const [map, key] of [
      [seeded, "el-cy"],
      [mongolia, "mn-mn"],
    ] as const) {
      expect((await configFor(map, key)).timeZone).toBe("UTC");
    }
  });

  it("is a 404 for a key the map does not have", async () => {
    expect(findMarket(seeded, "xx-yy")).toBeUndefined();
    await expect(configFor(seeded, "xx-yy")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});
