import { afterEach, describe, expect, it, vi } from "vitest";
import { pickVariant, resetVariantLog } from "./variant";

// D99: a family's entry file draws the member of the stored `variant`, and the first member for a
// value the family does not have, saying so once. The spacer has one member, and M5 gives it no
// other (plan §1a), so `overlay` and `bento` are values it does not have.
const members = { standard: "standard member" } as const;

afterEach(() => {
  resetVariantLog();
  vi.restoreAllMocks();
});

describe("pickVariant", () => {
  it("draws the member of the variant, and the first when there is none", () => {
    expect(pickVariant("spacer", members, "standard")).toBe("standard member");
    expect(pickVariant("spacer", members, undefined)).toBe("standard member");
  });

  it("draws the first member for an unknown value and logs it once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(pickVariant("spacer", members, "overlay")).toBe("standard member");
    expect(pickVariant("spacer", members, "overlay")).toBe("standard member");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe(
      'spacer: no variant "overlay" (a value from another version?); drawing "standard".',
    );
    pickVariant("spacer", members, "bento");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("takes no inherited key for a member", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(pickVariant("spacer", members, "toString")).toBe("standard member");
  });
});
