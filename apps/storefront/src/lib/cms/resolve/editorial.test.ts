// T66: the `editorialList` block resolved for a market: the newest posts or the editor's picks,
// their links in the market, the journal's link, and a block with nothing to list left out.
import { describe, expect, it, vi } from "vitest";
import { findMarket } from "../../markets/market";
import { seeded } from "../../markets/test-maps";
import type { CmsPostSummary } from "../posts";
import { resolveEditorialList, type PostsContext } from "./editorial";
import { resolveLayout, type LayoutBlock } from "./sections";

const us = findMarket(seeded, "en-us")!;
const cy = findMarket(seeded, "el-cy")!;

const post = (id: number, slug: string): CmsPostSummary => ({
  id,
  title: `Post ${id}`,
  slug,
  excerpt: null,
  author: null,
  publishedAt: `2026-10-0${id}T08:00:00.000Z`,
  hero: null,
});
const POSTS = [post(3, "third"), post(2, "second"), post(1, "first")];

const context = (): PostsContext & { newest: ReturnType<typeof vi.fn> } => ({
  newest: vi.fn(async (limit: number) => POSTS.slice(0, limit)),
  byIds: vi.fn(async (ids: readonly number[]) =>
    ids.flatMap((id) => POSTS.find((each) => each.id === id) ?? []),
  ),
  journalLabel: "See all posts",
});

type Block = Extract<LayoutBlock, { blockType: "editorialList" }>;
const block = (over: Partial<Block> = {}): Block =>
  ({
    blockType: "editorialList",
    id: "list",
    variant: "standard",
    heading: "From the journal",
    source: "newest",
    limit: 2,
    showLink: true,
    ...over,
  }) as Block;

describe("resolveEditorialList", () => {
  it("lists the newest, as many as the editor said, linked in the market, with the journal's link", async () => {
    const posts = context();
    const resolved = await resolveEditorialList(block(), { market: us, map: seeded }, posts);
    expect(posts.newest).toHaveBeenCalledWith(2);
    expect(resolved?.section.posts.map((each) => each.href)).toEqual([
      "/us/journal/third",
      "/us/journal/second",
    ]);
    expect(resolved?.section.heading).toBe("From the journal");
    expect(resolved?.section.link).toEqual({
      label: "See all posts",
      href: "/us/journal",
      appearance: "outline",
    });
    const greek = await resolveEditorialList(block(), { market: cy, map: seeded }, posts);
    expect(greek?.section.link?.href).toBe("/journal");
  });

  it("lists the editor's picks in their order, without the ones a visitor cannot read", async () => {
    const posts = context();
    const resolved = await resolveEditorialList(
      block({ source: "handpicked", posts: [1, { id: 9 } as never, { id: 3 } as never] }),
      { market: us, map: seeded },
      posts,
    );
    expect(posts.byIds).toHaveBeenCalledWith([1, 9, 3]);
    expect(resolved?.section.posts.map((each) => each.title)).toEqual(["Post 1", "Post 3"]);
  });

  it("keeps the limit within 1 to 12, and leaves the link out when the editor turned it off", async () => {
    const posts = context();
    await resolveEditorialList(block({ limit: 40 }), { market: us, map: seeded }, posts);
    await resolveEditorialList(block({ limit: 0 }), { market: us, map: seeded }, posts);
    expect(posts.newest.mock.calls).toEqual([[12], [1]]);
    const resolved = await resolveEditorialList(
      block({ showLink: false, heading: null }),
      { market: us, map: seeded },
      posts,
    );
    expect(resolved?.section).not.toHaveProperty("link");
    expect(resolved?.section).not.toHaveProperty("heading");
  });

  it("is left out with nothing to list, or when the read fails, and the page keeps its other blocks", async () => {
    const empty: PostsContext = { ...context(), newest: async () => [] };
    expect(await resolveEditorialList(block(), { market: us, map: seeded }, empty)).toBeNull();
    const failing: PostsContext = {
      ...context(),
      newest: async () => {
        throw new Error("down");
      },
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const spacer = { blockType: "spacer", id: "gap", variant: "standard", size: "small" };
    const layout = [block(), spacer] as unknown as LayoutBlock[];
    const resolved = await resolveLayout(layout, { market: us, map: seeded, posts: failing });
    expect(resolved.map((each) => each.key)).toEqual(["gap"]);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("editorialList list left out: the posts' read failed"),
      "down",
    );
    // Without the journal's reads the block is left out, and nothing is read.
    const none = await resolveLayout(layout, { market: us, map: seeded });
    expect(none.map((each) => each.key)).toEqual(["gap"]);
    error.mockRestore();
  });
});
