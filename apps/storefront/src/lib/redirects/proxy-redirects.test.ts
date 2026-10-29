import { describe, expect, it, vi } from "vitest";
import { REDIRECTS_TTL_MS, createProxyRedirects } from "./proxy-redirects";

// D82 (T68): the proxy's copy of `/next/redirects`, with the market map's fetch-and-memo rules.

const OLD = { from: "/old", type: "301", to: { url: "/new" } };
const OTHER = { from: "/other", type: "302", to: { paths: { en: "/about" } } };

function fakeFetch(answers: (() => Response | Promise<Response>)[]) {
  const calls: string[] = [];
  const fetcher = (async (input: URL | RequestInfo) => {
    calls.push(String(input));
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

const refused = () => {
  throw new TypeError("fetch failed");
};

function setup(answers: (() => Response | Promise<Response>)[]) {
  let t = 0;
  const warn = vi.fn();
  const { fetcher, calls } = fakeFetch(answers);
  const source = createProxyRedirects({
    env: { NODE_ENV: "production", NEXT_PUBLIC_BASE_URL: "https://shop.example" },
    fetcher,
    now: () => t,
    warn,
  });
  return { source, calls, warn, advance: (ms: number) => (t += ms) };
}

describe("the proxy's redirects", () => {
  it("reads /next/redirects on the configured origin, and keeps the list for 30 s", async () => {
    const { source, calls, advance } = setup([json({ redirects: [OLD] })]);
    expect(await source.get()).toEqual({ redirects: [OLD] });
    advance(REDIRECTS_TTL_MS - 1);
    await source.get();
    expect(calls).toEqual(["https://shop.example/next/redirects"]);
  });

  it("past the 30 s answers with the list it holds and reads the new one meanwhile", async () => {
    const { source, calls, advance } = setup([
      json({ redirects: [OLD] }),
      json({ redirects: [OLD, OTHER] }),
    ]);
    await source.get();
    advance(REDIRECTS_TTL_MS);
    expect(await source.get()).toEqual({ redirects: [OLD] });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    await vi.waitFor(async () => expect((await source.get()).redirects).toHaveLength(2));
  });

  it("keeps the last good list when a read fails", async () => {
    const { source, advance, warn } = setup([json({ redirects: [OLD] }), refused]);
    await source.get();
    advance(REDIRECTS_TTL_MS);
    await source.get();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/read earlier/)),
    );
    expect(await source.get()).toEqual({ redirects: [OLD] });
  });

  it("answers without redirects, and says so, when the first read fails", async () => {
    const { source, warn } = setup([json({}, 500)]);
    expect(await source.get()).toEqual({ redirects: [] });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/answered 500.*without redirects/));
  });

  it("checks what it reads: another app's answer is no list, and a broken entry is dropped", async () => {
    const other = setup([json({ countries: [] })]);
    expect(await other.source.get()).toEqual({ redirects: [] });
    expect(other.warn).toHaveBeenCalledWith(expect.stringMatching(/did not answer a list/));
    const broken = setup([
      json({ redirects: [OLD, { from: "/x", type: "307", to: { url: "/y" } }, { from: 1 }, null] }),
    ]);
    expect(await broken.source.get()).toEqual({ redirects: [OLD] });
  });
});
