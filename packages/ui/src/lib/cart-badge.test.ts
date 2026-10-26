import { describe, expect, it } from "vitest";
import { CART_BADGE_MAX, cartBadgeText } from "./cart-badge";

const OVERFLOW = "{max}+";

describe("cartBadgeText", () => {
  it("draws nothing for an unknown, empty or impossible count", () => {
    for (const count of [undefined, 0, -1, 2.5, Number.NaN]) {
      expect(cartBadgeText(count, "en", OVERFLOW)).toBeUndefined();
    }
  });

  it("writes the count in the market's digits up to the maximum", () => {
    expect(cartBadgeText(3, "en", OVERFLOW)).toBe("3");
    expect(cartBadgeText(CART_BADGE_MAX, "en", OVERFLOW)).toBe("99");
    expect(cartBadgeText(7, "ar-EG", OVERFLOW)).toBe("٧");
  });

  it("writes the catalog's overflow message above it", () => {
    expect(cartBadgeText(CART_BADGE_MAX + 1, "en", OVERFLOW)).toBe("99+");
  });
});
