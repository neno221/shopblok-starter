import { beforeEach, describe, expect, it, vi } from "vitest";

// D58 (T66, PR 100 review, item 3): which posts the build prerenders. The reads are fakes.

const readPostList = vi.fn();
vi.mock("../../../../../lib/cms/posts", () => ({
  readPostList: (...args: unknown[]) => readPostList(...args),
  // The slug map is oldest first (the older post keeps a shared slug): no order to prerender by.
  readPostSlugs: async () => ({ byId: {}, bySlug: { oldest: 1, older: 2, newest: 3 } }),
  readPostBySlug: vi.fn(),
  postSlugsIn: vi.fn(),
}));
vi.mock("../../../../../lib/markets/get-market-map", () => ({ getMarketMap: async () => ({}) }));
vi.mock("../../../../../lib/markets/market", () => ({
  findMarket: (_map: unknown, key: string) => (key === "en-us" ? { language: "en" } : undefined),
  listMarkets: () => [],
}));
const cap = vi.fn(() => 2);
vi.mock("../../../../../lib/prerender", () => ({
  PLACEHOLDER_HANDLE: "__stand-in__",
  prerenderCap: () => cap(),
}));

// The page's other imports read Next's request (`next/root-params`), which a test has not.
vi.mock("../../../../../lib/current-market", () => ({ getCurrentMarket: vi.fn() }));
vi.mock("../../../../../components/shell/shell-data", () => ({ getShellData: vi.fn() }));

const { generateStaticParams } = await import("./page");

beforeEach(() => {
  readPostList.mockReset();
  cap.mockReturnValue(2);
});

describe("the posts the build prerenders (D58)", () => {
  it("are the newest, the journal's first page at the cap, at their addresses", async () => {
    readPostList.mockResolvedValue({
      posts: [{ slug: "newest" }, { slug: "older" }],
      totalPages: 3,
    });
    expect(await generateStaticParams({ params: { market: "en-us" } })).toEqual([
      { slug: "newest" },
      { slug: "older" },
    ]);
    expect(readPostList).toHaveBeenCalledWith({ market: { language: "en" }, draft: false }, 1, 2);
  });

  it("are the stand-in with no post, no database, an unknown market or a cap of 0", async () => {
    const standIn = [{ slug: "__stand-in__" }];
    readPostList.mockResolvedValue({ posts: [], totalPages: 1 });
    expect(await generateStaticParams({ params: { market: "en-us" } })).toEqual(standIn);
    readPostList.mockResolvedValue(null);
    expect(await generateStaticParams({ params: { market: "en-us" } })).toEqual(standIn);
    expect(await generateStaticParams({ params: { market: "xx" } })).toEqual(standIn);
    cap.mockReturnValue(0);
    expect(await generateStaticParams({ params: { market: "en-us" } })).toEqual(standIn);
  });
});
