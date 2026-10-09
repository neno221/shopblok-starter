import type { Locale, Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  enabledLanguages,
  filterAvailableLocales,
  isMissingTable,
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

/** What drizzle throws for a query on a missing table: its own error, the driver's on `cause`. */
function missingTable() {
  const driver = Object.assign(new Error('relation "markets" does not exist'), { code: "42P01" });
  return new Error("Failed query", { cause: driver });
}

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

  it("falls back to English when the markets table does not exist (before migrate)", async () => {
    const findGlobal = vi.fn().mockRejectedValue(missingTable());
    const req = fakeRequest(findGlobal);
    expect(codes(await filterAvailableLocales({ locales, req }))).toEqual(["en"]);
  });

  it("lets any other error fail the request instead of hiding the markets", async () => {
    const outage = Object.assign(new Error("connection terminated"), { code: "ECONNRESET" });
    const req = fakeRequest(
      vi.fn().mockRejectedValue(new Error("Failed query", { cause: outage })),
    );
    await expect(filterAvailableLocales({ locales, req })).rejects.toThrow("Failed query");
  });
});

describe("isMissingTable", () => {
  it("finds Postgres undefined_table on the error or anywhere down its causes", () => {
    expect(isMissingTable(missingTable())).toBe(true);
    expect(isMissingTable(Object.assign(new Error("x"), { code: "42P01" }))).toBe(true);
  });

  it("is false for other errors and for things that are not errors", () => {
    expect(isMissingTable(new Error("x", { cause: { code: "42P01" } }))).toBe(false);
    expect(isMissingTable(Object.assign(new Error("x"), { code: "28P01" }))).toBe(false);
    expect(isMissingTable("42P01")).toBe(false);
    expect(isMissingTable(undefined)).toBe(false);
  });
});
