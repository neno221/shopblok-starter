import type { VariantOf } from "@shopblok/registry/contracts";
// The `templates` global's options that draw no member of a family (D101), shared by the global
// (`payload/globals/templates.ts`) and its read (`lib/cms/templates.ts`).

/** The quick view's option that draws none: the default, as M3 built the listing. */
export const QUICK_VIEW_OFF = "off";
/** The listing's one card with the button the quick view opens from: the quick view needs it. */
export const QUICK_VIEW_CARD = "quick-add";
/** The mini cart's option that draws none: a click on the header's cart opens the cart page. */
export const MINI_CART_PAGE = "page";
/** The mini cart with picks under its lines (T85): its picker shows the `picks` source. */
export const MINI_CART_PICKS = "drawer-picks" satisfies VariantOf<"mini-cart">;
/**
 * The drawer's forms, by their `data-slot` (T85): a line's quantity (the stepper's form or the one
 * without scripts) and remove, the promotion field's two, and a pick's add. The island sends a
 * submit of these to the server as its intent; the server has one change for each (PR 121 review,
 * item 4: one list for both, so neither catches a form the other does not know).
 */
export const DRAWER_FORMS = [
  "cart-line-item-update",
  "cart-line-item-update-fallback",
  "cart-line-item-remove",
  "promo-code-apply",
  "promo-code-remove",
  "cart-pick-add",
] as const;
export type DrawerForm = (typeof DRAWER_FORMS)[number];
/** What an add on a product page shows: QuickCartDropdown on the line just added, or nothing. */
export const QUICK_CART_OPTIONS = ["dropdown", "off"] as const;
