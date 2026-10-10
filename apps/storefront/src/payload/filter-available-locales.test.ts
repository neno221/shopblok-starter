import type { Locale, Payload, PayloadRequest } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMIT_GRACE_MS,
  ENABLED_LANGUAGES_TTL_MS,
  clearEnabledLanguages,
  clearEnabledLanguagesAfterSave,
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

/** One Payload instance (they all share the memo on `globalThis`), and a request of its own each time. */
function fakePayload(findGlobal: ReturnType<typeof vi.fn>) {
  return { findGlobal, logger: { warn: vi.fn() } } as unknown as Payload;
}
const requestOf = (payload: Payload) => ({ context: {}, payload }) as unknown as PayloadRequest;

describe("filterAvailableLocales", () => {
  let now = 0;
  beforeEach(() => {
    clearEnabledLanguages();
    now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });
  afterEach(() => vi.restoreAllMocks());

  it("reads markets once for the three calls Payload makes for one admin page, each with its own request", async () => {
    // S3, L7: the root layout twice and the page once, each with a copy of `req` and its `context`.
    const findGlobal = vi
      .fn()
      .mockResolvedValue({ countries: [{ enabled: true, languages: ["el"] }] });
    const payload = fakePayload(findGlobal);
    const results = [];
    for (let call = 0; call < 3; call++) {
      results.push(await filterAvailableLocales({ locales, req: requestOf(payload) }));
    }
    for (const result of results) expect(codes(result)).toEqual(["en", "el"]);
    expect(findGlobal).toHaveBeenCalledTimes(1);
  });

  it("shares the read between calls that start together", async () => {
    const findGlobal = vi.fn().mockResolvedValue({ countries: [] });
    const payload = fakePayload(findGlobal);
    await Promise.all([
      filterAvailableLocales({ locales, req: requestOf(payload) }),
      filterAvailableLocales({ locales, req: requestOf(payload) }),
      filterAvailableLocales({ locales, req: requestOf(payload) }),
    ]);
    expect(findGlobal).toHaveBeenCalledTimes(1);
  });

  it("reads again once the read is older than the memo's time", async () => {
    const findGlobal = vi
      .fn()
      .mockResolvedValueOnce({ countries: [{ enabled: true, languages: ["el"] }] })
      .mockResolvedValueOnce({ countries: [{ enabled: true, languages: ["el", "de"] }] });
    const payload = fakePayload(findGlobal);
    expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
      "en",
      "el",
    ]);
    now += ENABLED_LANGUAGES_TTL_MS - 1;
    await filterAvailableLocales({ locales, req: requestOf(payload) });
    expect(findGlobal).toHaveBeenCalledTimes(1);
    now += 1;
    expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
      "en",
      "el",
      "de",
    ]);
    expect(findGlobal).toHaveBeenCalledTimes(2);
  });

  it("reads again after clearEnabledLanguages, which saving markets calls", async () => {
    const findGlobal = vi
      .fn()
      .mockResolvedValueOnce({ countries: [] })
      .mockResolvedValueOnce({ countries: [{ enabled: true, languages: ["de"] }] });
    const payload = fakePayload(findGlobal);
    expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
      "en",
    ]);
    clearEnabledLanguages();
    expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
      "en",
      "de",
    ]);
  });

  it("clears again after a save has committed, for a read that started in between", async () => {
    // Payload commits the save's transaction after the global's `afterChange` hooks: a page that
    // reads in that gap gets the old `markets`, and must not keep it for the memo's whole time.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const findGlobal = vi
        .fn()
        .mockResolvedValueOnce({ countries: [] })
        .mockResolvedValueOnce({ countries: [{ enabled: true, languages: ["de"] }] });
      const payload = fakePayload(findGlobal);
      clearEnabledLanguagesAfterSave();
      expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
        "en",
      ]);
      await vi.advanceTimersByTimeAsync(COMMIT_GRACE_MS);
      expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
        "en",
        "de",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps its memo where every copy of the module sees it (the layout and the page load their own)", async () => {
    const findGlobal = vi.fn().mockResolvedValue({ countries: [] });
    const payload = fakePayload(findGlobal);
    await filterAvailableLocales({ locales, req: requestOf(payload) });
    vi.resetModules();
    const other = await import("./filter-available-locales");
    await other.filterAvailableLocales({ locales, req: requestOf(payload) });
    expect(findGlobal).toHaveBeenCalledTimes(1);
    // ... and the other copy's clear reaches the first copy's memo.
    other.clearEnabledLanguages();
    await filterAvailableLocales({ locales, req: requestOf(payload) });
    expect(findGlobal).toHaveBeenCalledTimes(2);
  });

  it("does not hand one Payload instance the read of another", async () => {
    const first = vi.fn().mockResolvedValue({ countries: [{ enabled: true, languages: ["el"] }] });
    const second = vi.fn().mockResolvedValue({ countries: [{ enabled: true, languages: ["fr"] }] });
    expect(
      codes(await filterAvailableLocales({ locales, req: requestOf(fakePayload(first)) })),
    ).toEqual(["en", "el"]);
    expect(
      codes(await filterAvailableLocales({ locales, req: requestOf(fakePayload(second)) })),
    ).toEqual(["en", "fr"]);
  });

  it("does not keep a read that failed", async () => {
    const outage = Object.assign(new Error("connection terminated"), { code: "ECONNRESET" });
    const findGlobal = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed query", { cause: outage }))
      .mockResolvedValueOnce({ countries: [{ enabled: true, languages: ["el"] }] });
    const payload = fakePayload(findGlobal);
    await expect(filterAvailableLocales({ locales, req: requestOf(payload) })).rejects.toThrow(
      "Failed query",
    );
    expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
      "en",
      "el",
    ]);
  });

  it("is not scoped to the user or to the request: the read overrides access and takes no req", async () => {
    const findGlobal = vi.fn().mockResolvedValue({});
    await filterAvailableLocales({ locales, req: requestOf(fakePayload(findGlobal)) });
    expect(findGlobal).toHaveBeenCalledWith({ slug: "markets", depth: 0, overrideAccess: true });
  });

  it("inside a write's transaction it reads with that request and shares nothing", async () => {
    // Payload calls the filter from a create or update once `localizeStatus` is on, with the
    // transaction open. A read that left it would need a second connection while the write holds
    // the first, and it would not see what the write itself changed.
    const findGlobal = vi.fn().mockResolvedValue({ countries: [] });
    const payload = fakePayload(findGlobal);
    const inTransaction = { ...requestOf(payload), transactionID: "tx-1" } as PayloadRequest;
    await filterAvailableLocales({ locales, req: inTransaction });
    await filterAvailableLocales({ locales, req: inTransaction });
    expect(findGlobal).toHaveBeenCalledTimes(2);
    expect(findGlobal).toHaveBeenNthCalledWith(1, {
      slug: "markets",
      depth: 0,
      overrideAccess: true,
      req: inTransaction,
    });
    // ... and it did not fill the memo that page loads share.
    await filterAvailableLocales({ locales, req: requestOf(payload) });
    expect(findGlobal).toHaveBeenCalledTimes(3);
  });

  it("falls back to English when the markets table does not exist (before migrate)", async () => {
    const payload = fakePayload(vi.fn().mockRejectedValue(missingTable()));
    expect(codes(await filterAvailableLocales({ locales, req: requestOf(payload) }))).toEqual([
      "en",
    ]);
  });

  it("lets any other error fail the request instead of hiding the markets", async () => {
    const outage = Object.assign(new Error("connection terminated"), { code: "ECONNRESET" });
    const payload = fakePayload(
      vi.fn().mockRejectedValue(new Error("Failed query", { cause: outage })),
    );
    await expect(filterAvailableLocales({ locales, req: requestOf(payload) })).rejects.toThrow(
      "Failed query",
    );
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
