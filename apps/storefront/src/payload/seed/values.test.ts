import { describe, expect, it } from "vitest";
import { comparable, seededUpdate } from "./values";

describe("seededUpdate", () => {
  it("fills an empty field", () => {
    for (const empty of [undefined, null, ""]) {
      expect(seededUpdate(empty, { value: "Home" })).toBe("Home");
    }
  });

  it("changes nothing when the field holds the seed's value", () => {
    expect(seededUpdate("Home", { value: "Home" })).toBeNull();
    expect(seededUpdate({ a: [1] }, { value: { a: [1] } })).toBeNull();
  });

  it("replaces a value an earlier seed wrote", () => {
    expect(seededUpdate("Welcome", { value: "Home", before: ["Start", "Welcome"] })).toBe("Home");
  });

  it("keeps an editor's value", () => {
    expect(seededUpdate("Our shop", { value: "Home", before: ["Welcome"] })).toBeNull();
  });
});

describe("comparable (T61)", () => {
  it("drops Payload's row ids and what holds nothing, so a read-back equals what was written", () => {
    expect(
      comparable({
        title: { en: "Shop", el: null },
        links: [
          { id: "a1", link: { type: "custom", url: "/store", newTab: null, label: { en: "All" } } },
        ],
        empty: [],
        note: "",
        on: false,
      }),
    ).toEqual({
      title: { en: "Shop" },
      links: [{ link: { type: "custom", url: "/store", label: { en: "All" } } }],
      on: false,
    });
  });

  it("is undefined for a field never written", () => {
    expect(comparable(null)).toBeUndefined();
    expect(comparable({ label: { en: null } })).toBeUndefined();
  });
});
