import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_HEADER } from "./client-signature";
import { consumeLimit, emailKey, memoryLimit, resetRateLimitLog } from "./rate-limit";

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
});

describe("memoryLimit (/next/csp-report)", () => {
  it("counts per key in a fixed window", () => {
    let now = 0;
    const limit = memoryLimit(2, 1000, () => now);
    expect([limit.hit("a"), limit.hit("a"), limit.hit("a"), limit.hit("b")]).toEqual([
      true,
      true,
      false,
      true,
    ]);
    now = 1000;
    expect(limit.hit("a")).toBe(true);
  });

  it("sweeps the windows that ended when it holds too many keys", () => {
    let now = 0;
    const limit = memoryLimit(1, 10, () => now);
    for (let n = 0; n < 5_001; n += 1) limit.hit(`k${n}`);
    now = 20;
    limit.hit("new");
    // Swept: an old key starts a new window.
    expect(limit.hit("k0")).toBe(true);
  });
});
