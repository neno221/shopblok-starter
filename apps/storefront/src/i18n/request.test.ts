import { catalogs } from "@shopblok/i18n";
import { findMarket, listMarkets } from "../lib/markets/market";
import type { MarketMap } from "../lib/markets/types";
import { brazil, mongolia, seeded } from "../lib/markets/test-maps";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  key: "",
  map: undefined as unknown as MarketMap,
  // `readUiStrings` (D77): `null` is "no database", as in every test here but the last group's.
  read: (async () => null) as (reader: unknown) => Promise<Record<string, string> | null>,
}));
vi.mock("next/root-params", () => ({ market: async () => state.key }));
vi.mock("../lib/markets/cached-market-map", () => ({ getRenderMarketMap: async () => state.map }));
vi.mock("../lib/cms/ui-strings", () => ({
  readUiStrings: (reader: unknown) => state.read(reader),
}));

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
  state.read = async () => null;
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

  // D65: the country's zone from the market map, UTC for a country without one; either way a fixed
  // zone, so a build and a browser write the same time.
  it("gives the market's time zone, UTC when its country has none", async () => {
    expect((await configFor(seeded, "el-cy")).timeZone).toBe("Europe/Nicosia");
    expect((await configFor(seeded, "fr-ch")).timeZone).toBe("Europe/Zurich");
    expect((await configFor(mongolia, "mn-mn")).timeZone).toBe("UTC");
  });

  it("is a 404 for a key the map does not have", async () => {
    expect(findMarket(seeded, "xx-yy")).toBeUndefined();
    await expect(configFor(seeded, "xx-yy")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});

describe("the request configuration with ui-strings (D77)", () => {
  it("reads the market language's edited strings, never Draft Mode, and puts them over the catalog", async () => {
    const readers: unknown[] = [];
    state.read = async (reader) => {
      readers.push(reader);
      return { "templates.error.title": "Ωχ, κάτι χάλασε" };
    };
    const result = await configFor(seeded, "el-cy");
    expect(readers).toEqual([
      { market: expect.objectContaining({ language: "el" }), draft: false },
    ]);
    expect(result.messages?.templates?.error?.title).toBe("Ωχ, κάτι χάλασε");
    expect(result.messages?.templates?.error?.body).toBe(catalogs.el.templates.error.body);
    expect(catalogs.el.templates.error.title).not.toBe("Ωχ, κάτι χάλασε");
  });

  it("reads a language with no catalog in its own code, over the English catalog", async () => {
    const languages: string[] = [];
    state.read = async (reader) => {
      languages.push((reader as { market: { language: string } }).market.language);
      return { "templates.error.title": "Algo deu errado" };
    };
    const result = await configFor(brazil, "pt-br");
    expect(languages).toEqual(["pt"]);
    expect(result.messages?.templates?.error?.title).toBe("Algo deu errado");
    expect(result.messages?.templates?.error?.body).toBe(catalogs.en.templates.error.body);
  });

  it("falls back to the code catalog when the read fails, with one warning per outage", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    state.read = async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:15432");
    };
    expect((await configFor(seeded, "el-cy")).messages).toBe(catalogs.el);
    expect((await configFor(seeded, "el-cy")).messages).toBe(catalogs.el);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("ui-strings: the read failed");
    state.read = async () => ({});
    await configFor(seeded, "el-cy");
    state.read = async () => {
      throw new Error("down again");
    };
    await configFor(seeded, "el-cy");
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
