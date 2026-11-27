// M7 T109: Medusa's CORS lists as Medusa 2.23 reads them, checked against Medusa's own parser, and
// the doctor's rule for a deployment's lists.
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { anchored, corsAllows, corsProblems, parseCors } from "./cors-check.ts";

const backend = createRequire(path.resolve(import.meta.dirname, "../../apps/backend/package.json"));
const { parseCorsOrigins } = backend("@medusajs/framework/utils") as {
  parseCorsOrigins: (value: string) => (string | RegExp)[];
};

/** DEPLOY.md's example: the Swiss alias and the previews of project `shopblok`, team `acme`. */
const PREVIEWS = String.raw`/^https:\/\/(shopblok-ch|shopblok-[a-z0-9-]+-acme)\.vercel\.app$/`;
const STOREFRONT = "https://shopblok.vercel.app";
const BACKEND = "https://shopblok-server.up.railway.app";

describe("parseCors: the same as Medusa's parseCorsOrigins", () => {
  it.each([
    "",
    STOREFRONT,
    `${STOREFRONT},${PREVIEWS}`,
    `${STOREFRONT},${PREVIEWS},${BACKEND}`,
    "/^https:\\/\\/a\\.com$/gi",
    "/(unclosed/",
    "#^https://x\\.com$#",
    " https://spaced.com,,https://b.com/",
  ])("%j", (value) => {
    const ours = parseCors(value).map((entry) =>
      entry.kind === "origin" ? entry.value : `${entry.value.source}/${entry.value.flags}`,
    );
    const medusa = parseCorsOrigins(value).map((entry) =>
      typeof entry === "string" ? entry : `${entry.source}/${entry.flags}`,
    );
    expect(ours).toEqual(medusa);
  });
});

describe("corsProblems: a deployment's lists", () => {
  const store = `${STOREFRONT},${PREVIEWS}`;

  it("takes the values DEPLOY.md gives", () => {
    expect(corsProblems("STORE_CORS", store)).toEqual([]);
    expect(corsProblems("AUTH_CORS", `${store},${BACKEND}`)).toEqual([]);
    expect(corsProblems("ADMIN_CORS", BACKEND)).toEqual([]);
  });

  it("lets in the storefront, its Swiss alias and a preview, and no other origin", () => {
    const entries = parseCors(store);
    for (const origin of [
      STOREFRONT,
      "https://shopblok-ch.vercel.app",
      "https://shopblok-git-main-acme.vercel.app",
    ])
      expect(corsAllows(entries, origin)).toBe(true);
    for (const origin of [
      "https://other-git-main-acme.vercel.app",
      "https://shopblok-ch.vercel.app.evil.com",
      "http://shopblok-ch.vercel.app",
      `${STOREFRONT}/`,
    ])
      expect(corsAllows(entries, origin)).toBe(false);
  });

  it("refuses a blank list, a path, a trailing slash, http, a wildcard and a stray comma", () => {
    expect(corsProblems("STORE_CORS", "")).toEqual([expect.stringContaining("blank")]);
    expect(corsProblems("STORE_CORS", `${STOREFRONT}/`)[0]).toContain("not an https origin");
    expect(corsProblems("STORE_CORS", `${STOREFRONT}/shop`)[0]).toContain("not an https origin");
    expect(corsProblems("STORE_CORS", "http://shop.example")[0]).toContain("not an https origin");
    expect(corsProblems("STORE_CORS", "*").join(" ")).toContain("not an https origin");
    expect(corsProblems("STORE_CORS", `${STOREFRONT},`)).toEqual([
      expect.stringContaining("empty entry"),
    ]);
  });

  it("refuses a pattern without anchors, or one that lets in a foreign origin", () => {
    expect(corsProblems("STORE_CORS", String.raw`/shopblok\.vercel\.app/`)[0]).toContain(
      "must hold the whole origin",
    );
    expect(corsProblems("STORE_CORS", "/^https:\\/\\/.*\\.vercel\\.app$/")).toEqual([
      expect.stringContaining("lets in https://evil.vercel.app"),
    ]);
  });

  it("refuses a pattern whose | splits the anchors, or whose $ is escaped", () => {
    // `/^a|evil\.com$/` is `^a` or `evil\.com$`: it lets in https://attacker-evil.com.
    const split = String.raw`/^https:\/\/shop\.vercel\.app|evil\.com$/`;
    expect(corsAllows(parseCors(split), "https://attacker-evil.com")).toBe(true);
    expect(corsProblems("STORE_CORS", split)).toEqual([
      expect.stringContaining("must hold the whole origin"),
    ]);
    expect(corsProblems("STORE_CORS", String.raw`/^https:\/\/shop\.vercel\.app\$/`)).toEqual([
      expect.stringContaining("must hold the whole origin"),
    ]);
  });

  it("takes a | inside a group or a class", () => {
    expect(anchored(String.raw`^https:\/\/(shop|store)\.vercel\.app$`)).toBe(true);
    expect(anchored(String.raw`^https:\/\/shop[|-]a\.vercel\.app$`)).toBe(true);
    expect(anchored(String.raw`^(https:\/\/a\.app)|(https:\/\/b\.app)$`)).toBe(false);
    expect(
      corsProblems(
        "STORE_CORS",
        String.raw`/^https:\/\/shop-(git-[a-z0-9-]+|[a-z0-9]+)-team\.vercel\.app$/`,
      ),
    ).toEqual([]);
  });
});
