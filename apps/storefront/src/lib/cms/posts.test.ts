import { beforeEach, describe, expect, it, vi } from "vitest";

// D80 (T66): the journal's reads. The cache is a stand-in that runs the loader (`cached`: `null`
// is no content database), and the Local API is a fake that answers each read by its `select`.

const find = vi.fn();
let cached: null | undefined;
vi.mock("./read", () => ({
  cmsRead:
    (load: (...args: unknown[]) => unknown) =>
    async (_reader: unknown, ...args: unknown[]) =>
      cached !== undefined ? cached : load({ find }, { locale: "el", draft: false }, ...args),
}));

const { readPostList, readPostsByIds } = await import("./posts");
const reader = { market: { language: "el" }, draft: false };

/** A stored post, as a list reads it in Greek (its slug English's where it has no Greek one). */
const post = (id: number, slug: string) => ({
  id,
  title: `Post ${id}`,
  slug,
  publishedAt: "2026-10-20T08:00:00.000Z",
});

beforeEach(() => {
  cached = undefined;
  find.mockReset();
  // Post 1 (older) has the Greek slug `x`; post 2 has only the English slug `x`, which the Greek
  // shop reads for it by fallback; post 3 has its own.
  find.mockImplementation(async (args: { select: Record<string, true>; where?: unknown }) => {
    if (Object.keys(args.select).length === 1)
      return { docs: [post(1, "x"), post(2, "x"), post(3, "y")] };
    return { docs: [post(2, "x"), post(3, "y"), post(1, "x")], totalPages: 1 };
  });
});

describe("the journal's lists (PR 100 review, item 1)", () => {
  it("links each post by the slug the journal's map gives it, and leaves out one whose slug an older post keeps", async () => {
    const list = await readPostList(reader, 1, 3);
    expect(list?.posts.map((each) => [each.id, each.slug])).toEqual([
      [3, "y"],
      [1, "x"],
    ]);
    expect(list?.totalPages).toBe(1);
  });

  it("does the same for an editorial list's picks, in the editor's order", async () => {
    const posts = await readPostsByIds(reader, [2, 1, 3]);
    expect(posts?.map((each) => [each.id, each.slug])).toEqual([
      [1, "x"],
      [3, "y"],
    ]);
  });

  it("is null with no content database", async () => {
    cached = null;
    expect(await readPostList(reader, 1, 3)).toBeNull();
    expect(await readPostsByIds(reader, [1])).toBeNull();
  });
});
