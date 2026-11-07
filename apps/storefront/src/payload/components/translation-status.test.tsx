import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./translation-status.css", () => ({}));
vi.mock("@payloadcms/ui", () => ({ useDocumentInfo: () => ({ lastUpdateTime: 1 }) }));

import { filteredLanguage, notTranslatedQuery } from "./not-translated-filter";
import { cellText, TranslationStatusView } from "./translation-status";
import type { TranslationStatus } from "../translation-status";

const STATUS: TranslationStatus = {
  texts: 3,
  languages: [
    {
      language: "el",
      state: "partial",
      missing: [{ path: "layout.0.heading", label: "Layout › Promo banner 1 › Heading" }],
    },
    { language: "de", state: "complete", missing: [] },
    {
      language: "fr",
      state: "not-started",
      missing: [
        { path: "title", label: "Title" },
        { path: "slug", label: "Slug" },
        { path: "layout.0.heading", label: "Layout › Promo banner 1 › Heading" },
      ],
    },
  ],
};

describe("the translation status in the sidebar (D107)", () => {
  it("says each language's state, naming the missing texts as links into that language's form", () => {
    const html = renderToStaticMarkup(
      <TranslationStatusView status={STATUS} languages={["el", "de", "fr"]} live={false} />,
    );
    expect(html).toContain('data-language="el" data-state="partial"');
    expect(html).toContain("1 to translate");
    expect(html).toContain('href="?locale=el#field-layout__0__heading"');
    expect(html).toContain("Layout › Promo banner 1 › Heading");
    expect(html).toMatch(/data-language="de" data-state="complete">.*complete/);
    // Not started: the list is there, folded.
    expect(html).toMatch(/data-language="fr" data-state="not-started"><details>/);
    expect(html).toContain("not started");
    expect(html).toContain('<details open="">');
  });

  it("says when there is nothing to count", () => {
    const empty = (status: TranslationStatus | null, languages: string[]) =>
      renderToStaticMarkup(
        <TranslationStatusView status={status} languages={languages} live={false} />,
      );
    expect(empty(null, ["el"])).toContain("Save it once");
    expect(empty(STATUS, [])).toContain("No open market has a language besides English");
    expect(empty({ texts: 0, languages: [] }, ["el"])).toContain(
      "English has no texts to translate",
    );
  });
});

describe("the list's column (D107)", () => {
  it("names what is left, language by language, or says complete", () => {
    expect(cellText(STATUS, ["el", "de", "fr"])).toBe(
      "Ελληνικά: 1 to translate; français: not started",
    );
    expect(
      cellText({ texts: 2, languages: [{ language: "el", state: "complete", missing: [] }] }, [
        "el",
      ]),
    ).toBe("Complete");
    expect(cellText({ texts: 0, languages: [] }, ["el"])).toBe("—");
  });
});

describe("“Not translated in …” on the UI strings list (D107)", () => {
  it("lists the language's messages with no value, in the form Payload's filter panel writes", () => {
    const query = notTranslatedQuery("el");
    const params = new URLSearchParams(query.slice(1));
    expect(params.get("locale")).toBe("el");
    expect(params.get("where[or][0][and][0][value][exists]")).toBe("false");
  });

  it("knows which language the list is filtered on, from the URL's flat or parsed form", () => {
    expect(filteredLanguage({ locale: "el", "where[or][0][and][0][value][exists]": "false" })).toBe(
      "el",
    );
    expect(
      filteredLanguage({
        locale: "de",
        where: { or: [{ and: [{ value: { exists: "false" } }] }] },
      }),
    ).toBe("de");
    expect(filteredLanguage({ locale: "el" })).toBeNull();
    expect(
      filteredLanguage({ locale: "en", "where[or][0][and][0][value][exists]": "false" }),
    ).toBeNull();
    expect(filteredLanguage(undefined)).toBeNull();
  });
});
