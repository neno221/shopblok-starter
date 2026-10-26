import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheTag = vi.fn();
const cacheLife = vi.fn();
vi.mock("next/cache", () => ({ cacheTag, cacheLife }));

// `"use cache"` is a Next compiler directive; in Vitest the function is a plain one, which is
// what these tests want: they check what `cached` hands to `cacheTag`, `cacheLife` and the loader.
// That two entries never share a key is a property of Next's compiler and is checked in a build
// (SETUP.md, T12).
const { CATALOG_LIFE, cached } = await import("./cache");

beforeEach(() => vi.clearAllMocks());

describe("cached", () => {
  it("calls the wrapped function with the arguments and returns what it returns", async () => {
    const load = vi.fn(async (region: string, limit: number) => ({ region, limit }));
    const wrapped = cached(load, { name: "t:args", tags: ["a"], life: "hours" });
    expect(await wrapped("reg_1", 4)).toEqual({ region: "reg_1", limit: 4 });
    expect(load).toHaveBeenCalledExactlyOnceWith("reg_1", 4);
  });

  it("tags the entry and sets its life from the options, inside the cached function", async () => {
    const wrapped = cached(async () => 1, {
      name: "t:tags",
      tags: ["medusa:products", "medusa:regions"],
      life: "minutes",
    });
    await wrapped();
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith("medusa:products", "medusa:regions");
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("minutes");
  });

  it("adds the tags a call's arguments give (product:{handle}), once each", async () => {
    const wrapped = cached(async (handle: string) => handle, {
      name: "t:tagsFor",
      tags: ["medusa:products"],
      tagsFor: (handle) => [`product:${handle}`, "medusa:products"],
      life: CATALOG_LIFE,
    });
    await wrapped("tee");
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith("medusa:products", "product:tee");
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith(CATALOG_LIFE);
  });

  it("gives the catalog 30 days of outage and an hour without a webhook (D58)", () => {
    expect(CATALOG_LIFE).toEqual({ stale: 300, revalidate: 3600, expire: 2_592_000 });
  });

  it("accepts an inline life", async () => {
    const life = { stale: 300, revalidate: 30, expire: 3600 };
    await cached(async () => 1, { name: "t:inline", tags: [], life })();
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith(life);
  });

  it("keeps functions apart: two with the same tags and arguments each run their own", async () => {
    const a = cached(async (x: string) => `a:${x}`, { name: "t:a", tags: ["same"], life: "hours" });
    const b = cached(async (x: string) => `b:${x}`, { name: "t:b", tags: ["same"], life: "hours" });
    expect([await a("x"), await b("x")]).toEqual(["a:x", "b:x"]);
  });

  it("lets a later function with the same name replace the earlier (a hot reload)", async () => {
    cached(async () => "old", { name: "t:reload", tags: [], life: "hours" });
    const next = cached(async () => "new", { name: "t:reload", tags: [], life: "hours" });
    expect(await next()).toBe("new");
  });

  it("passes an error on to the caller", async () => {
    const wrapped = cached(
      async () => {
        throw new Error("backend down");
      },
      { name: "t:throws", tags: [], life: "hours" },
    );
    await expect(wrapped()).rejects.toThrow("backend down");
  });

  it("copies the tags, so a caller's later change to its array does not reach the entry", async () => {
    const tags = ["one"];
    const wrapped = cached(async () => 1, { name: "t:copy", tags, life: "hours" });
    tags.push("two");
    await wrapped();
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith("one");
  });
});
