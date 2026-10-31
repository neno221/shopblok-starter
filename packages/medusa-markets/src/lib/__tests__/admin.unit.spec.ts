import {
  languageName,
  localesOfLanguage,
  marketName,
  storeLanguages,
  timeZoneOptions,
} from "../../admin/lib/format";
import { failureOf, refusalReasons } from "../../admin/lib/refusal";
import type { MarketsOverview as AdminOverview } from "../../admin/lib/types";
import type { MarketsOverview } from "../overview";
import { MarketsRefused, refusalMessage } from "../refusal";

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
    expect(refusalReasons(message)).toEqual(problems.map((problem) => problem.message));
    expect(failureOf(new Error(message))).toEqual({
      reasons: problems.map((problem) => problem.message),
      message,
    });
  });

  it("leaves another error as its own text", () => {
    expect(refusalReasons("Unauthorized")).toBeUndefined();
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
