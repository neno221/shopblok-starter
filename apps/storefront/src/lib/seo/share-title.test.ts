import { describe, expect, it } from "vitest";
import { shareImageFor, OG_IMAGE_SIZE } from "./og-image";
import {
  SHARE_TITLE_MAX,
  shareTitleQuery,
  shareTitleText,
  verifiedShareTitle,
} from "./share-title";

// M7 D147 (T110): the page's title on the market's share picture, signed so the shop's host draws
// only the titles its own pages named.

const SECRET = "test-signing-secret-of-thirty-two-chars";
const params = (query: string) => new URLSearchParams(query.slice(1));

describe("the share picture's title", () => {
  it("is verified for the market it was signed for", () => {
    const query = shareTitleQuery("en-us", "Linen shirt", SECRET);
    expect(verifiedShareTitle("en-us", params(query), SECRET)).toBe("Linen shirt");
  });

  it("keeps Greek and other scripts as they are", () => {
    const query = shareTitleQuery("el-cy", "Λινό πουκάμισο", SECRET);
    expect(verifiedShareTitle("el-cy", params(query), SECRET)).toBe("Λινό πουκάμισο");
  });

  it("is refused when altered, for another market, under another key or unsigned", () => {
    const query = params(shareTitleQuery("en-us", "Linen shirt", SECRET));
    const altered = new URLSearchParams(query);
    altered.set("title", "Free money at evil.example");
    expect(verifiedShareTitle("en-us", altered, SECRET)).toBeUndefined();
    expect(verifiedShareTitle("en-gb", query, SECRET)).toBeUndefined();
    expect(verifiedShareTitle("en-us", query, `${SECRET}x`)).toBeUndefined();
    expect(
      verifiedShareTitle("en-us", new URLSearchParams({ title: "Linen shirt" }), SECRET),
    ).toBeUndefined();
    const short = new URLSearchParams(query);
    short.set("sig", "abc");
    expect(verifiedShareTitle("en-us", short, SECRET)).toBeUndefined();
  });

  it("is left out without a secret or a title", () => {
    expect(shareTitleQuery("en-us", "Linen shirt", undefined)).toBe("");
    expect(shareTitleQuery("en-us", "Linen shirt", "  ")).toBe("");
    expect(shareTitleQuery("en-us", undefined, SECRET)).toBe("");
    expect(shareTitleQuery("en-us", "   ", SECRET)).toBe("");
    expect(
      verifiedShareTitle("en-us", params(shareTitleQuery("en-us", "x", SECRET)), undefined),
    ).toBeUndefined();
  });

  it("is one line, cut at SHARE_TITLE_MAX characters", () => {
    expect(shareTitleText("  Linen\n  shirt ")).toBe("Linen shirt");
    const long = shareTitleText("a ".repeat(200));
    expect(long.length).toBe(SHARE_TITLE_MAX);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("shareImageFor", () => {
  const url = (path: string) => `https://shop.example/us${path}`;

  it("is the market's picture at its public address, with the page's title signed on it", () => {
    const image = shareImageFor(url, "en-us", "Kalimera", SECRET)("Linen shirt");
    expect(image).toMatchObject({ alt: "Linen shirt", ...OG_IMAGE_SIZE });
    const address = new URL(image.src);
    expect(address.origin + address.pathname).toBe("https://shop.example/us/share-image");
    expect(verifiedShareTitle("en-us", address.searchParams, SECRET)).toBe("Linen shirt");
  });

  it("is the market's card without a title, named after the shop", () => {
    expect(shareImageFor(url, "en-us", "Kalimera", SECRET)()).toEqual({
      src: "https://shop.example/us/share-image",
      alt: "Kalimera",
      ...OG_IMAGE_SIZE,
    });
  });
});
