import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { MARKET_SOURCE, clearSharedMarketSource } from "../markets/shared-source";
import { hasSecret, parseBody, revalidateResponse } from "./revalidate";

const SECRET = "s3cret-0123456789";
const source = { REVALIDATE_SECRET: SECRET };

function post(body: unknown, auth: string | null = `Bearer ${SECRET}`): Request {
  return new Request("http://localhost:8000/api/revalidate", {
    method: "POST",
    headers: auth === null ? {} : { authorization: auth },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/revalidate", () => {
  it("revalidates each tag with 'max' by default", async () => {
    const revalidate = vi.fn();
    const response = await revalidateResponse(
      post({ tags: ["product:blue-shirt", "medusa:products"] }),
      revalidate,
      source,
    );
    expect(response.status).toBe(200);
    expect(revalidate.mock.calls).toEqual([
      ["product:blue-shirt", "max"],
      ["medusa:products", "max"],
    ]);
  });

  it("revalidates with { expire: 0 } for prices and stock", async () => {
    const revalidate = vi.fn();
    await revalidateResponse(post({ tags: ["product:a"], expire: 0 }), revalidate, source);
    expect(revalidate).toHaveBeenCalledWith("product:a", { expire: 0 });
  });

  it.each([
    ["no header", null],
    ["a wrong secret", "Bearer nope"],
    ["the secret with a suffix", `Bearer ${SECRET}x`],
    ["no Bearer prefix", SECRET],
  ])("answers 401 for %s, and revalidates nothing", async (_, auth) => {
    const revalidate = vi.fn();
    const response = await revalidateResponse(post({ tags: ["search"] }, auth), revalidate, source);
    expect(response.status).toBe(401);
    expect(revalidate).not.toHaveBeenCalled();
  });

  describe("the in-memory market map (T75 review, item 1)", () => {
    const run = (body: unknown, auth?: string | null) => {
      const expire = vi.fn();
      const promise = revalidateResponse(post(body, auth), vi.fn(), source, expire);
      return promise.then((response) => ({ response, expire }));
    };

    it("is marked stale by medusa:markets, with either expire", async () => {
      expect((await run({ tags: ["medusa:markets"], expire: 0 })).expire).toHaveBeenCalledOnce();
      expect((await run({ tags: ["medusa:markets"] })).expire).toHaveBeenCalledOnce();
    });

    it("is marked stale once when medusa:markets comes with other tags and is repeated", async () => {
      const { expire } = await run({
        tags: ["medusa:regions", "medusa:markets", "medusa:markets", "bogus"],
      });
      expect(expire).toHaveBeenCalledOnce();
    });

    it.each([["medusa:regions"], ["medusa:products"], ["search"], ["product:markets"]])(
      "is left alone by %s",
      async (tag) => {
        expect((await run({ tags: [tag] })).expire).not.toHaveBeenCalled();
      },
    );

    it("is left alone by a call that is refused", async () => {
      for (const attempt of [
        await run({ tags: ["medusa:markets"] }, "Bearer nope"),
        await run({ tags: ["medusa:markets"] }, null),
        await run("not json"),
        await run({ tags: ["medusa:markets"], expire: "soon" }),
        await run({ tags: ["not-a-tag"] }),
      ]) {
        expect(attempt.response.status).toBeGreaterThanOrEqual(400);
        expect(attempt.expire).not.toHaveBeenCalled();
      }
    });

    it("reaches the process's shared market source when nothing is injected", async () => {
      const expire = vi.fn();
      (globalThis as Record<symbol, unknown>)[MARKET_SOURCE] = { expire };
      try {
        await revalidateResponse(post({ tags: ["medusa:markets"], expire: 0 }), vi.fn(), source);
        expect(expire).toHaveBeenCalledOnce();
      } finally {
        clearSharedMarketSource();
      }
    });
  });

  it("refuses every call while REVALIDATE_SECRET is unset, even an empty Bearer", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const revalidate = vi.fn();
    for (const value of [undefined, "", "  "]) {
      const response = await revalidateResponse(post({ tags: ["search"] }, "Bearer "), revalidate, {
        REVALIDATE_SECRET: value,
      });
      expect(response.status).toBe(401);
    }
    expect(revalidate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it.each([
    // The tag the market map had while Payload held it: nothing carries it any more.
    ["global:markets"],
    ["payload:pages"],
    ["e2e:pages:en"],
    ["product:"],
    ["product:Blue"],
    ["medusa:anything"],
    ["category:../x"],
  ])("answers 400 for the tag %s", async (tag) => {
    const revalidate = vi.fn();
    const response = await revalidateResponse(post({ tags: [tag] }), revalidate, source);
    expect(response.status).toBe(400);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("skips an unknown tag beside allowed ones, and revalidates the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const revalidate = vi.fn();
    const response = await revalidateResponse(
      post({ tags: ["product:v1.2-shirt", "medusa:products", "global:markets", "search"] }),
      revalidate,
      source,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      revalidated: ["medusa:products", "search"],
      skipped: ["product:v1.2-shirt", "global:markets"],
      expire: "max",
    });
    expect(revalidate.mock.calls.map(([tag]) => tag)).toEqual(["medusa:products", "search"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("answers 400 for a body that is not JSON, empty tags, or a bad expire", async () => {
    for (const body of ["{", { tags: [] }, { tags: ["search"], expire: 5 }, { tags: "search" }]) {
      expect((await revalidateResponse(post(body), vi.fn(), source)).status).toBe(400);
    }
  });

  it("accepts every tag the data layer and D58 use", () => {
    const tags = [
      "medusa:products",
      "medusa:regions",
      "medusa:markets",
      "medusa:categories",
      "medusa:collections",
      "search",
      "navigation",
      "product:t-shirt_2",
      "category:men/shirts",
      "collection:summer-2026",
    ];
    expect(parseBody({ tags })).toEqual({ tags, skipped: [], expire: "max" });
  });

  it("compares the secret in constant time", () => {
    // The mutation (D58's Verify): a route comparing with `===` fails here.
    const source = readFileSync(new URL("./revalidate.ts", import.meta.url), "utf8");
    expect(source).toMatch(/import \{[^}]*\btimingSafeEqual\b[^}]*\} from "node:crypto"/);
    expect(source).toMatch(/timingSafeEqual\(digest\(given\), digest\(secret\)\)/);
    expect(source).not.toMatch(/given\s*===|===\s*secret/);
    expect(hasSecret(post({}), { REVALIDATE_SECRET: SECRET })).toBe(true);
  });
});
