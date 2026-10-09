import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
const count = vi.fn();
vi.mock("./payload", () => ({ getPayloadClient: async () => ({ count }) }));

const { countPublishedPages } = await import("./site");

beforeEach(() => vi.clearAllMocks());

describe("countPublishedPages", () => {
  it("counts the published pages, not the drafts, through the Local API", async () => {
    count.mockResolvedValue({ totalDocs: 3 });
    expect(await countPublishedPages()).toBe(3);
    expect(count).toHaveBeenCalledExactlyOnceWith({
      collection: "pages",
      where: { _status: { equals: "published" } },
    });
  });

  it("is zero when the CMS has no pages", async () => {
    count.mockResolvedValue({ totalDocs: 0 });
    expect(await countPublishedPages()).toBe(0);
  });

  it("passes a database failure on to the page", async () => {
    count.mockRejectedValue(new Error("connection terminated"));
    await expect(countPublishedPages()).rejects.toThrow("connection terminated");
  });
});
