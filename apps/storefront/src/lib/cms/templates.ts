import "server-only";
import { firstVariant, type VariantOf } from "@shopblok/registry/contracts";
import type { Payload } from "payload";
import type { Template } from "../../payload-types";
import { QUICK_CART_OPTIONS, QUICK_VIEW_OFF, type MINI_CART_PAGE } from "./template-options";
import { globalTag } from "./globals";
import { cmsRead, type CmsQuery } from "./read";

/**
 * What the `templates` global picks (D101), as the pages pass it on: each template's `variant`,
 * the quick view (or "off"), what a click on the header's cart opens (a mini cart, or the cart
 * page) and whether an add shows the quick cart. A value the registry does not have (one stored by
 * a later version) is passed on as it is: the template's entry file draws its first member then,
 * and logs it (`pickVariant`).
 */
export type TemplateChoice = {
  productPage: VariantOf<"product-detail">;
  listing: VariantOf<"product-listing">;
  quickView: typeof QUICK_VIEW_OFF | VariantOf<"quick-view">;
  cart: VariantOf<"cart">;
  miniCart: typeof MINI_CART_PAGE | VariantOf<"mini-cart">;
  quickCart: (typeof QUICK_CART_OPTIONS)[number];
  checkout: VariantOf<"checkout">;
  receipt: VariantOf<"receipt">;
};

/**
 * The stand-in (D101): every family's first variant, the quick view off, the drawer on a click and
 * the quick cart after an add, which is M4's shop. What a build without a database draws, and a
 * global that was never saved.
 */
export const TEMPLATE_DEFAULTS: TemplateChoice = {
  productPage: firstVariant("product-detail"),
  listing: firstVariant("product-listing"),
  quickView: QUICK_VIEW_OFF,
  cart: firstVariant("cart"),
  miniCart: firstVariant("mini-cart"),
  quickCart: QUICK_CART_OPTIONS[0],
  checkout: firstVariant("checkout"),
  receipt: firstVariant("receipt"),
};

/**
 * The global as the pages take it (pure): `TEMPLATE_DEFAULTS` for no document or one never saved
 * (Payload answers that without `updatedAt`, as `shell.ts`'s rule for the other globals says), and
 * each empty field its default.
 */
export function templatesFrom(doc: Template | null): TemplateChoice {
  if (doc === null || !doc.updatedAt) return TEMPLATE_DEFAULTS;
  const d = TEMPLATE_DEFAULTS;
  return {
    productPage: doc.productPage?.variant ?? d.productPage,
    listing: doc.listing?.variant ?? d.listing,
    quickView: doc.quickView?.variant ?? d.quickView,
    cart: doc.cart?.variant ?? d.cart,
    miniCart: doc.cart?.miniCart ?? d.miniCart,
    quickCart: doc.cart?.quickCart ?? d.quickCart,
    checkout: doc.checkout?.variant ?? d.checkout,
    receipt: doc.receipt?.variant ?? d.receipt,
  };
}

/**
 * The `templates` global in the market's language (D73: the cached entry is per language and
 * tagged `global:templates:<locale>`, which a publish refreshes in every language), as a draft in
 * Draft Mode. Its pickers are not localized, so every language reads the same values; the read
 * still goes by the market, never the request (ADR 0003). `null` with no database.
 */
export const readTemplates = cmsRead(
  async (payload: Payload, query: CmsQuery): Promise<Template> =>
    (await payload.findGlobal({
      slug: "templates",
      ...query,
      locale: query.locale as never,
      depth: 0,
    })) as Template,
  { name: "cms:global:templates", tags: (locale) => [globalTag("templates", locale)] },
);
