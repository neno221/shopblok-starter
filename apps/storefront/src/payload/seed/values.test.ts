import { describe, expect, it } from "vitest";
import { seededUpdate } from "./values";

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
