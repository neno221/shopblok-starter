import { afterEach, describe, expect, it, vi } from "vitest";
import { loadVisitor } from "./source";
import { getSnapshot, resetVisitor, setCartCount, setConsent, setVisitor } from "./store";

afterEach(() => resetVisitor());

const answer = (body: unknown, status = 200) =>
  vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
  );

const suggestion = {
  market: "en-us",
  current: { country: "cy" },
  suggested: { country: "us", language: "en", htmlLang: "en-US", currencyCode: "USD", href: "/us" },
};

describe("loadVisitor (D60: the island's source)", () => {
  it("asks /next/visitor for the market and the page, with the cookies, and fills the store", async () => {
    const fetcher = answer({ cartCount: 2, customer: { firstName: "Άννα" }, suggestion });
    expect(await loadVisitor("el-cy", "/products/tee", fetcher as unknown as typeof fetch)).toBe(
      true,
    );
    expect(fetcher).toHaveBeenCalledWith("/next/visitor?market=el-cy&path=%2Fproducts%2Ftee", {
      credentials: "same-origin",
      cache: "no-store",
    });
    expect(getSnapshot()).toEqual({
      cartCount: 2,
      consent: null,
      customer: { firstName: "Άννα" },
      suggestion,
    });
  });

  it("keeps the consent the visitor gave on this page", async () => {
    setVisitor({ cartCount: 0, consent: null });
    setConsent({ analytics: true, marketing: false });
    await loadVisitor(
      "el-cy",
      "/",
      answer({ cartCount: 1, customer: null, suggestion: null }) as unknown as typeof fetch,
    );
    expect(getSnapshot()).toMatchObject({
      cartCount: 1,
      consent: { analytics: true, marketing: false },
    });
  });

  it("keeps a count an add set while the request was out (PR 73 review)", async () => {
    let reply: (response: Response) => void = () => undefined;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => (reply = resolve)));
    const loading = loadVisitor("el-cy", "/", fetcher as unknown as typeof fetch);
    setCartCount(3);
    expect(getSnapshot()).toMatchObject({ cartCount: 3 });
    reply(
      new Response(JSON.stringify({ cartCount: 2, customer: { firstName: "Άννα" }, suggestion })),
    );
    expect(await loading).toBe(true);
    expect(getSnapshot()).toMatchObject({ cartCount: 3, customer: { firstName: "Άννα" } });
  });

  it("leaves the store unknown when the answer is an error or not a visitor", async () => {
    for (const fetcher of [
      answer({ error: "unavailable" }, 503),
      answer({ cartCount: -1, customer: null, suggestion: null }),
      answer("nope"),
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    ]) {
      expect(await loadVisitor("el-cy", "/", fetcher as unknown as typeof fetch)).toBe(false);
      expect(getSnapshot()).toBe("unknown");
    }
  });
});

describe("the store's new fields", () => {
  it("defaults a caller that names neither to a guest with nothing to suggest", () => {
    setVisitor({ cartCount: 1, consent: null });
    expect(getSnapshot()).toEqual({
      cartCount: 1,
      consent: null,
      customer: null,
      suggestion: null,
    });
  });

  it("tells its listeners when the customer or the suggestion changes, and only then", async () => {
    const { subscribe } = await import("./store");
    const listener = vi.fn();
    const stop = subscribe(listener);
    setVisitor({ cartCount: 1, consent: null, customer: { firstName: "A" } });
    setVisitor({ cartCount: 1, consent: null, customer: { firstName: "A" } });
    setVisitor({ cartCount: 1, consent: null, customer: { firstName: "A" }, suggestion });
    setVisitor({
      cartCount: 1,
      consent: null,
      customer: { firstName: "A" },
      suggestion: structuredClone(suggestion),
    });
    setVisitor({ cartCount: 1, consent: null, customer: null, suggestion });
    stop();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
