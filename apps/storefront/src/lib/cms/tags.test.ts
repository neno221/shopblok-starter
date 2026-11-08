import { describe, expect, it } from "vitest";
import { CONTENT_GLOBALS } from "./globals";
import {
  CATALOG_CONTENT_TAG,
  embeddingTags,
  formTags,
  linkedTags,
  pageTags,
  postTags,
} from "./tags";

// D73's tag lists: what a change to a document others embed refreshes, in one language. The
// `templates` global (D101, T79) embeds uploads, forms and catalog documents once T87 gives it its
// default sections, so it is refreshed with the other content globals.
describe("the tag lists (D73, D101)", () => {
  it("lists the four content globals, `templates` among them", () => {
    expect(CONTENT_GLOBALS).toEqual(["header", "footer", "site-settings", "templates"]);
  });

  it("refreshes every content global, the pages and the posts when an embedded document changes", () => {
    expect(embeddingTags("el")).toEqual([
      "global:header:el",
      "global:footer:el",
      "global:site-settings:el",
      "global:templates:el",
      ...pageTags("el"),
      ...postTags("el"),
    ]);
  });

  it("adds the catalog's content for a linked document, and a form's own reads for a form", () => {
    expect(linkedTags("de")).toEqual([...embeddingTags("de"), "cms:catalog"]);
    expect(formTags("fr")).toEqual(["forms:fr", ...embeddingTags("fr"), "cms:catalog"]);
    for (const tags of [embeddingTags("en"), linkedTags("en"), formTags("en")])
      expect(tags).toContain("global:templates:en");
  });
});

// D104 (T87): a product's, a category's or a collection's sections may hold a form (a newsletter or a
// form block), and their reads carry `cms:catalog` (`catalog.ts`), so a changed form refreshes them.
describe("a changed form refreshes the catalog's sections (D104)", () => {
  it("formTags names the catalog's content tag in every language", () => {
    for (const locale of ["en", "el", "de", "fr"]) {
      expect(formTags(locale)).toContain(CATALOG_CONTENT_TAG);
      expect(formTags(locale)).toContain(`global:templates:${locale}`);
    }
  });
});
