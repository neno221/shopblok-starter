import {
  languageName,
  localesOfLanguage,
  marketName,
  storeLanguages,
  timeZoneOptions,
} from "../../admin/lib/format";
import { failureOf } from "../../admin/lib/refusal";
import {
  localeIsGone,
  settingsBody,
  showsLocale,
  startLocale,
  type SettingsForm,
} from "../../admin/lib/settings-form";
import type { MarketsOverview as AdminOverview } from "../../admin/lib/types";
import type { MarketsOverview } from "../overview";
import { languageOfLocale } from "../formats";
import { MarketsRefused, problemsOf, refusalMessage } from "../refusal";

// Type test (checked by `pnpm typecheck`, not run): what the route answers is what the panels read.
type Assert<T extends true> = T;
type _AnswerFitsPanels = Assert<MarketsOverview extends AdminOverview ? true : false>;
type _SameFields = Assert<keyof MarketsOverview extends keyof AdminOverview ? true : false>;
type _NoMissingFields = Assert<keyof AdminOverview extends keyof MarketsOverview ? true : false>;
export type { _AnswerFitsPanels, _SameFields, _NoMissingFields };

describe("the panels' refusal reader", () => {
  it("reads back the reasons the plugin put in a refusal's message", () => {
    const problems = [
      {
        code: "primary_country_closed",
        message: "cy is the primary country; it cannot be closed.",
      },
      { code: "other", message: "A second reason." },
    ];
    const message = new MarketsRefused(problems).message;
    expect(message).toBe(refusalMessage(problems));
    expect(problemsOf(message)).toEqual(problems.map((problem) => problem.message));
    expect(failureOf(new Error(message))).toEqual({
      reasons: problems.map((problem) => problem.message),
      message,
    });
  });

  it("is the server's own reader: one copy of the header and the lines", () => {
    // The admin imports `src/lib/refusal-text.ts`; the server's `refusal.ts` re-exports it.
    const message = `${refusalMessage([{ message: "One." }, { message: "Two." }])}\n`;
    expect(problemsOf(message)).toEqual(["One.", "Two."]);
    expect(failureOf(new Error(message)).reasons).toEqual(["One.", "Two."]);
  });

  it("leaves another error as its own text", () => {
    expect(problemsOf("Unauthorized")).toBeUndefined();
    expect(failureOf(new Error("Unauthorized"))).toEqual({
      reasons: [],
      message: "Unauthorized",
    });
    expect(failureOf("boom")).toEqual({ reasons: [], message: "boom" });
  });
});

describe("the panels' format helpers", () => {
  const locales = ["en-US", "de-DE", "de-CH", "fr-FR"];

  it("takes the languages of the store's locales, each once", () => {
    expect(storeLanguages(locales)).toEqual(["en", "de", "fr"]);
    expect(localesOfLanguage(locales, "de")).toEqual(["de-DE", "de-CH"]);
    expect(localesOfLanguage(locales, "fr")).toEqual(["fr-FR"]);
  });

  it("takes the language of a locale as the server does", () => {
    // One definition (`languageOfLocale`): what the panels offer is what the checks accept.
    expect(storeLanguages(["zh-Hant-TW", "DE-at", "el"])).toEqual(
      ["zh-Hant-TW", "DE-at", "el"].map(languageOfLocale),
    );
    expect(storeLanguages(["zh-Hant-TW", "DE-at", "el"])).toEqual(["zh", "de", "el"]);
  });

  it("names a language and a market", () => {
    expect(languageName("de", "en")).toBe("German");
    expect(languageName("zz-not-a-code!", "en")).toBe("zz-not-a-code!");
    expect(marketName("de-ch", { ch: "Switzerland" }, "en")).toBe("German · Switzerland");
    expect(marketName("de-xx", {}, "en")).toBe("German · XX");
  });

  it("lists the zones Intl knows, plus the stored one when Intl does not", () => {
    const zones = timeZoneOptions(null);
    expect(zones).toContain("Europe/Vienna");
    expect(timeZoneOptions("Europe/Vienna")).toEqual(zones);
    expect(timeZoneOptions("Mars/Olympus")).toContain("Mars/Olympus");
  });
});

describe("the Store drawer's form", () => {
  const overview = (over: Partial<AdminOverview> = {}): AdminOverview => ({
    map: {},
    countries: [],
    regions: [],
    locales: ["en-US", "de-DE", "fr-FR"],
    languages: [
      { code: "en", medusa_locale: "en-US", html_lang: null, rank: 0 },
      { code: "de", medusa_locale: "de-DE", html_lang: "de-AT", rank: 1 },
    ],
    settings: { primary_country: "cy", fallback_market: "en-us" },
    default_region_id: "reg_1",
    problems: [],
    ...over,
  });
  const form = (over: Partial<SettingsForm> = {}): SettingsForm => ({
    primary: "cy",
    fallback: "en-us",
    htmlLang: { en: "", de: "de-AT" },
    locale: { en: "en-US", de: "de-DE" },
    matchDefaultRegion: false,
    ...over,
  });
  const inUse = ["en", "de"];

  it("sends nothing when nothing changed", () => {
    expect(settingsBody(overview(), inUse, form())).toEqual({});
  });

  it("does not re-send the primary country, so Medusa's default region is left alone", () => {
    // The default region differs from the primary country's (the D91 warning), and only an
    // `html_lang` is edited: the body must not carry `primary_country` (the server would set the
    // default region from it) nor the unchanged fallback market.
    const warned = overview({
      problems: [
        {
          code: "default_region_differs",
          message: "The default region differs.",
        },
      ],
    });
    expect(settingsBody(warned, inUse, form({ htmlLang: { en: "", de: "de-CH" } }))).toEqual({
      languages: [{ code: "de", medusa_locale: "de-DE", html_lang: "de-CH" }],
    });
  });

  it("does not re-send a stale fallback market the admin left alone", () => {
    const stale = overview({
      settings: { primary_country: "cy", fallback_market: "de-de" },
    });
    expect(
      settingsBody(stale, inUse, form({ fallback: "de-de", htmlLang: { en: "x", de: "de-AT" } })),
    ).toEqual({
      languages: [{ code: "en", medusa_locale: "en-US", html_lang: "x" }],
    });
  });

  it("sends a changed primary country or fallback market, and only that", () => {
    expect(settingsBody(overview(), inUse, form({ primary: "us" }))).toEqual({
      primary_country: "us",
    });
    expect(settingsBody(overview(), inUse, form({ fallback: "de-de" }))).toEqual({
      fallback_market: "de-de",
    });
  });

  it("sends the unchanged primary country when asked to match the default region", () => {
    expect(settingsBody(overview(), inUse, form({ matchDefaultRegion: true }))).toEqual({
      primary_country: "cy",
    });
  });

  it("sends a language only when its locale or html_lang changed, an emptied html_lang as null", () => {
    expect(settingsBody(overview(), inUse, form({ htmlLang: { en: "", de: "  " } }))).toEqual({
      languages: [{ code: "de", medusa_locale: "de-DE", html_lang: null }],
    });
    expect(
      settingsBody(
        overview({ locales: ["en-US", "de-DE", "de-CH"] }),
        inUse,
        form({ locale: { en: "en-US", de: "de-CH" } }),
      ),
    ).toEqual({
      languages: [{ code: "de", medusa_locale: "de-CH", html_lang: "de-AT" }],
    });
  });

  it("sends a language that has no row yet, once it has a locale, and none without one", () => {
    const without = overview({ languages: [], locales: ["en-US"] });
    expect(settingsBody(without, ["en", "de"], form({ locale: { en: "en-US", de: "" } }))).toEqual({
      languages: [{ code: "en", medusa_locale: "en-US", html_lang: null }],
    });
  });

  describe("a language whose saved store locale was removed in Medusa", () => {
    // German used de-DE; Store → Locales now has de-AT instead, so German has one locale left.
    const gone = overview({ locales: ["en-US", "de-AT", "fr-FR"] });

    it("starts from the locale that is left, not from the saved one", () => {
      expect(localeIsGone(gone, "de")).toBe(true);
      expect(localeIsGone(gone, "en")).toBe(false);
      expect(startLocale(gone, "de")).toBe("de-AT");
      expect(startLocale(gone, "en")).toBe("en-US");
      expect(startLocale(overview(), "de")).toBe("de-DE");
    });

    it("keeps the saved locale while it is still a store locale", () => {
      const two = overview({ locales: ["en-US", "de-CH", "de-DE"] });
      expect(startLocale(two, "de")).toBe("de-DE");
    });

    it("starts from nothing when the store has no locale of the language, and sends none", () => {
      const none = overview({ locales: ["en-US"] });
      expect(startLocale(none, "de")).toBe("");
      expect(
        settingsBody(
          none,
          inUse,
          form({
            locale: { en: "en-US", de: "" },
            htmlLang: { en: "", de: "de-AT" },
          }),
        ),
      ).toEqual({});
    });

    it("shows the locale for it, though the store has only one locale of it", () => {
      expect(showsLocale(gone, "de")).toBe(true);
      expect(showsLocale(gone, "en")).toBe(false);
      expect(showsLocale(overview({ locales: ["en-US", "de-DE", "de-CH"] }), "de")).toBe(true);
      expect(showsLocale(overview(), "de")).toBe(false);
    });

    it("sends the replacement locale, which the server accepts, not the removed one", () => {
      const start = Object.fromEntries(inUse.map((code) => [code, startLocale(gone, code)]));
      expect(settingsBody(gone, inUse, form({ locale: start }))).toEqual({
        languages: [{ code: "de", medusa_locale: "de-AT", html_lang: "de-AT" }],
      });
    });
  });
});
