import { formatMessage, formatNumber } from "@shopblok/i18n/format";

/**
 * The cart badge that CartButton, CartDrawer and QuickCartDropdown draw on the bag icon (T39's
 * review, item 8): the same digits, the same overflow rule and the same look in all three. The look is
 * `cart-badge-class.ts`, apart from this module, so the client islands that only draw the badge
 * do not bundle the formatter (PR 72's review, item 1).
 */

/** The most the badge writes out; more is the catalog's overflow message ("99+"). */
export const CART_BADGE_MAX = 99;

/**
 * The badge's digits in the market's locale: none for an empty cart or an unknown count (the
 * placeholder a prerendered page draws, D44), the overflow message above `CART_BADGE_MAX`.
 */
export function cartBadgeText(
  count: number | undefined,
  locale: string,
  overflow: string,
): string | undefined {
  if (count === undefined || !Number.isInteger(count) || count <= 0) {
    return undefined;
  }

  return count > CART_BADGE_MAX
    ? formatMessage(overflow, { max: formatNumber(CART_BADGE_MAX, locale) }, locale)
    : formatNumber(count, locale);
}
