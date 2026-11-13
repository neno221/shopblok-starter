import { incompleteLocales, rebuildIncompleteLocaleIndexes } from "../search-locale-indexes";

const probe = (locale: string, answeredBy: string, count: number) => ({
  locale,
  answeredBy: [answeredBy],
  count,
});

describe("incompleteLocales (PR 139's review, item 1)", () => {
  it("names a locale answered by another locale's index (it has none)", () => {
    expect(incompleteLocales([probe("en-US", "en-US", 8), probe("it-IT", "en-US", 8)])).toEqual([
      "it-IT",
    ]);
  });

  it("names a locale whose index holds fewer documents than the default's", () => {
    expect(incompleteLocales([probe("en-US", "en-US", 8), probe("it-IT", "it-IT", 1)])).toEqual([
      "it-IT",
    ]);
  });

  it("is empty when every locale has a whole index of its own", () => {
    expect(incompleteLocales([probe("en-US", "en-US", 8), probe("el-GR", "el-GR", 8)])).toEqual([]);
  });
});

describe("rebuildIncompleteLocaleIndexes", () => {
  const setup = (
    provider: string,
    answers: Record<string, { locales: string[]; count: number }>,
    status = "ready",
  ) => {
    const reindex = jest.fn(async () => ({}));
    const search = {
      listIndexes: async () => [{ name: "product", provider, status }],
      search: jest.fn(async ({ search_options }: { search_options: { locales: string[] } }) => {
        const answer = answers[search_options.locales[0]!]!;

        return {
          metadata: { count: answer.count },
          provider_metadata: { locales: answer.locales },
        };
      }),
      reindex,
    };
    const container = {
      resolve: (key: string) =>
        ({
          search,
          query: {
            graph: async () => ({
              data: [
                { supported_locales: Object.keys(answers).map((locale_code) => ({ locale_code })) },
              ],
            }),
          },
          logger: { info: jest.fn(), warn: jest.fn() },
        })[key],
    } as never;

    return { container, reindex, search };
  };

  it("rebuilds the product index when a store locale searches the default's index", async () => {
    const { container, reindex } = setup("meilisearch", {
      "en-US": { locales: ["en-US"], count: 8 },
      "it-IT": { locales: ["en-US"], count: 8 },
    });

    expect(await rebuildIncompleteLocaleIndexes(container)).toEqual(["it-IT"]);
    expect(reindex).toHaveBeenCalledWith({ index: "product" });
  });

  it("leaves whole indexes alone", async () => {
    const { container, reindex } = setup("meilisearch", {
      "en-US": { locales: ["en-US"], count: 8 },
      "el-GR": { locales: ["el-GR"], count: 8 },
    });

    expect(await rebuildIncompleteLocaleIndexes(container)).toEqual([]);
    expect(reindex).not.toHaveBeenCalled();
  });

  it("does nothing on Postgres, or while the index is not live yet", async () => {
    const answers = { "en-US": { locales: [], count: 8 }, "it-IT": { locales: [], count: 8 } };

    for (const { container, reindex, search } of [
      setup("search-postgres", answers),
      setup("meilisearch", answers, "building"),
    ]) {
      expect(await rebuildIncompleteLocaleIndexes(container)).toEqual([]);
      expect(search.search).not.toHaveBeenCalled();
      expect(reindex).not.toHaveBeenCalled();
    }
  });
});
