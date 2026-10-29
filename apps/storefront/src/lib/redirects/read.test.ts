import { describe, expect, it, vi } from "vitest";
import { seeded } from "../markets/test-maps";

// D82 (T68): what `/next/redirects` answers. The cached reads are stand-ins: the stored redirects,
// and the pages' and posts' addresses per language as the shop's routes read them.

const state = vi.hoisted(() => ({
  docs: null as unknown[] | null,
  entry: undefined as { name: string; tags: readonly string[]; life: unknown } | undefined,
}));
vi.mock("server-only", () => ({}));
vi.mock("../cache", () => ({
  cached: (load: unknown, options: typeof state.entry) => {
    state.entry = options;
    return load;
  },
}));
vi.mock("../cms/read", () => ({
  cmsRead: () => async () => state.docs,
}));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));
vi.mock("../cms/pages", () => ({
  pageAddresses: async (id: number, languages: string[]) =>
    id === 4
      ? Object.fromEntries(
          languages.flatMap((language) =>
            language === "el"
              ? [[language, "/σχετικά"]]
              : language === "en"
                ? [[language, "/about"]]
                : [],
          ),
        )
      : {},
}));
vi.mock("../cms/posts", () => ({
  postSlugsIn: async (id: number) => (id === 7 ? { en: "spring", de: "fruehling" } : {}),
}));

const { readRedirectList } = await import("./read");

describe("readRedirectList", () => {
  it("is one entry of its own, tagged `redirects` and regenerated every 30 s (PR 101 review, item 2)", () => {
    // Also with no database, where no read under it is cached: the route then still has the tag
    // and the period, and is not the build's empty list for good.
    expect(state.entry).toEqual({
      name: "redirects:list",
      tags: ["redirects"],
      life: { stale: 30, revalidate: 30, expire: 2_592_000 },
    });
  });

  it("is no redirects without a database or with none saved", async () => {
    state.docs = null;
    expect(await readRedirectList()).toEqual({ redirects: [] });
    state.docs = [];
    expect(await readRedirectList()).toEqual({ redirects: [] });
  });

  it("gives each redirect's target as a custom URL or as its page's or post's addresses", async () => {
    state.docs = [
      { from: "/old", type: "301", to: { type: "custom", url: "/new" } },
      {
        from: "/about-us",
        type: "308",
        to: { type: "reference", reference: { relationTo: "pages", value: 4 } },
      },
      {
        from: "/de/blog",
        type: "302",
        to: { type: "reference", reference: { relationTo: "posts", value: 7 } },
      },
    ];
    expect(await readRedirectList()).toEqual({
      redirects: [
        { from: "/old", type: "301", to: { url: "/new" } },
        {
          from: "/about-us",
          type: "308",
          to: { paths: { el: "/%CF%83%CF%87%CE%B5%CF%84%CE%B9%CE%BA%CE%AC", en: "/about" } },
        },
        {
          from: "/de/blog",
          type: "302",
          to: { paths: { en: "/journal/spring", de: "/journal/fruehling" } },
        },
      ],
    });
  });

  it("leaves out a redirect whose page or post has no published address", async () => {
    state.docs = [
      {
        from: "/gone",
        type: "301",
        to: { type: "reference", reference: { relationTo: "pages", value: 99 } },
      },
      { from: "/broken", type: "301", to: { type: "custom" } },
    ];
    expect(await readRedirectList()).toEqual({ redirects: [] });
  });
});
