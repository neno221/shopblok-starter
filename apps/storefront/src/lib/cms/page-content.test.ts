import { CmsPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { findMarket } from "../markets/market";
import { seeded } from "../markets/test-maps";
import { cmsPageContent, pageHeading } from "./page-content";
import { pagePaths } from "./page-path";
import { resolveLayout, type LayoutBlock } from "./resolve/sections";

const paths = pagePaths([
  { id: 1, slug: "σχετικά", title: "Σχετικά", parent: null },
  { id: 2, slug: "ομάδα", title: "Η ομάδα μας", parent: 1 },
]);
const words = { home: "Αρχική", url: (path: string) => (path === "/" ? "/" : path) };

describe("cmsPageContent", () => {
  it("gives a page under a parent its breadcrumbs, their links encoded", () => {
    const content = cmsPageContent({ id: 2, title: "Η ομάδα μας" }, paths, words);
    expect(CmsPage.parse({ ...content, heading: "title" })).toEqual({
      ...content,
      heading: "title",
    });
    expect(content).toEqual({
      title: "Η ομάδα μας",
      breadcrumbs: {
        trail: [
          { label: "Αρχική", href: "/" },
          { label: "Σχετικά", href: `/${encodeURIComponent("σχετικά")}` },
        ],
        current: "Η ομάδα μας",
      },
    });
  });

  it("gives a top-level page none", () => {
    expect(cmsPageContent({ id: 1, title: "Σχετικά" }, paths, words)).toEqual({ title: "Σχετικά" });
  });
});

describe("pageHeading", () => {
  it("gives the h1 to a hero that opens the page, else to the title", () => {
    expect(pageHeading([{ blockType: "hero" }, { blockType: "faq" }])).toBe("hero");
    expect(pageHeading([{ blockType: "faq" }, { blockType: "hero" }])).toBe("title");
    expect(pageHeading([])).toBe("title");
  });

  it("gives it to the title when the opening hero is not drawn (PR 98 review, item 1)", async () => {
    // Without the market's catalog the commerce blocks, the hero among them, are left out.
    const hero = [
      { blockType: "hero", id: "h", variant: "standard", heading: "Autumn" },
      { blockType: "spacer", id: "s", variant: "standard", size: "md" },
    ] as unknown as LayoutBlock[];
    const resolved = await resolveLayout(hero, {
      market: findMarket(seeded, "en-us")!,
      map: seeded,
    });
    expect(resolved.map((block) => block.blockType)).not.toContain("hero");
    expect(pageHeading(resolved)).toBe("title");
  });
});
