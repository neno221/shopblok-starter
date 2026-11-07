// The `templates` global's options that draw no member of a family (D101), shared by the global
// (`payload/globals/templates.ts`) and its read (`lib/cms/templates.ts`).

/** The quick view's option that draws none: the default, as M3 built the listing. */
export const QUICK_VIEW_OFF = "off";
/** The listing's one card with the button the quick view opens from: the quick view needs it. */
export const QUICK_VIEW_CARD = "quick-add";
/** The mini cart's option that draws none: a click on the header's cart opens the cart page. */
export const MINI_CART_PAGE = "page";
/** What an add on a product page shows: QuickCartDropdown on the line just added, or nothing. */
export const QUICK_CART_OPTIONS = ["dropdown", "off"] as const;
