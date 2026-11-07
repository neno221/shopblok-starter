import type { Condition, Field } from "payload";
import { variantField } from "../fields/variant";
import {
  MINI_CART_PAGE,
  QUICK_CART_OPTIONS,
  QUICK_VIEW_CARD,
  QUICK_VIEW_OFF,
} from "../../lib/cms/template-options";
import { contentGlobal } from "./content-global";

/**
 * The `templates` global (D101, SPEC §7.3, Q6): the commerce pages' variants, one tab each, every
 * picker the registry's variant field (D85) with its family's thumbnails. Not localized: a shop's
 * commerce look is the same in every language. Read publicly, edited by staff, drafts with autosave
 * and 50 versions, `revalidateGlobalOnPublish` with `global:templates:<locale>` in every language
 * (`contentGlobal`), and live preview on the newest product's page (`live-preview.ts`). T79 creates
 * the fields below; T84 adds the listing's `card`, T85 the mini cart's `drawer-picks` and its
 * `picks`, T87 the default `sections`.
 */

/** The quick view's picker shows only when the listing's card is `quick-add` (D101, T84). */
export const withQuickAddCard: Condition = (data) =>
  (data as { listing?: { card?: unknown } } | undefined)?.listing?.card === QUICK_VIEW_CARD;
export const Templates = contentGlobal({
  slug: "templates",
  label: "Templates",
  description:
    "How the product page, the listings, the cart, the checkout and the receipt look, in every market.",
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          name: "productPage",
          label: "Product page",
          fields: [
            variantField({
              family: "product-detail",
              label: "Layout",
              description: "Where the pictures, the buy box and the product's information go.",
            }),
          ],
        },
        {
          name: "listing",
          label: "Listing",
          fields: [
            variantField({
              family: "product-listing",
              label: "Filter layout",
              description: "The category, collection and store pages, and the search page.",
            }),
            // T84: the grid's card, one of ProductCard's ten (D46), on the listings and the search.
            variantField({
              family: "product-card",
              name: "card",
              label: "Product card",
              description:
                "The card of every product in the listings' and the search page's grids. Quick add puts a button on it; the Quick view tab says what it does.",
            }),
          ],
        },
        {
          name: "quickView",
          label: "Quick view",
          fields: [
            variantField({
              family: "quick-view",
              label: "Quick view",
              before: [{ value: QUICK_VIEW_OFF, label: "Off" }],
              defaultValue: QUICK_VIEW_OFF,
              // D101: it opens from the quick-add card's button only, so it shows with that card.
              condition: withQuickAddCard,
              // T83: the card's button opens it, in the listings and the search page.
              description:
                "What the quick-add card's button opens in the listings and the search page: the product's pictures and buy box over the page. Off: the button opens the product page.",
            }),
          ],
        },
        {
          name: "cart",
          label: "Cart",
          fields: [
            variantField({ family: "cart", label: "Cart page" }),
            variantField({
              family: "mini-cart",
              name: "miniCart",
              label: "A click on the header's cart opens",
              after: [{ value: MINI_CART_PAGE, label: "Cart page" }],
            }),
            {
              name: "quickCart",
              type: "radio",
              label: "After an add on a product page",
              required: true,
              defaultValue: QUICK_CART_OPTIONS[0],
              options: [
                { value: QUICK_CART_OPTIONS[0], label: "The quick cart, on the line just added" },
                { value: QUICK_CART_OPTIONS[1], label: "Off" },
              ],
            } satisfies Field,
          ],
        },
        {
          name: "checkout",
          label: "Checkout",
          fields: [variantField({ family: "checkout", label: "Layout" })],
        },
        {
          name: "receipt",
          label: "Receipt",
          fields: [
            variantField({
              family: "receipt",
              label: "Layout",
              description: "The order confirmation and the order's page in the account.",
            }),
          ],
        },
      ],
    },
  ],
});
