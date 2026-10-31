import { marketsProblems, planCountrySave, planSettingsSave } from "../checks";
import { seededState } from "./state.fixtures";

const codes = (problems: { code: string }[]) => problems.map((problem) => problem.code);

describe("planCountrySave", () => {
  it("opens a country that is in a region, with a language, and fills its language row", () => {
    const state = seededState({ languages: [] });
    const plan = planCountrySave(state, {
      code: "at",
      enabled: true,
      languages: ["de"],
      time_zone: "Europe/Vienna",
      domain: "https://Shop.Example.at/path",
    });
    expect(plan.problems).toEqual([]);
    expect(plan.country).toEqual({
      code: "at",
      enabled: true,
      languages: ["de"],
      domain: "shop.example.at",
      time_zone: "Europe/Vienna",
      rank: null,
    });
    expect(plan.newLanguages).toEqual([
      { code: "de", medusa_locale: "de-DE", html_lang: null, rank: null },
    ]);
  });

  it("starts a new country closed, and keeps what a save leaves out", () => {
    const fresh = planCountrySave(seededState(), { code: "at", time_zone: "Europe/Vienna" });
    expect(fresh.problems).toEqual([]);
    expect(fresh.country).toMatchObject({
      enabled: false,
      languages: [],
      time_zone: "Europe/Vienna",
    });

    const kept = planCountrySave(seededState(), { code: "ch", domain: "shop.example.ch" });
    expect(kept.country).toMatchObject({
      enabled: true,
      languages: ["de", "fr"],
      time_zone: "Europe/Zurich",
      rank: 5,
      domain: "shop.example.ch",
    });
    const cleared = planCountrySave(seededState(), { code: "ch", time_zone: null });
    expect(cleared.country.time_zone).toBeNull();
  });

  it("refuses a country in no region", () => {
    const plan = planCountrySave(seededState(), { code: "br", enabled: false });
    expect(codes(plan.problems)).toEqual(["country_not_in_region"]);
    expect(plan.problems[0]!.message).toContain("Settings → Regions");
  });

  it("refuses a malformed country code", () => {
    expect(codes(planCountrySave(seededState(), { code: "CYP" }).problems)).toContain(
      "country_code_invalid",
    );
  });

  it("refuses to open a country with no language", () => {
    expect(codes(planCountrySave(seededState(), { code: "at", enabled: true }).problems)).toEqual([
      "country_open_without_language",
    ]);
  });

  it("refuses a language the store has no locale for", () => {
    const plan = planCountrySave(seededState(), { code: "at", enabled: true, languages: ["it"] });
    expect(codes(plan.problems)).toEqual(["language_not_in_store"]);
    expect(plan.problems[0]!.message).toContain("en-US, el-GR, de-DE, fr-FR");
  });

  it("refuses a language of two store locales when no row says which", () => {
    const state = seededState({
      storeLocales: ["en-US", "el-GR", "de-DE", "de-CH", "fr-FR"],
      languages: [],
    });
    const plan = planCountrySave(state, { code: "at", enabled: true, languages: ["de"] });
    expect(codes(plan.problems)).toEqual(["language_locale_ambiguous"]);
    // A row that says which is enough.
    const withRow = seededState({
      storeLocales: ["en-US", "el-GR", "de-DE", "de-CH", "fr-FR"],
    });
    expect(
      planCountrySave(withRow, { code: "at", enabled: true, languages: ["de"] }).problems,
    ).toEqual([]);
  });

  it("refuses a language whose stored locale left the store", () => {
    const state = seededState({ storeLocales: ["en-US", "el-GR", "fr-FR"] });
    expect(codes(planCountrySave(state, { code: "de", languages: ["de"] }).problems)).toEqual([
      "language_locale_gone",
    ]);
  });

  it("refuses a language outside Payload's 42, a bad code and a duplicate", () => {
    const state = seededState({ storeLocales: ["en-US", "is-IS", "de-DE"] });
    const plan = planCountrySave(state, { code: "at", languages: ["is", "DE!", "de", "de"] });
    expect(codes(plan.problems)).toEqual([
      "language_not_supported",
      "language_code_invalid",
      "language_duplicate",
    ]);
  });

  it("refuses a duplicate domain and a malformed one", () => {
    const state = seededState({
      countries: seededState().countries.map((row) =>
        row.code === "cy" ? { ...row, domain: "shop.example.cy" } : row,
      ),
    });
    expect(
      codes(planCountrySave(state, { code: "de", domain: "SHOP.example.cy:443" }).problems),
    ).toEqual(["domain_duplicate"]);
    expect(codes(planCountrySave(state, { code: "de", domain: "not a domain" }).problems)).toEqual([
      "domain_invalid",
    ]);
    // A country may keep its own domain.
    expect(planCountrySave(state, { code: "cy", domain: "shop.example.cy" }).problems).toEqual([]);
  });

  it("refuses an invalid time zone", () => {
    expect(
      codes(planCountrySave(seededState(), { code: "de", time_zone: "Mars/Olympus" }).problems),
    ).toEqual(["time_zone_invalid"]);
  });

  it("refuses closing the primary country and the fallback market's country", () => {
    expect(codes(planCountrySave(seededState(), { code: "cy", enabled: false }).problems)).toEqual([
      "primary_country_closed",
    ]);
    expect(codes(planCountrySave(seededState(), { code: "us", enabled: false }).problems)).toEqual([
      "fallback_country_closed",
    ]);
    expect(
      codes(planCountrySave(seededState(), { code: "us", languages: ["de"] }).problems),
    ).toEqual(["fallback_language_removed"]);
  });

  it("lists every problem, not only the first", () => {
    const plan = planCountrySave(seededState(), {
      code: "cy",
      enabled: false,
      domain: "no domain",
      time_zone: "Mars/Olympus",
    });
    expect(codes(plan.problems).sort()).toEqual(
      ["domain_invalid", "primary_country_closed", "time_zone_invalid"].sort(),
    );
  });
});

describe("planSettingsSave", () => {
  it("saves the primary country (and names its region for the store), the fallback and a language", () => {
    const plan = planSettingsSave(seededState(), {
      primary_country: "ch",
      fallback_market: "fr-ch",
      languages: [{ code: "de", medusa_locale: "de-DE", html_lang: "de-CH" }],
    });
    expect(plan.problems).toEqual([]);
    expect(plan.settings).toEqual({ primary_country: "ch", fallback_market: "fr-ch" });
    expect(plan.defaultRegionId).toBe("reg_ch");
    expect(plan.languages).toEqual([
      { code: "de", medusa_locale: "de-DE", html_lang: "de-CH", rank: 2 },
    ]);
  });

  it("leaves the store alone when no primary country is sent", () => {
    const plan = planSettingsSave(seededState(), { fallback_market: "de-de" });
    expect(plan.problems).toEqual([]);
    expect(plan.defaultRegionId).toBeNull();
    expect(plan.settings.primary_country).toBe("cy");
  });

  it("refuses a primary country that is not open, or in no region", () => {
    expect(codes(planSettingsSave(seededState(), { primary_country: "at" }).problems)).toEqual([
      "primary_country_not_open",
    ]);
    expect(codes(planSettingsSave(seededState(), { primary_country: "br" }).problems)).toEqual([
      "primary_country_not_open",
    ]);
    expect(codes(planSettingsSave(seededState(), { primary_country: "CYP" }).problems)).toEqual([
      "primary_country_invalid",
    ]);
  });

  it("refuses a fallback that is not an open country-language pair", () => {
    for (const fallback_market of ["de-ch-x", "es-es", "el-us", "en-at"]) {
      expect(planSettingsSave(seededState(), { fallback_market }).problems.length).toBe(1);
    }
    expect(codes(planSettingsSave(seededState(), { fallback_market: "cy" }).problems)).toEqual([
      "fallback_market_invalid",
    ]);
  });

  it("refuses a language mapped to a locale the store lacks, or of another language", () => {
    const plan = planSettingsSave(seededState(), {
      languages: [
        { code: "de", medusa_locale: "de-CH" },
        { code: "fr", medusa_locale: "de-DE" },
        { code: "en", medusa_locale: "en-US", html_lang: "en_US" },
        { code: "xx", medusa_locale: "en-US" },
        { code: "is", medusa_locale: "en-US" },
      ],
    });
    expect(codes(plan.problems)).toEqual([
      "language_locale_unknown",
      "language_locale_mismatch",
      "html_lang_invalid",
      "language_not_supported",
      "language_not_supported",
    ]);
  });
});

describe("marketsProblems", () => {
  it("has no warning for the seeded shop", () => {
    expect(marketsProblems(seededState())).toEqual([]);
  });

  it("warns when the primary country left every region", () => {
    const state = seededState({
      regionCountries: seededState().regionCountries.filter((country) => country.code !== "cy"),
    });
    expect(codes(marketsProblems(state))).toContain("primary_country_not_in_region");
  });

  it("warns when a store locale a market uses was removed", () => {
    const state = seededState({ storeLocales: ["en-US", "el-GR", "fr-FR"] });
    const problems = marketsProblems(state);
    expect(codes(problems)).toEqual(["language_locale_gone"]);
    expect(problems[0]!.message).toContain("de-DE");
  });

  it("warns about an open country without a language, and one in no region", () => {
    const state = seededState({
      countries: [
        ...seededState().countries,
        { code: "at", enabled: true, languages: [], domain: null, time_zone: null, rank: null },
        { code: "br", enabled: true, languages: ["pt"], domain: null, time_zone: null, rank: null },
      ],
    });
    expect(codes(marketsProblems(state))).toEqual([
      "open_country_not_in_region",
      "country_open_without_language",
    ]);
  });

  it("warns when nothing is set, or the fallback market closed", () => {
    expect(
      codes(
        marketsProblems(
          seededState({ settings: { primary_country: null, fallback_market: null } }),
        ),
      ),
    ).toEqual(["no_primary_country", "no_fallback_market"]);
    const closed = seededState({
      countries: seededState().countries.map((row) =>
        row.code === "us" ? { ...row, enabled: false } : row,
      ),
    });
    expect(codes(marketsProblems(closed))).toEqual(["fallback_market_not_open"]);
  });

  it("warns when the store's default region is not the primary country's region", () => {
    const problems = marketsProblems(seededState({ defaultRegionId: "reg_us" }));
    expect(codes(problems)).toEqual(["default_region_differs"]);
  });
});
