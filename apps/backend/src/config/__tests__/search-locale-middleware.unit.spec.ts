import {
  ACTIVE_PROVIDERS_TTL_MS,
  activeProviders,
  chooseSearchLocale,
  localizeSearchBody,
  localizeStoreSearch,
} from "../../api/store/search/locale";

const SUPPORTED = ["en-US", "el-GR", "de-DE", "fr-FR"];

describe("chooseSearchLocale", () => {
  it("keeps a locale the store supports, whatever its case", () => {
    expect(chooseSearchLocale("el-GR", SUPPORTED)).toBe("el-GR");
    expect(chooseSearchLocale("el-gr", SUPPORTED)).toBe("el-GR");
  });

  it("falls back to the default locale for anything else", () => {
    // `normalizeLocale` passes these through unchanged, so the request can carry them.
    for (const requested of ["zz-ZZ", "it-IT", "el", "en-US-x-y-z", "../etc", "", undefined]) {
      expect(chooseSearchLocale(requested, SUPPORTED)).toBe("en-US");
    }
  });

  it("falls back to the default locale when the store has none", () => {
    expect(chooseSearchLocale("el-GR", [])).toBe("en-US");
  });
});

describe("localizeSearchBody", () => {
  it("overwrites the caller's locales with the request's, for a provider that takes them", () => {
    const body = {
      entity: "product",
      search_options: { locales: ["zz-ZZ", "de-DE"], facets: [{ field: "category_ids" }] },
    };

    localizeSearchBody(body, "el-GR", () => true);

    expect(body.search_options).toEqual({
      locales: ["el-GR"],
      facets: [{ field: "category_ids" }],
    });
  });

  it("removes the caller's locales for a provider that refuses them, and keeps the rest", () => {
    const body = {
      entity: "product",
      search_options: { locales: ["de-DE"], typo_tolerance: true },
    };

    localizeSearchBody(body, "el-GR", () => false);

    expect(body.search_options).toEqual({ typo_tolerance: true });
  });

  it("handles every query of a multi-query body, each by its own index", () => {
    const body = {
      queries: [
        { entity: "product" },
        { entity: "meili", search_options: { locales: ["fr-FR"] } },
      ],
    };

    localizeSearchBody(body, "de-DE", (entity) => entity === "meili");

    expect(body.queries).toEqual([
      { entity: "product", search_options: {} },
      { entity: "meili", search_options: { locales: ["de-DE"] } },
    ]);
  });
});

describe("localizeStoreSearch (PR 139's review, item 2)", () => {
  const run = async (provider: string) => {
    const body = { entity: "product", search_options: { locales: ["zz-ZZ"] } };
    const search = {
      listIndexes: async () => [{ name: "product", entity: "product", provider }],
    };
    const req = {
      validatedBody: body,
      locale: "el-GR",
      scope: {
        resolve: (key: string) =>
          ({
            search,
            query: {
              graph: async () => ({
                data: [{ supported_locales: [{ locale_code: "el-GR" }] }],
              }),
            },
          })[key],
      },
    };
    const next = jest.fn();

    await localizeStoreSearch(req as never, {} as never, next);
    expect(next).toHaveBeenCalled();

    return body.search_options;
  };

  it("sends the locale when the index's active version is on Meilisearch", async () => {
    expect(await run("meilisearch")).toEqual({ locales: ["el-GR"] });
  });

  it("sends none while the active version is still on Postgres, whatever the default provider", async () => {
    // During a switch, or while the new version's seed keeps failing, Postgres answers.
    expect(await run("search-postgres")).toEqual({});
  });
});

describe("activeProviders", () => {
  it("reads the indexes once per few seconds", async () => {
    const listIndexes = jest.fn(async () => [{ name: "product", provider: "meilisearch" }]);
    const search = { listIndexes };

    await activeProviders(search, 1_000_000);
    await activeProviders(search, 1_000_000 + ACTIVE_PROVIDERS_TTL_MS - 1);
    expect(listIndexes).toHaveBeenCalledTimes(1);
    expect((await activeProviders(search, 1_000_000 + ACTIVE_PROVIDERS_TTL_MS)).get("product")).toBe(
      "meilisearch",
    );
    expect(listIndexes).toHaveBeenCalledTimes(2);
  });
});
