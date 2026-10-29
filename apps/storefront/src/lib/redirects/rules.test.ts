import { describe, expect, it } from "vitest";
import { seeded, usOnly } from "../markets/test-maps";
import {
  customUrlProblem,
  fromProblem,
  marketPrefixes,
  normalizePath,
  referenceOf,
  storedEntry,
  takenFromProblem,
} from "./rules";

// D82 (T68). `seeded` is SPEC §8.5's map: Cyprus at `/`, the others at `/us`, `/de`, `/ch/fr`….

describe("normalizePath", () => {
  it.each([
    ["/old", "/old"],
    ["/old/", "/old"],
    ["//old//page/", "/old/page"],
    ["/", "/"],
    ["", "/"],
    ["/%CF%83%CF%87%CE%B5%CF%84%CE%B9%CE%BA%CE%AC", "/σχετικά"],
    ["/σχετικά", "/σχετικά"],
    ["/100%", "/100%"],
  ])("%s is %s", (path, normalized) => {
    expect(normalizePath(path)).toBe(normalized);
  });
});

describe("marketPrefixes", () => {
  it("lists every market that has a prefix, the primary market's home left out", () => {
    const prefixes = marketPrefixes(seeded).map((each) => each.prefix);
    expect(prefixes).toEqual(expect.arrayContaining(["/us", "/de", "/ch", "/ch/fr"]));
    expect(prefixes).not.toContain("");
  });
});

describe("fromProblem: what the proxy can never see is refused with the reason (D82)", () => {
  it.each(["/old", "/de/old", "/old-page/2", "/size-8.5", "/σχετικά", "/administrator"])(
    "accepts %s",
    (from) => {
      expect(fromProblem(from, seeded)).toBeUndefined();
    },
  );

  it.each([
    ["old", /single \//],
    ["//old", /single \//],
    ["/old?x=1", /without \? or #/],
    ["/old#top", /without \? or #/],
    ["/old page", /spaces/],
    ["/old.html", /looks like a file/],
    ["/catalog/old-catalog.PDF", /looks like a file/],
    ["/api/old", /\/api/],
    ["/admin", /\/admin/],
    ["/design-system/x", /\/design-system/],
    ["/next/markets", /\/next/],
    ["/_next/static/x", /\/_next/],
    ["/.well-known/x", /\/\.well-known/],
    ["/", /home/],
    ["/us", /home/],
    ["/ch/fr/", /home/],
  ])("refuses %s", (from, reason) => {
    expect(fromProblem(from, seeded)).toMatch(reason);
  });
});

describe("takenFromProblem: one redirect per address (PR 101 review, item 1)", () => {
  it("refuses a from that is another's once normalized, naming that one", () => {
    expect(takenFromProblem("/old/", [{ from: "/new" }, { from: "/old" }])).toMatch(
      /^\/old is the same address/,
    );
    expect(takenFromProblem("/caf%C3%A9", [{ from: "/café" }])).toMatch(/^\/café is the same/);
  });

  it("takes a new address, and a market's own copy of one", () => {
    expect(takenFromProblem("/old", [{ from: "/older" }, { from: null }])).toBeUndefined();
    expect(takenFromProblem("/de/old", [{ from: "/old" }])).toBeUndefined();
  });
});

describe("customUrlProblem", () => {
  it.each(["/new", "/new?ref=old", "/us-shipping", "https://other.example/new", "http://x.y"])(
    "accepts %s",
    (url) => {
      expect(customUrlProblem(url, seeded)).toBeUndefined();
    },
  );

  it("refuses a path with a market's prefix, which would get a second one", () => {
    expect(customUrlProblem("/de/new", seeded)).toMatch(/without \/de/);
    expect(customUrlProblem("/ch/fr/new", seeded)).toMatch(/without \/ch\/fr/);
    // With one country there is no country segment: `/us` is a page's address.
    expect(customUrlProblem("/us/new", usOnly)).toBeUndefined();
  });

  it.each(["new", "//evil.example", "/a b", "mailto:x@y.z", "https://"])("refuses %s", (url) => {
    expect(customUrlProblem(url, seeded)).toBeDefined();
  });
});

describe("a stored redirect as an entry", () => {
  const paths = { en: "/about", el: "/sxetika" };

  it("sends to a page or post at its addresses, populated or not", () => {
    const doc = {
      from: "/old",
      type: "301",
      to: { type: "reference", reference: { relationTo: "pages", value: 4 } },
    };
    expect(referenceOf(doc)).toEqual({ relationTo: "pages", id: 4 });
    expect(storedEntry(doc, () => paths)).toEqual({ from: "/old", type: "301", to: { paths } });
    const populated = {
      ...doc,
      to: { type: "reference", reference: { relationTo: "posts", value: { id: 9 } } },
    };
    expect(referenceOf(populated)).toEqual({ relationTo: "posts", id: 9 });
  });

  it("sends to a custom URL as written", () => {
    expect(
      storedEntry({ from: "/old", type: "302", to: { type: "custom", url: "/new" } }, () => paths),
    ).toEqual({ from: "/old", type: "302", to: { url: "/new" } });
  });

  it("is none without a from, a known type or a target", () => {
    const to = { type: "custom", url: "/new" };
    expect(storedEntry({ type: "301", to }, () => paths)).toBeUndefined();
    expect(storedEntry({ from: "/old", type: "307", to }, () => paths)).toBeUndefined();
    expect(
      storedEntry({ from: "/old", type: "301", to: { type: "custom" } }, () => paths),
    ).toBeUndefined();
    expect(
      storedEntry(
        {
          from: "/old",
          type: "301",
          to: { type: "reference", reference: { relationTo: "pages", value: 4 } },
        },
        () => undefined,
      ),
    ).toBeUndefined();
  });
});
