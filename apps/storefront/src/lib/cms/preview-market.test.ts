import { describe, expect, it } from "vitest";
import { findMarket } from "../markets/market";
import { seeded, withDomains } from "../markets/test-maps";
import { ownDomainPreview, ownDomainPreviewPath, ownDomainPreviewTarget } from "./preview-market";

// M7 D148 (3), T111: an own-domain market's preview on the admin's host, at its internal key.

describe("ownDomainPreview", () => {
  it("names an open market on another domain, and the path inside it", () => {
    expect(ownDomainPreview("/de-ch/about/team", "shop.example", withDomains)).toMatchObject({
      market: { key: "de-ch", domain: "shop.ch" },
      internalPath: "/about/team",
    });
    expect(ownDomainPreview("/fr-ch", "shop.example", withDomains)?.internalPath).toBe("");
    expect(ownDomainPreview("/fr-ch//x/", "shop.example", withDomains)?.internalPath).toBe("/x");
  });

  it("is nothing for a market on this host, on its own domain, or a path that is no key", () => {
    expect(ownDomainPreview("/de-de/about", "shop.example", withDomains)).toBeUndefined();
    expect(ownDomainPreview("/de-ch/about", "shop.ch", withDomains)).toBeUndefined();
    expect(ownDomainPreview("/de-ch/about", "SHOP.CH:443", withDomains)).toBeUndefined();
    expect(ownDomainPreview("/el-cy/about", "shop.example", seeded)).toBeUndefined();
    expect(ownDomainPreview("/", "shop.example", withDomains)).toBeUndefined();
    expect(ownDomainPreview("/about", "shop.example", withDomains)).toBeUndefined();
  });
});

describe("ownDomainPreviewPath", () => {
  it("takes a local path to such a market, with its query, and refuses what safeRedirect would", () => {
    expect(ownDomainPreviewPath("/de-ch/store?page=2#x", "shop.example", withDomains)).toBe(
      "/de-ch/store?page=2",
    );
    for (const bad of [null, "", "de-ch", "//de-ch", "/\\de-ch", "/de-ch/%2f", "/admin/de-ch"]) {
      expect(ownDomainPreviewPath(bad, "shop.example", withDomains), String(bad)).toBeNull();
    }
  });
});

describe("ownDomainPreviewTarget", () => {
  it("puts the market's key in front of the path inside it", () => {
    const swiss = findMarket(withDomains, "de-ch")!;
    expect(ownDomainPreviewTarget(swiss, "/")).toBe("/de-ch");
    expect(ownDomainPreviewTarget(swiss, "/about")).toBe("/de-ch/about");
    expect(ownDomainPreviewTarget(swiss, "/store?page=2#top")).toBe("/de-ch/store?page=2");
    expect(ownDomainPreviewTarget(swiss, "//evil.example")).toBe("/de-ch/evil.example");
  });
});
