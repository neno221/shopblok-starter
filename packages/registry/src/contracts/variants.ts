import { z } from "zod";

// D99: each family's variants, as the values its Payload picker stores, in the registry's order
// (the first is the family's default). A leaf module: it imports nothing from `entries/`, because
// the entries import the contracts and the contracts' `z.enum`s are built from these lists (built
// from the entries instead, the two would import each other). `index.test.ts` checks that each list
// equals `variantsOf(family)`'s values, so an entry added without its value here, or a value here
// without its entry, fails the registry's test. A variant task adds its value here and its entry
// in `entries/` (SETUP.md, "How to add a variant (M5)").
export const VARIANTS = {
  // D46 (T35, T36, T32): the six headers, the five footers and the ten product cards.
  header: ["classic", "centered", "two-tier", "mega-menu", "minimal", "transparent"],
  footer: ["multi-column", "newsletter-first", "minimal", "wordmark", "two-tier"],
  "product-card": [
    "standard",
    "swatches",
    "quick-add",
    "overlay",
    "minimal",
    "horizontal",
    "compact",
    "editorial",
    "bordered",
    "image-swap",
  ],
  // D79 (T63, T64, T66, T67): each block is a family, its first variant `standard`; T80 to T82 add
  // the others (M5 plan §1a).
  "rich-text": ["standard"],
  // T82 (M5 plan §1a): the content and promotion blocks' seventeen more.
  "media-with-text": ["standard", "overlap", "full-bleed"],
  "usp-bar": ["standard", "strip"],
  "logo-cloud": ["standard", "grid"],
  faq: ["standard", "side-heading"],
  testimonials: ["standard", "single", "carousel", "wall"],
  video: ["standard"],
  spacer: ["standard"],
  // T80 (M5 plan §1a): the hero's seven more.
  hero: [
    "standard",
    "overlay",
    "centered",
    "editorial",
    "bento",
    "collection-switcher",
    "product",
    "text",
  ],
  // T81 (M5 plan §1a): the catalog blocks' sixteen more.
  "category-showcase": ["standard", "circles", "bento", "carousel", "list", "banner"],
  "product-collection": [
    "standard",
    "featured-first",
    "editorial",
    "tabs",
    "ranked",
    "with-banner",
    "compact",
    "lookbook",
  ],
  "featured-product": ["standard", "overlay", "gallery"],
  bundle: ["standard", "list"],
  "promo-banner": ["standard", "strip", "ticket", "full-bleed", "countdown", "popup"],
  comparison: ["standard", "cards", "highlight"],
  "collection-spotlight": ["standard", "stacked"],
  "recently-viewed": ["standard"],
  newsletter: ["standard", "split"],
  "form-block": ["standard"],
  "editorial-list": ["standard", "featured"],
  // D99, D101 (T79): the commerce templates' and organisms' families, each starting with what M2
  // and M3 built, which the `templates` global picks from; T83 to T86 add the others.
  "product-detail": ["default"],
  // T84: the listing's filter layouts (M5 plan §1a), which the search page follows.
  "product-listing": ["default", "top-bar", "drawer", "accordion", "chips", "rail", "inline"],
  "quick-view": ["default"],
  // T85: the cart page's layouts and the mini cart's drawer with picks (M5 plan §1a).
  cart: ["default", "table", "sticky-summary", "focused"],
  "mini-cart": ["drawer", "drawer-picks"],
  checkout: ["default"],
  receipt: ["default"],
} as const satisfies Record<string, readonly [string, ...string[]]>;

/** A family of the registry: a key of `VARIANTS`. */
export type Family = keyof typeof VARIANTS;

/** The values of `family`'s variants, as a type. */
export type VariantOf<F extends Family> = (typeof VARIANTS)[F][number];

/** A family's variant as a contract's field: one of its values (D99). */
export const variantEnum = <F extends Family>(family: F) =>
  z.enum(VARIANTS[family] as unknown as readonly [VariantOf<F>, ...VariantOf<F>[]]);

/** The family's default: its first variant. */
export const firstVariant = <F extends Family>(family: F): VariantOf<F> =>
  VARIANTS[family][0] as VariantOf<F>;

/**
 * D99's rule for a variant that needs content the family's first does not (the hero's collections
 * for `collection-switcher`): the view model's field is optional in the family's one contract, and
 * this refuses a view model whose `variant` is one of `needs`' keys and lacks a field it names. A
 * contract adds it with `.superRefine(variantNeeds({ "collection-switcher": ["collections"] }))`.
 */
export function variantNeeds<V extends string>(
  needs: Partial<Record<V, readonly string[]>>,
): (value: { variant?: string | undefined }, context: z.RefinementCtx) => void {
  return (value, context) => {
    if (value.variant === undefined) return;
    // An own key only: `toString` must not read `Object.prototype` (PR 116 review, item 6).
    const fields = Object.hasOwn(needs, value.variant) ? needs[value.variant as V] : undefined;
    for (const field of fields ?? []) {
      if ((value as Record<string, unknown>)[field] === undefined)
        context.addIssue({
          code: "custom",
          path: [field],
          message: `the "${value.variant}" variant needs ${field}`,
        });
    }
  };
}
