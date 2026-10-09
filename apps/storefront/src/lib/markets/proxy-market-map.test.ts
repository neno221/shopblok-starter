import { markets as seeded } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { MARKETS_ROUTE, createProxyMarketMap, marketsRouteUrl } from "./proxy-market-map";
import { MarketMapError } from "./source";
import { brazil } from "./test-maps";

/** A fake `fetch` that answers from a queue and records what it was asked. */
function fakeFetch(answers: (() => Response)[]) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const next = answers.length > 1 ? answers.shift() : answers[0];
    if (next === undefined) throw new Error("no answer queued");
    return next();
  }) as typeof fetch;
  return { fetcher, calls };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

const production = { NODE_ENV: "production" };
const development = { NODE_ENV: "development" };

describe("where the proxy reads the map", () => {
  it("is /next/markets on the configured base URL, or on localhost:8000", () => {
    expect(marketsRouteUrl({}).href).toBe("http://localhost:8000/next/markets");
    expect(marketsRouteUrl({ NEXT_PUBLIC_BASE_URL: "https://shop.example" }).href).toBe(
      "https://shop.example/next/markets",
    );
    expect(marketsRouteUrl({ NEXT_PUBLIC_BASE_URL: "https://shop.example/" }).href).toBe(
      "https://shop.example/next/markets",
    );
    expect(MARKETS_ROUTE).toBe("/next/markets");
  });

  it("an empty variable counts as unset", () => {
    expect(marketsRouteUrl({ NEXT_PUBLIC_BASE_URL: "" }).href).toBe(
      "http://localhost:8000/next/markets",
    );
  });

  it("asks that URL without the data cache, and gives up after a timeout", async () => {
    const { fetcher, calls } = fakeFetch([json(seeded)]);
    const source = createProxyMarketMap({
      env: { ...production, NEXT_PUBLIC_BASE_URL: "https://shop.example" },
      fetcher,
    });
    await source.get();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://shop.example/next/markets");
    expect(calls[0]?.init?.cache).toBe("no-store");
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("the map from the route", () => {
  it("is the route's JSON, as a market map", async () => {
    const { fetcher } = fakeFetch([json(seeded)]);
    const map = await createProxyMarketMap({ env: production, fetcher }).get();
    expect(map).toEqual(seeded);
  });

  it("is another shop's map with no change (D17)", async () => {
    const { fetcher } = fakeFetch([json(brazil)]);
    const map = await createProxyMarketMap({ env: production, fetcher }).get();
    expect(map.countries.map((country) => country.code)).toEqual(["br"]);
  });

  it("is read once for 30 s and again after", async () => {
    const { fetcher, calls } = fakeFetch([json(seeded)]);
    const time = clock();
    const source = createProxyMarketMap({ env: production, fetcher, now: time.now });
    await source.get();
    time.advance(29_999);
    await source.get();
    expect(calls).toHaveLength(1);
    time.advance(1);
    await source.get();
    expect(calls).toHaveLength(2);
  });

  it("is shared by callers that arrive while it is read", async () => {
    const { fetcher, calls } = fakeFetch([json(seeded)]);
    const source = createProxyMarketMap({ env: production, fetcher });
    await Promise.all([source.get(), source.get(), source.get()]);
    expect(calls).toHaveLength(1);
  });
});

describe("when the route cannot answer", () => {
  it("fails with the status and where to look, in production, with nothing read before", async () => {
    const { fetcher } = fakeFetch([json({ error: "x" }, 500)]);
    const source = createProxyMarketMap({ env: production, fetcher });
    await expect(source.get()).rejects.toThrow(
      "/next/markets answered 500; the reason is in the server log of that route",
    );
  });

  it("keeps serving the last good map through a failed refresh, with a warning", async () => {
    const { fetcher } = fakeFetch([json(seeded), json({}, 503)]);
    const time = clock();
    const warnings: string[] = [];
    const source = createProxyMarketMap({
      env: production,
      fetcher,
      now: time.now,
      warn: (message) => warnings.push(message),
    });
    expect(await source.get()).toEqual(seeded);
    time.advance(30_000);
    expect(await source.get()).toEqual(seeded);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("still serving the map read earlier");
  });

  it("does not trust an empty map: production refuses it", async () => {
    const empty = { countries: [], languages: [], primaryCountry: "", fallbackMarket: "" };
    const { fetcher } = fakeFetch([json(empty)]);
    const source = createProxyMarketMap({ env: production, fetcher });
    await expect(source.get()).rejects.toBeInstanceOf(MarketMapError);
  });

  it("does not trust an empty map: development uses the seeded one and says so", async () => {
    const empty = { countries: [], languages: [], primaryCountry: "", fallbackMarket: "" };
    const { fetcher } = fakeFetch([json(empty)]);
    const warnings: string[] = [];
    const source = createProxyMarketMap({
      env: development,
      fetcher,
      warn: (message) => warnings.push(message),
    });
    expect(await source.get()).toEqual(seeded);
    expect(warnings[0]).toContain("using the seeded fixtures");
  });

  it("does not hide an unreachable route in development: the developer should hear it", async () => {
    const fetcher = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const source = createProxyMarketMap({ env: development, fetcher });
    await expect(source.get()).rejects.toThrow("fetch failed");
  });
});
