import type { Locale, Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  enabledLanguages,
  filterAvailableLocales,
  pickAvailableLocales,
} from "./filter-available-locales";

const locales: Locale[] = ["en", "el", "de", "fr", "pt"].map((code) => ({ code, label: code }));
const codes = (list: Locale[]) => list.map((locale) => locale.code);

describe("enabledLanguages", () => {
  it("collects the languages of the enabled countries", () => {
    const markets = {
      countries: [
        { enabled: true, languages: ["el"] },
        { enabled: true, languages: ["de", "fr"] },
        { enabled: false, languages: ["pt"] },
      ],
    };
    expect([...enabledLanguages(markets)].sort()).toEqual(["de", "el", "fr"]);
  });

  it("treats an empty or missing global as nothing enabled", () => {
    expect(enabledLanguages({}).size).toBe(0);
    expect(enabledLanguages({ countries: null }).size).toBe(0);
    expect(enabledLanguages({ countries: [{ languages: null }] }).size).toBe(0);
  });

  it("counts a country with no `enabled` value as enabled", () => {
    expect([...enabledLanguages({ countries: [{ languages: ["el"] }] })]).toEqual(["el"]);
  });
});

describe("pickAvailableLocales", () => {
  it("keeps the enabled languages and English, in the config's order", () => {
    expect(codes(pickAvailableLocales(locales, new Set(["fr", "el"])))).toEqual(["en", "el", "fr"]);
  });

  it("always offers English, even when only another language is enabled", () => {
    expect(codes(pickAvailableLocales(locales, new Set(["el"])))).toEqual(["en", "el"]);
  });

  it("offers English alone when nothing is enabled, never an empty list", () => {
    expect(codes(pickAvailableLocales(locales, new Set()))).toEqual(["en"]);
  });

  it("still returns something when the list has no English", () => {
    const noEnglish = locales.filter((locale) => locale.code !== "en");
    expect(codes(pickAvailableLocales(noEnglish, new Set()))).toEqual(["el"]);
  });

  it("ignores an enabled language that is not preloaded", () => {
    expect(codes(pickAvailableLocales(locales, new Set(["ga"])))).toEqual(["en"]);
  });
});

function fakeRequest(findGlobal: ReturnType<typeof vi.fn>) {
  return {
    context: {},
    payload: { findGlobal, logger: { warn: vi.fn() } } as unknown as Payload,
  } as unknown as PayloadRequest;
}

describe("filterAvailableLocales", () => {
  it("reads markets once per request, however often Payload calls it", async () => {
    const findGlobal = vi
      .fn()
      .mockResolvedValue({ countries: [{ enabled: true, languages: ["el"] }] });
    const req = fakeRequest(findGlobal);
    const first = await filterAvailableLocales({ locales, req });
    const second = await filterAvailableLocales({ locales, req });
    expect(codes(first)).toEqual(["en", "el"]);
    expect(codes(second)).toEqual(["en", "el"]);
    expect(findGlobal).toHaveBeenCalledTimes(1);
  });

  it("shares the read between two calls that start together", async () => {
    const findGlobal = vi.fn().mockResolvedValue({ countries: [] });
    const req = fakeRequest(findGlobal);
    await Promise.all([
      filterAvailableLocales({ locales, req }),
      filterAvailableLocales({ locales, req }),
    ]);
    expect(findGlobal).toHaveBeenCalledTimes(1);
  });

  it("reads again for the next request", async () => {
    const findGlobal = vi.fn().mockResolvedValue({ countries: [] });
    await filterAvailableLocales({ locales, req: fakeRequest(findGlobal) });
    await filterAvailableLocales({ locales, req: fakeRequest(findGlobal) });
    expect(findGlobal).toHaveBeenCalledTimes(2);
  });

  it("is not scoped to the user: the read overrides access, with the request", async () => {
    const findGlobal = vi.fn().mockResolvedValue({});
    const req = fakeRequest(findGlobal);
    await filterAvailableLocales({ locales, req });
    expect(findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "markets", overrideAccess: true, depth: 0, req }),
    );
  });

  it("falls back to English when markets cannot be read (before migrate)", async () => {
    const findGlobal = vi.fn().mockRejectedValue(new Error('relation "markets" does not exist'));
    const req = fakeRequest(findGlobal);
    expect(codes(await filterAvailableLocales({ locales, req }))).toEqual(["en"]);
  });
});
