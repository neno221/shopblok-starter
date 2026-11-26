import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY, REPORTING_API } from "../../../lib/security/csp-report.fixtures";

// `after()` runs its task at once here; `settled()` waits for the forwards it started.
const pending: Promise<unknown>[] = [];
vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
  after: (task: () => Promise<unknown>) => {
    pending.push(task());
  },
}));
const settled = async () => {
  await Promise.all(pending.splice(0));
};

const DSN = "http://e2esink@127.0.0.1:8970/1";

async function load() {
  vi.resetModules();
  return import("./route");
}

const post = (
  body: string,
  type = "application/csp-report",
  headers: Record<string, string> = {},
) =>
  new Request("http://localhost:8000/next/csp-report", {
    method: "POST",
    headers: { "content-type": type, "user-agent": "Mozilla/5.0 Test", ...headers },
    body,
  });

let fetchMock: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(async () => {
  await settled();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  warn.mockRestore();
});

describe("POST /next/csp-report (D140)", () => {
  it("forwards a report to Sentry's security endpoint without the query strings", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    const response = await POST(post(JSON.stringify(LEGACY)));
    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:8970/api/1/security/?sentry_key=e2esink");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/csp-report");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("Mozilla/5.0 Test");
    const sent = JSON.parse(String(init.body));
    expect(sent["csp-report"]["document-uri"]).toBe("https://shop.example.com/us/account/reset");
    expect(String(init.body)).not.toMatch(/token=|abc|s3cret|session=/);
  });

  it("forwards the Reporting API's format as report-uri's", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    const response = await POST(post(JSON.stringify(REPORTING_API), "application/reports+json"));
    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(sent["csp-report"]).toMatchObject({
      "document-uri": "https://shop.example.com/us",
      "blocked-uri": "inline",
      disposition: "report",
    });
  });

  it("drops the same violation within a minute", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    expect((await POST(post(JSON.stringify(LEGACY)))).status).toBe(204);
    expect((await POST(post(JSON.stringify(LEGACY)))).status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers 413 above 8 KB, declared or not", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    const big = JSON.stringify({
      "csp-report": { ...LEGACY["csp-report"], "script-sample": "x".repeat(9 * 1024) },
    });
    expect((await POST(post(big))).status).toBe(413);
    // A body that streams past the cap without a Content-Length.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const chunked = new Request("http://localhost:8000/next/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect((await POST(chunked)).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 415 for another media type and 400 for a body that is no report", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    expect((await POST(post(JSON.stringify(LEGACY), "application/json"))).status).toBe(415);
    expect((await POST(post("not json"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("without a DSN, logs one line per violation and answers 204", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const { POST } = await load();
    expect((await POST(post(JSON.stringify(LEGACY)))).status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toBe(
      "csp-report: enforce script-src-elem blocked https://evil.example.com/x.js on https://shop.example.com/us/account/reset",
    );
  });

  it("still answers 204 when Sentry cannot be reached", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const { POST } = await load();
    expect((await POST(post(JSON.stringify(LEGACY)))).status).toBe(204);
    await settled();
    expect(String(warn.mock.calls[0]?.[0])).toContain("could not reach Sentry");
  });

  it("answers before Sentry does (the forward runs after the response)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    let release: (() => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(new Response(null, { status: 200 }));
        }),
    );
    const { POST } = await load();
    expect((await POST(post(JSON.stringify(LEGACY)))).status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release?.();
    await settled();
  });

  /** A Reporting API entry of about 1 KB, as Chromium sends it (the policy repeated in each). */
  const entry = (n: number) => ({
    ...REPORTING_API[0],
    body: {
      ...REPORTING_API[0]!.body,
      blockedURL: `https://evil.example.com/${n}.js`,
      originalPolicy: `default-src 'self'; ${"script-src 'self' https://js.stripe.com; ".repeat(20)}`,
    },
  });

  it("takes a Reporting API batch past 8 KB, each entry held to 8 KB on its own", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    const batch = Array.from({ length: 10 }, (_, n) => entry(n));
    const oversized = { ...entry(99), body: { ...entry(99).body, sample: "x".repeat(9 * 1024) } };
    const text = JSON.stringify([...batch, oversized]);
    expect(text.length).toBeGreaterThan(8 * 1024);
    expect((await POST(post(text, "application/reports+json"))).status).toBe(204);
    await settled();
    expect(fetchMock).toHaveBeenCalledTimes(10);
    // Past the batch's 64 KB, a 413.
    const huge = JSON.stringify(Array.from({ length: 80 }, (_, n) => entry(n)));
    expect((await POST(post(huge, "application/reports+json"))).status).toBe(413);
  });

  it("forwards at most 100 violations a minute, and warns once past it", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    // Many visitors (CI's test header), so the per-address limit (T108) stays out of the way.
    vi.stubEnv("E2E_TEST_ROUTES", "true");
    const { POST } = await load();
    for (let n = 0; n < 101; n += 1) {
      const report = {
        "csp-report": {
          ...LEGACY["csp-report"],
          "blocked-uri": `https://evil.example.com/${n}.js`,
        },
      };
      const visitor = { "x-e2e-client-ip": `203.0.113.${n}` };
      expect((await POST(post(JSON.stringify(report), undefined, visitor))).status).toBe(204);
    }
    await settled();
    expect(fetchMock).toHaveBeenCalledTimes(100);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("over 100 violations this minute");
  });

  // M7 D142 (T108): per visitor's address, in this instance's memory, before anything is read.
  it("takes 30 posts a minute from one address, then answers 429 with Retry-After", async () => {
    vi.stubEnv("E2E_TEST_ROUTES", "true");
    const { POST } = await load();
    const from = (address: string) =>
      post(JSON.stringify(LEGACY), undefined, { "x-e2e-client-ip": address });
    for (let n = 0; n < 30; n += 1) expect((await POST(from("198.51.100.7"))).status).toBe(204);
    const refused = await POST(from("198.51.100.7"));
    expect([refused.status, refused.headers.get("retry-after")]).toEqual([429, "60"]);
    expect((await POST(from("198.51.100.8"))).status).toBe(204);
  });

  it("forwards an order transfer page's report without its id or token", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { POST } = await load();
    const report = {
      "csp-report": {
        ...LEGACY["csp-report"],
        "document-uri": "https://shop.example.com/us/order/order_01ABC/transfer/tr4nsferS3cret",
      },
    };
    expect((await POST(post(JSON.stringify(report)))).status).toBe(204);
    await settled();
    const body = String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body);
    expect(JSON.parse(body)["csp-report"]["document-uri"]).toBe(
      "https://shop.example.com/us/order/[id]/transfer/[token]",
    );
    expect(body).not.toMatch(/tr4nsferS3cret|order_01ABC/);
  });
});
