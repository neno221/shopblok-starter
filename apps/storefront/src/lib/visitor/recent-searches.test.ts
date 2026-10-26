// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRecentSearches,
  getRecentSearches,
  getServerRecentSearches,
  MAX_RECENT,
  rememberSearch,
  resetRecentSearches,
  subscribeRecentSearches,
} from "./recent-searches";

const KEY = "shopblok:recent-searches";

beforeEach(() => {
  window.localStorage.clear();
  resetRecentSearches();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recent searches (D66)", () => {
  it("is empty on the server, whatever the browser holds", () => {
    window.localStorage.setItem(KEY, JSON.stringify(["dress"]));
    expect(getServerRecentSearches()).toEqual([]);
    expect(getRecentSearches()).toEqual(["dress"]);
  });

  it("puts a query first, once, trimmed, and keeps the newest eight", () => {
    for (const query of ["a", "b", "c", "d", "e", "f", "g", "h", "i"]) rememberSearch(query);
    rememberSearch("  c ");
    rememberSearch("   ");
    const recent = getRecentSearches();
    expect(recent).toEqual(["c", "i", "h", "g", "f", "e", "d", "b"]);
    expect(recent).toHaveLength(MAX_RECENT);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null")).toEqual(recent);
  });

  it("gives the same snapshot until it changes, and tells its listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRecentSearches(listener);
    const before = getRecentSearches();
    expect(getRecentSearches()).toBe(before);
    rememberSearch("boots");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRecentSearches()).not.toBe(before);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    rememberSearch("hat");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reads only strings, and nothing from storage that is not a list", () => {
    window.localStorage.setItem(KEY, JSON.stringify(["ok", 3, "", null, "fine"]));
    expect(getRecentSearches()).toEqual(["ok", "fine"]);
    resetRecentSearches();
    window.localStorage.setItem(KEY, "{not json");
    expect(getRecentSearches()).toEqual([]);
    resetRecentSearches();
    window.localStorage.setItem(KEY, JSON.stringify({ query: "x" }));
    expect(getRecentSearches()).toEqual([]);
  });

  it("keeps working for the page when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(getRecentSearches()).toEqual([]);
    rememberSearch("scarf");
    expect(getRecentSearches()).toEqual(["scarf"]);
  });
});
