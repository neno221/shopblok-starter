import { afterEach, describe, expect, it, vi } from "vitest";
import { pickVariant, resetVariantLog } from "./variant";

// D99: a family's entry file draws the member of the stored `variant`, and the first member for a
// value the family does not have, saying so once.
const members = { standard: "standard member" } as const;

afterEach(() => {
  resetVariantLog();
  vi.restoreAllMocks();
});

describe("pickVariant", () => {
  it("draws the member of the variant, and the first when there is none", () => {
    expect(pickVariant("hero", members, "standard")).toBe("standard member");
    expect(pickVariant("hero", members, undefined)).toBe("standard member");
  });

  it("draws the first member for an unknown value and logs it once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(pickVariant("hero", members, "overlay")).toBe("standard member");
    expect(pickVariant("hero", members, "overlay")).toBe("standard member");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe(
      'hero: no variant "overlay" (a value from another version?); drawing "standard".',
    );
    pickVariant("hero", members, "bento");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("takes no inherited key for a member", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(pickVariant("hero", members, "toString")).toBe("standard member");
  });
});
