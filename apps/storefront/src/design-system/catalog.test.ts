import { LOCALES } from "@shopblok/i18n";
import { describe, expect, it, vi } from "vitest";
import {
  entryParams,
  entryPath,
  entrySegments,
  findEntry,
  framePath,
  GROUPS,
  localeParams,
  navigation,
  overviewPath,
} from "./catalog";
import { entries } from "./entries";
import type { DsEntry } from "./types";

vi.mock("next/root-params", () => ({ locale: vi.fn() }));

const testEntry = (id: string, group: DsEntry["group"] = "atoms"): DsEntry => ({
  id,
  group,
  label: id,
  summary: "A test entry.",
  a11y: ["A note."],
  live: () => null,
});

describe("the manifest", () => {
  it("has entries, in the groups the navigation lists", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(GROUPS, entry.id).toContain(entry.group);
  });

  it("gives every entry an id of the form {group}/{slug}, unique, that no route can mistake", () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of entries) {
      expect(entry.id, entry.id).toMatch(new RegExp(`^${entry.group}/[a-z0-9]+(-[a-z0-9]+)*$`));
      // `frame` is the first segment of the frame routes; a group can never be called that.
      expect(entrySegments(entry)[0], entry.id).not.toBe("frame");
    }
  });

  it("gives every entry a label, a summary and at least one a11y note", () => {
    for (const entry of entries) {
      expect(entry.label.trim(), entry.id).not.toBe("");
      expect(entry.summary.trim(), entry.id).not.toBe("");
      expect(entry.a11y.length, entry.id).toBeGreaterThan(0);
      for (const note of entry.a11y) expect(note.trim(), entry.id).not.toBe("");
    }
  });
});

describe("the generated params (manifest × the four locales)", () => {
  it("lists every entry once in each locale, as the page and the frame take them", () => {
    const params = entryParams();
    expect(params).toHaveLength(entries.length * LOCALES.length);
    for (const locale of ["en", "el", "de", "fr"]) {
      for (const entry of entries) {
        const matches = params.filter(
          (param) => param.locale === locale && param.entry.join("/") === entry.id,
        );
        expect(matches, `${locale} ${entry.id}`).toHaveLength(1);
      }
    }
    // Nothing else: every param is an entry of the manifest in a locale of the four.
    for (const param of params) {
      expect(["en", "el", "de", "fr"]).toContain(param.locale);
      expect(findEntry(param.entry), param.entry.join("/")).toBeDefined();
    }
  });

  it("lists the four locales for the layouts", () => {
    expect(localeParams()).toEqual([
      { locale: "en" },
      { locale: "el" },
      { locale: "de" },
      { locale: "fr" },
    ]);
  });

  it("has a page and a frame path for each param", () => {
    for (const { locale, entry: segments } of entryParams()) {
      const entry = findEntry(segments);
      expect(entry).toBeDefined();
      expect(entryPath(locale, entry!)).toBe(`/design-system/${locale}/${segments.join("/")}`);
      expect(framePath(locale, entry!)).toBe(
        `/design-system/${locale}/frame/${segments.join("/")}`,
      );
    }
  });

  it("follows a manifest it is given, not only ours", () => {
    const custom = [testEntry("atoms/one"), testEntry("atoms/two")];
    expect(entryParams(custom)).toHaveLength(2 * LOCALES.length);
    expect(entryParams(custom)).toContainEqual({
      locale: "el",
      entry: ["atoms", "two"],
    });
  });
});

describe("findEntry", () => {
  it("finds an entry by its path segments and answers undefined for anything else", () => {
    expect(findEntry(["foundations", "colors"])?.label).toBe("Colors");
    expect(findEntry(["atoms", "button"])?.label).toBe("Button");
    for (const segments of [
      [],
      ["foundations"],
      ["foundations", "nope"],
      ["foundations", "colors", "extra"],
      ["frame", "foundations", "colors"],
      ["Foundations", "colors"],
      ["atoms", "nope"],
    ]) {
      expect(findEntry(segments), segments.join("/")).toBeUndefined();
    }
  });
});

describe("navigation", () => {
  it("lists a group only when it has entries, in the group order", () => {
    expect(navigation(entries).map((section) => section.group)).toEqual(["foundations", "atoms"]);
    const foundationsOnly = navigation([testEntry("foundations/b", "foundations")]);
    expect(foundationsOnly.map((section) => section.group)).toEqual(["foundations"]);
    const both = navigation([testEntry("atoms/a"), testEntry("foundations/b", "foundations")]);
    expect(both.map((section) => section.group)).toEqual(["foundations", "atoms"]);
  });

  it("keeps the manifest's order inside a group", () => {
    const group = navigation([testEntry("atoms/b"), testEntry("atoms/a")])[0];
    expect(group?.entries.map((entry) => entry.id)).toEqual(["atoms/b", "atoms/a"]);
  });

  it("has an overview path per locale", () => {
    expect(overviewPath("el")).toBe("/design-system/el");
  });
});
