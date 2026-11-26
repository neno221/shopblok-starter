import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_HEADER, clientHeader } from "./client-signature";
import {
  consumeLimit,
  emailKey,
  MEMORY_LIMIT_KEYS,
  memoryLimit,
  resetRateLimitLog,
} from "./rate-limit";

const visitor = new Headers({});
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "pk_test");
  vi.stubEnv("STOREFRONT_SIGNING_SECRET", "s");
  resetRateLimitLog();
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const answer = (status: number, body: unknown) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe("consumeLimit (M7 D142)", () => {
  it("asks Medusa's route, signed for the visitor, with the rule and the key", async () => {
    const fetcher = answer(200, { allowed: true, retryAfter: 0 });
    expect(await consumeLimit("form", "12", visitor, fetcher)).toEqual({ allowed: true });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe("http://medusa.test:9000/shopblok/rate-limit");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ rule: "form", key: "12" });
    const header = (init?.headers as Record<string, string>)[CLIENT_HEADER]!;
    expect(header.split(";").slice(0, 2)).toEqual(["v1", "127.0.0.1"]);
  });

  it("refuses only when Medusa says so, with whole seconds", async () => {
    expect(
      await consumeLimit(
        "newsletter",
        undefined,
        visitor,
        answer(200, { allowed: false, retryAfter: 41.2 }),
      ),
    ).toEqual({ allowed: false, retryAfter: 42 });
  });

  it("lets the request through on any other answer, logging once a minute", async () => {
    const thrown = vi.fn<typeof fetch>(async () => {
      throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
    });
    for (const fetcher of [
      answer(403, { type: "not_allowed" }),
      answer(200, { allowed: "no" }),
      thrown,
    ])
      expect(await consumeLimit("form", "1", visitor, fetcher)).toEqual({ allowed: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      "requests pass without the storefront's limits",
    );
  });

  it("lets it through without the signing secret, never calling Medusa", async () => {
    vi.stubEnv("STOREFRONT_SIGNING_SECRET", "");
    const fetcher = answer(200, { allowed: false, retryAfter: 9 });
    expect(await consumeLimit("form", "1", visitor, fetcher)).toEqual({ allowed: true });
    expect(fetcher).not.toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toContain("STOREFRONT_SIGNING_SECRET is not set");
  });
});

describe("emailKey", () => {
  it("is the trimmed, lower-case address's SHA-256", () => {
    expect(emailKey(" Ana@Example.com ")).toBe(emailKey("ana@example.com"));
    expect(emailKey("ana@example.com")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the base path of Medusa's address, and signs the path Medusa sees", async () => {
    vi.stubEnv("MEDUSA_BACKEND_URL", "https://api.example.test/medusa/");
    const fetcher = answer(200, { allowed: true, retryAfter: 0 });
    await consumeLimit("form", "12", visitor, fetcher);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe("https://api.example.test/medusa/shopblok/rate-limit");
    const header = (init?.headers as Record<string, string>)[CLIENT_HEADER]!;
    const [, address, time] = header.split(";");
    expect(header).toBe(
      clientHeader("s", {
        address: address!,
        time: Number(time),
        method: "POST",
        path: "/medusa/shopblok/rate-limit",
      }),
    );
  });
});

describe("memoryLimit (/next/csp-report)", () => {
  it("counts per address in a fixed window", () => {
    let now = 0;
    const limit = memoryLimit(2, 1000, () => now);
    expect([
      limit.hit("192.0.2.1"),
      limit.hit("192.0.2.1"),
      limit.hit("192.0.2.1"),
      limit.hit("192.0.2.2"),
    ]).toEqual([true, true, false, true]);
    now = 1000;
    expect(limit.hit("192.0.2.1")).toBe(true);
  });

  it("sweeps the windows that ended when it holds too many keys", () => {
    let now = 0;
    const limit = memoryLimit(1, 10, () => now);
    for (let n = 0; n < MEMORY_LIMIT_KEYS + 1; n += 1) limit.hit(`10.0.${n >> 8}.${n & 255}`);
    now = 20;
    limit.hit("192.0.2.1");
    // Swept: an old key starts a new window.
    expect(limit.hit("10.0.0.0")).toBe(true);
  });

  it("counts an IPv6 visitor by its /64, and a mapped IPv4 address as IPv4", () => {
    const limit = memoryLimit(2, 60_000, () => 0);
    expect(limit.hit("2001:db8:1:2::a")).toBe(true);
    expect(limit.hit("2001:db8:1:2:ffff::1")).toBe(true);
    expect(limit.hit("2001:0db8:0001:0002::9")).toBe(false);
    expect(limit.hit("2001:db8:1:3::a")).toBe(true);
    expect([limit.hit("::ffff:203.0.113.7"), limit.hit("203.0.113.7")]).toEqual([true, true]);
    expect(limit.hit("203.0.113.7")).toBe(false);
  });

  it("keeps an address that is over its limit through a flood of new ones", () => {
    let now = 0;
    const limit = memoryLimit(1, 60_000, () => now);
    const flood = (from: number, count: number) => {
      for (let n = from; n < from + count; n += 1)
        limit.hit(`10.${n >> 16}.${(n >> 8) & 255}.${n & 255}`);
    };
    limit.hit("203.0.113.7");
    expect(limit.hit("203.0.113.7")).toBe(false);
    flood(0, MEMORY_LIMIT_KEYS - 10);
    now = 1;
    expect(limit.hit("203.0.113.7")).toBe(false);
    // Full of live windows: the ones hit longest ago give way, not the address still posting.
    flood(MEMORY_LIMIT_KEYS, MEMORY_LIMIT_KEYS - 10);
    expect(limit.hit("203.0.113.7")).toBe(false);
  });
});
