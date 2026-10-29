import { CmsPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { cmsPageContent } from "./page-content";
import { pagePaths } from "./page-path";

const paths = pagePaths([
  { id: 1, slug: "σχετικά", title: "Σχετικά", parent: null },
  { id: 2, slug: "ομάδα", title: "Η ομάδα μας", parent: 1 },
]);
const words = { home: "Αρχική", url: (path: string) => (path === "/" ? "/" : path) };

describe("cmsPageContent", () => {
  it("gives a page under a parent its breadcrumbs, their links encoded, and the title as heading", () => {
    const content = cmsPageContent({ id: 2, title: "Η ομάδα μας", layout: [] }, paths, words);
    expect(CmsPage.parse(content)).toEqual(content);
    expect(content).toEqual({
      title: "Η ομάδα μας",
      heading: "title",
      breadcrumbs: {
        trail: [
          { label: "Αρχική", href: "/" },
          { label: "Σχετικά", href: `/${encodeURIComponent("σχετικά")}` },
        ],
        current: "Η ομάδα μας",
      },
    });
  });

  it("gives a top-level page none, and a hero that opens the page the heading", () => {
    const hero = [{ blockType: "hero" }] as never;
    expect(cmsPageContent({ id: 1, title: "Σχετικά", layout: hero }, paths, words)).toEqual({
      title: "Σχετικά",
      heading: "hero",
    });
  });
});
