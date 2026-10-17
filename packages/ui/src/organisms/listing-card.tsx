// Ours (T37, SETUP.md "Listing organisms (T37)"; D46). The one place that turns a ProductCard
// variant's name into the card that draws it, for the two organisms that show many cards: ProductGrid
// and ProductCarousel take `variant` as data (the shop picks it in Payload, SPEC §7.4) and both need
// the same ten-way choice, so it is made once here. A server component: every card is one.
// - Quick add is the one variant that takes more than the card's props: a form `action` and a
//   `status`. A listing gives the action once for all its cards (`quickAdd.action`, M3's server
//   action) and the status per product (`quickAdd.status`, by the product's id), because one card
//   adding is not every card adding. Without an action the form goes to the product's own page, which
//   is what "Choose options" means anyway, so a listing that forgot to pass one still works (a GET to
//   the page, with no JavaScript) rather than posting nowhere.
// - The other variants take the card's props alone; `swapped` (image swap, for the DS) is not
//   passed, because a listing never holds a hover.
import type { ProductCardVariant } from "@shopblok/registry/contracts";
import { ProductCardBordered } from "@shopblok/ui/molecules/product-card/bordered";
import { ProductCardCompact } from "@shopblok/ui/molecules/product-card/compact";
import { ProductCardEditorial } from "@shopblok/ui/molecules/product-card/editorial";
import { ProductCardHorizontal } from "@shopblok/ui/molecules/product-card/horizontal";
import { ProductCardImageSwap } from "@shopblok/ui/molecules/product-card/image-swap";
import { ProductCardMinimal } from "@shopblok/ui/molecules/product-card/minimal";
import { ProductCardOverlay } from "@shopblok/ui/molecules/product-card/overlay";
import type {
  ProductCardProps,
  QuickAddProps,
  QuickAddStatus,
} from "@shopblok/ui/molecules/product-card/parts";
import { ProductCardQuickAdd } from "@shopblok/ui/molecules/product-card/quick-add";
import { ProductCardStandard } from "@shopblok/ui/molecules/product-card/standard";
import { ProductCardSwatches } from "@shopblok/ui/molecules/product-card/swatches";
import type * as React from "react";

/** What a listing says about quick add, for all its cards. */
type ListingQuickAdd = {
  /** What each card's form does when it is submitted, as `<form action>` takes it. */
  action: QuickAddProps["action"];
  /** Where each product's add stands, by the product's id; a product not named is `idle`. */
  status?: Readonly<Record<string, QuickAddStatus>>;
};

type ListingCardProps = ProductCardProps & {
  /** Which of the ten looks to draw (ProductCard's `variant`s, D46). */
  variant: ProductCardVariant;
  /** Used by the `quick-add` variant only. */
  quickAdd?: ListingQuickAdd;
};

/** Every variant that takes the card's props alone. */
const PLAIN = {
  standard: ProductCardStandard,
  swatches: ProductCardSwatches,
  overlay: ProductCardOverlay,
  minimal: ProductCardMinimal,
  horizontal: ProductCardHorizontal,
  compact: ProductCardCompact,
  editorial: ProductCardEditorial,
  bordered: ProductCardBordered,
  "image-swap": ProductCardImageSwap,
} satisfies Record<
  Exclude<ProductCardVariant, "quick-add">,
  (props: ProductCardProps) => React.ReactNode
>;

function ListingCard({ variant, quickAdd, ...props }: ListingCardProps) {
  if (variant === "quick-add") {
    return (
      <ProductCardQuickAdd
        {...props}
        action={quickAdd?.action ?? props.product.href}
        status={quickAdd?.status?.[props.product.id]}
      />
    );
  }
  const Card = PLAIN[variant];
  return <Card {...props} />;
}

export { ListingCard };
export type { ListingCardProps, ListingQuickAdd };
