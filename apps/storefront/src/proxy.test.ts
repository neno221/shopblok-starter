import { readFileSync } from "node:fs";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

// `proxy.ts` can't be imported here (it loads Payload, and Vitest has no `@payload-config` alias),
// and Next reads `config.matcher` from the file's source as a literal. So the test reads the same
// literal, and fails if the file stops having one. (The docs call the helper `unstable_doesProxyMatch`;
// 16.4.0 still exports it as `unstable_doesMiddlewareMatch`.)
function matcherOfProxyFile(): string {
  const source = readFileSync(new URL("./proxy.ts", import.meta.url), "utf8");
  const found = /matcher:\s*\[\s*("(?:[^"\\]|\\.)*")\s*\]/.exec(source);
  if (found?.[1] === undefined) throw new Error('proxy.ts has no literal matcher: ["…"]');
  return JSON.parse(found[1]) as string;
}

const config = { matcher: [matcherOfProxyFile()] };
const runsOn = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("the proxy matcher", () => {
  it.each([
    "/",
    "/us",
    "/us/",
    "/ch/fr/store",
    "/store",
    "/products/shirt",
    "/el-cy", // an internal key: the proxy has to be the one to answer 404
    "/administrator", // starts like /admin, is a storefront path
    "/apis",
    "/nextstep",
    "/_not-found",
    "/cy/store?page=2",
  ])("runs on the storefront path %s", (url) => {
    expect(runsOn(url)).toBe(true);
  });

  it.each([
    "/admin",
    "/admin/",
    "/admin/collections/pages",
    "/admin/login",
    "/api",
    "/api/pages",
    "/api/users/first-register",
    "/next/preview",
    "/next/exit-preview",
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/_next/data/build/index.json",
    "/_vercel/insights/script.js",
    "/_vercel/insights/view", // no dot: only the /_vercel/ rule leaves it alone
    "/_vercel/speed-insights/vitals",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/images/logo.png",
    "/.well-known/security.txt",
  ])("leaves %s alone", (url) => {
    expect(runsOn(url)).toBe(false);
  });
});
