import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seeded } from "../../../lib/markets/test-maps";
import type { RedirectList } from "../../../lib/redirects/rules";

const reads = vi.hoisted(() => ({
  list: { redirects: [] } as RedirectList,
  fail: false,
}));

vi.mock("../../../lib/markets/cached-market-map", () => ({
  getRenderMarketMap: async () => seeded,
}));
vi.mock("../../../lib/redirects/read", () => ({
  readRedirectList: async () => {
    if (reads.fail) throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    return reads.list;
  },
}));

const { GET, HEAD } = await import("./route");

/** The request as a host that hands on the rewritten URL has it: the file's name in `?file=`. */
const rewritten = (file: string, { method = "GET", query = "", host = "localhost:8000" } = {}) =>
  new NextRequest(
    `http://${host}/next/missing-file?file=${encodeURIComponent(file)}${query === "" ? "" : `&${query}`}`,
    { method, headers: { host } },
  );

/** The request as `next start` hands it to the route: the visitor's own URL. */
const visitor = (path: string, method = "GET") =>
  new NextRequest(`http://localhost:8000${path}`, { method, headers: { host: "localhost:8000" } });

beforeEach(() => {
  reads.list = { redirects: [] };
  reads.fail = false;
});

// D54 (T28): what `next.config.ts`'s root-file rewrite answers. `markets.spec.ts` checks the same
// on `next start`.
describe("/next/missing-file", () => {
  it("answers GET with a plain-text 404 that no cache keeps", async () => {
    const response = await GET(rewritten("wp-login.php"));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
    expect(await response.text()).toBe("Not Found");
  });

  it("answers HEAD with the same status and headers, and no body", async () => {
    const response = await HEAD(rewritten("wp-login.php", { method: "HEAD" }));
    expect(response.status).toBe(404);
    const get = await GET(rewritten("wp-login.php"));
    expect(Object.fromEntries(response.headers)).toEqual(Object.fromEntries(get.headers));
    expect(response.body).toBeNull();
  });

  it("answers the 404 when the request names no file", async () => {
    const response = await GET(new NextRequest("http://localhost:8000/next/missing-file"));
    expect(response.status).toBe(404);
  });
});

// M7 D147 (T110): a CMS redirect from a root file is answered before the 404, as the proxy
// answers one from any other path.
describe("/next/missing-file looks the CMS redirects up first", () => {
  beforeEach(() => {
    reads.list = {
      redirects: [
        { from: "/catalog.pdf", type: "308", to: { url: "/store" } },
        { from: "/us/price-list.pdf", type: "301", to: { url: "/store" } },
      ],
    };
  });

  it("answers the redirect's own code on a GET, inside the market the host's root is", async () => {
    const response = await GET(rewritten("catalog.pdf"));
    expect(response.status).toBe(308);
    // The primary market (Cyprus) is at the root: `/store` without a prefix.
    expect(response.headers.get("location")).toBe("http://localhost:8000/store");
  });

  it("keeps the visitor's query, without the rewrite's `file`", async () => {
    const response = await GET(rewritten("catalog.pdf", { query: "utm_source=print" }));
    expect(response.headers.get("location")).toBe("http://localhost:8000/store?utm_source=print");
  });

  it("reads the visitor's own URL, as `next start` hands it on, with its whole query", async () => {
    const response = await GET(visitor("/catalog.pdf?utm_source=print&file=x"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "http://localhost:8000/store?utm_source=print&file=x",
    );
    expect((await GET(visitor("/other.pdf"))).status).toBe(404);
  });

  it("answers HEAD the same way", async () => {
    const response = await HEAD(rewritten("catalog.pdf", { method: "HEAD" }));
    expect(response.status).toBe(308);
  });

  it("answers the 404 for a file no redirect names", async () => {
    const response = await GET(rewritten("other.pdf"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("answers the 404 for a file whose redirect belongs to another market", async () => {
    // `/us/price-list.pdf` is the US market's, at a path no rewrite sends here.
    const response = await GET(rewritten("price-list.pdf"));
    expect(response.status).toBe(404);
  });

  it("refuses a `file` with a slash, which no rewrite sends", async () => {
    const response = await GET(rewritten("us/price-list.pdf"));
    expect(response.status).toBe(404);
  });
});

// PR 155's review: the lookup never turns the plain 404 into a 500.
describe("/next/missing-file when the redirects cannot be read", () => {
  it("answers the plain 404, with a warning", async () => {
    reads.fail = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await GET(rewritten("wp-login.php"));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("Not Found");
    expect((await HEAD(rewritten("wp-login.php", { method: "HEAD" }))).status).toBe(404);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^missing-file: no redirect looked up/),
    );
    warn.mockRestore();
  });
});
