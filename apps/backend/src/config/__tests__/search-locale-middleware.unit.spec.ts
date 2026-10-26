import {
  chooseSearchLocale,
  localizeSearchBody,
} from "../../api/store/search/locale";

const SUPPORTED = ["en-US", "el-GR", "de-DE", "fr-FR"];

describe("chooseSearchLocale", () => {
  it("keeps a locale the store supports, whatever its case", () => {
    expect(chooseSearchLocale("el-GR", SUPPORTED)).toBe("el-GR");
    expect(chooseSearchLocale("el-gr", SUPPORTED)).toBe("el-GR");
  });

  it("falls back to the default locale for anything else", () => {
    // `normalizeLocale` passes these through unchanged, so the request can carry them.
    for (const requested of ["zz-ZZ", "it-IT", "el", "en-US-x-y-z", "../etc", "", undefined]) {
      expect(chooseSearchLocale(requested, SUPPORTED)).toBe("en-US");
    }
  });

  it("falls back to the default locale when the store has none", () => {
    expect(chooseSearchLocale("el-GR", [])).toBe("en-US");
  });
});

describe("localizeSearchBody", () => {
  it("overwrites the caller's locales with the request's, for a provider that takes them", () => {
    const body = {
      entity: "product",
      search_options: { locales: ["zz-ZZ", "de-DE"], facets: [{ field: "category_ids" }] },
    };

    localizeSearchBody(body, "el-GR", () => true);

    expect(body.search_options).toEqual({
      locales: ["el-GR"],
      facets: [{ field: "category_ids" }],
    });
  });

  it("removes the caller's locales for a provider that refuses them, and keeps the rest", () => {
    const body = {
      entity: "product",
      search_options: { locales: ["de-DE"], typo_tolerance: true },
    };

    localizeSearchBody(body, "el-GR", () => false);

    expect(body.search_options).toEqual({ typo_tolerance: true });
  });

  it("handles every query of a multi-query body, each by its own index", () => {
    const body = {
      queries: [
        { entity: "product" },
        { entity: "meili", search_options: { locales: ["fr-FR"] } },
      ],
    };

    localizeSearchBody(body, "de-DE", (entity) => entity === "meili");

    expect(body.queries).toEqual([
      { entity: "product", search_options: {} },
      { entity: "meili", search_options: { locales: ["de-DE"] } },
    ]);
  });
});
