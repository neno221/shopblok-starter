import "server-only";
import { firstVariant, type VariantOf } from "@shopblok/registry/contracts";
import type { Payload } from "payload";
import type { Template } from "../../payload-types";
import {
  MINI_CART_PAGE,
  QUICK_CART_OPTIONS,
  QUICK_VIEW_CARD,
  QUICK_VIEW_OFF,
} from "./template-options";
import type { ProductSourceValue } from "./resolve/products";
import { blocksOf, type SectionBlocks, type SectionsPage } from "./catalog-sections";
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
  /** The listing's grid's card (T84): one of ProductCard's ten. */
  card: VariantOf<"product-card">;
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
  card: firstVariant("product-card"),
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
 * each empty field its default. The quick view is off unless the card is `quick-add` (D101: the only
 * card with its button), whatever the Quick view tab still holds from before the card changed.
 */
export function templatesFrom(doc: Partial<Template> | null): TemplateChoice {
  if (doc === null || !doc.updatedAt) return TEMPLATE_DEFAULTS;
  const d = TEMPLATE_DEFAULTS;
  const card = doc.listing?.card ?? d.card;
  return {
    productPage: doc.productPage?.variant ?? d.productPage,
    listing: doc.listing?.variant ?? d.listing,
    card,
    quickView: card === QUICK_VIEW_CARD ? (doc.quickView?.variant ?? d.quickView) : QUICK_VIEW_OFF,
    cart: doc.cart?.variant ?? d.cart,
    miniCart: doc.cart?.miniCart ?? d.miniCart,
    quickCart: doc.cart?.quickCart ?? d.quickCart,
    checkout: doc.checkout?.variant ?? d.checkout,
    receipt: doc.receipt?.variant ?? d.receipt,
  };
}

/** What `templatesFrom` takes of the global: its pickers, never the sections. */
const TEMPLATE_PICKERS = {
  productPage: { variant: true },
  listing: { variant: true, card: true },
  quickView: { variant: true },
  cart: { variant: true, miniCart: true, quickCart: true },
  checkout: { variant: true },
  receipt: { variant: true },
  updatedAt: true,
} as const;

/**
 * The `templates` global in the market's language (D73: the cached entry is per language and
 * tagged `global:templates:<locale>`, which a publish refreshes in every language), as a draft in
 * Draft Mode. Its pickers are not localized, so every language reads the same values; the read
 * still goes by the market, never the request (ADR 0003). `null` with no database.
 *
 * Only the pickers, selected: the shell reads this on every page, and the global's sections
 * (T87) are a few hundred block tables a full read joins (PR 127's CI: every templates save and
 * read four times slower, live previews late). `readTemplateSections` reads those.
 */
export const readTemplates = cmsRead(
  async (payload: Payload, query: CmsQuery): Promise<Partial<Template>> =>
    (await payload.findGlobal({
      slug: "templates",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: TEMPLATE_PICKERS as never,
    })) as Partial<Template>,
  { name: "cms:global:templates", tags: (locale) => [globalTag("templates", locale)] },
);

/**
 * What the header's mini cart draws (T85): the member a click opens (`null` for "Cart page") and
 * the `drawer-picks` member's source. Pure, from the cart tab as `readCartTemplate` reads it; no
 * document, or one never saved, is the drawer (M4's) and no source (the picks' default).
 */
export function miniCartFrom(doc: Pick<Template, "cart" | "updatedAt"> | null): {
  member: VariantOf<"mini-cart"> | null;
  picks: ProductSourceValue | null;
} {
  // The saved-or-default rule is `templatesFrom`'s (PR 121 review, item 9).
  const { miniCart } = templatesFrom(doc);
  const picks: ProductSourceValue | null | undefined = doc?.updatedAt ? doc.cart?.picks : null;
  return {
    member: miniCart === MINI_CART_PAGE ? null : miniCart,
    picks: picks ?? null,
  };
}

/**
 * The `templates` global's cart tab, its references populated (depth 1: the picks' collection,
 * category or products, so a product Medusa deleted is no pick), in the market's language, for the
 * header's mini cart (T85). Published only: the drawer's action is a shopper's, never Draft
 * Mode's. Tagged as the global (`global:templates:<locale>`), which a change to a catalog document
 * also refreshes (`linkedTags`, through the content globals' tags). `null` with no database.
 */
export const readCartTemplate = cmsRead(
  async (payload: Payload, query: CmsQuery): Promise<Pick<Template, "cart" | "updatedAt">> =>
    (await payload.findGlobal({
      slug: "templates",
      ...query,
      locale: query.locale as never,
      depth: 1,
      select: { cart: true, updatedAt: true },
      // Only what `liveMedusaId` reads of a referenced document.
      populate: {
        products: { medusaId: true, deletedInMedusa: true },
        collections: { medusaId: true, deletedInMedusa: true },
        categories: { medusaId: true, deletedInMedusa: true },
      },
    })) as Template,
  { name: "cms:global:templates:cart", tags: (locale) => [globalTag("templates", locale)] },
);

/**
 * The `templates` global's default sections for one page (D104, T87): the product page's or the
 * listings', at depth 1 with every reference populated as a page's `layout` is, in the market's
 * language (a block's texts fall back to English, D73), as a draft in Draft Mode (the global's live
 * preview). Tagged as the global (`global:templates:<locale>`), which a publish refreshes and which
 * a change to an upload, a catalog document or a form refreshes too (`embeddingTags`). `null` with
 * no database; no blocks for a global never saved.
 */
export const readTemplateSections = cmsRead(
  async (payload: Payload, query: CmsQuery, page: SectionsPage): Promise<SectionBlocks> => {
    const doc = (await payload.findGlobal({
      slug: "templates",
      ...query,
      locale: query.locale as never,
      depth: 1,
      select: { [page]: { sections: true }, updatedAt: true } as never,
    })) as unknown as Record<string, { sections?: unknown } | undefined> & { updatedAt?: unknown };
    return doc.updatedAt ? blocksOf(doc[page]?.sections) : [];
  },
  { name: "cms:global:templates:sections", tags: (locale) => [globalTag("templates", locale)] },
);
