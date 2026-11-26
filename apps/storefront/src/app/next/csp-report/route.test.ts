import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY, REPORTING_API } from "../../../lib/security/csp-report.test";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

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

afterEach(() => {
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
    expect(String(warn.mock.calls[0]?.[0])).toContain("could not reach Sentry");
  });
});
