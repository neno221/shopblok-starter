import { describe, expect, it } from "vitest";
import { findMarket } from "../markets/market";
import { seeded, withDomains } from "../markets/test-maps";
import {
  compileRedirects,
  compiledFor,
  loopProblem,
  redirectCode,
  redirectFor,
  redirectLocation,
} from "./match";
import type { RedirectEntry } from "./rules";

// D82 (T68). `seeded` is SPEC §8.5's map: Cyprus (Greek) at `/`, the US at `/us`, Germany at
// `/de`, Switzerland at `/ch` (German) and `/ch/fr` (French).

const market = (key: string, map = seeded) => findMarket(map, key)!;
const to = (url: string): RedirectEntry["to"] => ({ url });
const entry = (from: string, target: RedirectEntry["to"], type: RedirectEntry["type"] = "301") => ({
  from,
  type,
  to: target,
});

describe("matching", () => {
  const everywhere = entry("/old", to("/new"));
  const german = entry("/de/old", to("/neu"));
  const swissFrench = entry("/ch/fr/old", to("/nouveau"));
  const swiss = entry("/ch/alt", to("/neu"));
  const compiled = compileRedirects(
    { redirects: [everywhere, german, swissFrench, swiss] },
    seeded,
  );

  it("a from without a market prefix matches in every market", () => {
    for (const key of ["el-cy", "en-us", "en-gb", "fr-fr", "de-ch"])
      expect(redirectFor(compiled, market(key), "/old"), key).toBe(everywhere);
  });

  it("a from with a market's prefix matches in that market only, and wins there", () => {
    expect(redirectFor(compiled, market("de-de"), "/old")).toBe(german);
    expect(redirectFor(compiled, market("fr-ch"), "/old")).toBe(swissFrench);
    // `/ch/fr/old` is `/ch/fr`'s, not `/ch`'s: the longest prefix that fits.
    expect(redirectFor(compiled, market("de-ch"), "/fr/old")).toBeUndefined();
    expect(redirectFor(compiled, market("de-ch"), "/alt")).toBe(swiss);
    expect(redirectFor(compiled, market("fr-ch"), "/alt")).toBeUndefined();
    expect(redirectFor(compiled, market("en-us"), "/alt")).toBeUndefined();
  });

  it("ignores a trailing slash and escapes, and nothing else", () => {
    expect(redirectFor(compiled, market("en-us"), "/old/")).toBe(everywhere);
    const greek = compileRedirects({ redirects: [entry("/παλιό", to("/new"))] }, seeded);
    expect(redirectFor(greek, market("el-cy"), "/%CF%80%CE%B1%CE%BB%CE%B9%CF%8C")).toBeDefined();
    expect(redirectFor(compiled, market("en-us"), "/Old")).toBeUndefined();
    expect(redirectFor(compiled, market("en-us"), "/old/more")).toBeUndefined();
  });

  it("compiles a list once per list and map", () => {
    const list = { redirects: [everywhere] };
    expect(compiledFor(list, seeded)).toBe(compiledFor(list, seeded));
    expect(compiledFor(list, withDomains)).not.toBe(compiledFor(list, seeded));
  });
});

describe("where a redirect sends", () => {
  it("a path inside the market, with the market's prefix", () => {
    const redirect = entry("/old", to("/new?ref=1"));
    expect(redirectLocation(redirect, market("el-cy"), seeded)).toBe("/new?ref=1");
    expect(redirectLocation(redirect, market("en-us"), seeded)).toBe("/us/new?ref=1");
    expect(redirectLocation(redirect, market("fr-ch"), seeded)).toBe("/ch/fr/new?ref=1");
    // A market on its own domain gets its domain's URL.
    expect(redirectLocation(redirect, market("el-cy", withDomains), withDomains)).toBe(
      "https://shop.com.cy/new?ref=1",
    );
  });

  it("a full URL as written", () => {
    const redirect = entry("/old", to("https://other.example/new"));
    expect(redirectLocation(redirect, market("en-us"), seeded)).toBe("https://other.example/new");
  });

  it("a page or post at its address in the market's language, or nowhere without one", () => {
    const redirect = entry("/old", { paths: { en: "/about", el: "/%CF%83" } });
    expect(redirectLocation(redirect, market("en-us"), seeded)).toBe("/us/about");
    expect(redirectLocation(redirect, market("el-cy"), seeded)).toBe("/%CF%83");
    expect(redirectLocation(redirect, market("de-de"), seeded)).toBeUndefined();
  });
});

describe("the status (D82)", () => {
  it.each([
    ["301", "GET", 301],
    ["301", "HEAD", 301],
    ["302", "GET", 302],
    ["308", "GET", 308],
    ["301", "POST", 308],
    ["308", "POST", 308],
    ["302", "POST", 307],
    ["302", "PUT", 307],
    ["301", "DELETE", 308],
  ] as const)("a %s answers %s with %i", (type, method, status) => {
    expect(redirectCode(type, method)).toBe(status);
  });
});

describe("loops and chains are refused on save (D82)", () => {
  it("a redirect to its own from", () => {
    expect(loopProblem(entry("/old", to("/old/")), [], seeded)).toMatch(/its own address/);
    // A page whose English address is the from, in a market that speaks English.
    expect(loopProblem(entry("/about", { paths: { en: "/about" } }), [], seeded)).toMatch(
      /its own address/,
    );
  });

  it("a market-only one to its own path inside the market", () => {
    expect(loopProblem(entry("/de/old", to("/old")), [], seeded)).toMatch(/its own address/);
  });

  it("a redirect to another redirect's from", () => {
    const others = [entry("/new", to("/newer"))];
    expect(loopProblem(entry("/old", to("/new")), others, seeded)).toMatch(/to \/new, which/);
  });

  it("a redirect from where another one sends", () => {
    const others = [entry("/old", to("/new"))];
    expect(loopProblem(entry("/new", to("/newer")), others, seeded)).toMatch(
      /\/old already redirects to \/new/,
    );
  });

  it("only where both apply: a market-only from does not chain in another market", () => {
    expect(loopProblem(entry("/old", to("/new")), [entry("/de/new", to("/x"))], seeded)).toMatch(
      /which redirects too/,
    );
    expect(
      loopProblem(entry("/us/old", to("/new")), [entry("/de/new", to("/x"))], seeded),
    ).toBeUndefined();
  });

  it("saving a redirect again is no chain with its stored self", () => {
    const self = entry("/old", to("/new"));
    expect(loopProblem(self, [self, entry("/other", to("/elsewhere"))], seeded)).toBeUndefined();
  });

  it("a full URL never loops", () => {
    expect(loopProblem(entry("/old", to("https://shop.example/old")), [], seeded)).toBeUndefined();
  });
});
