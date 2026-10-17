// Ours (T37, SETUP.md "Listing organisms (T37)"; D41, D42, D46; SBP layouts/product-listing.md). A
// listing's products: a list of cards, in a grid or one to a row, in the look the shop picked
// (`variant`, one of ProductCard's ten), or the empty state when there are none. A server component:
// it holds no state, handles no event and makes every word itself.
// - The products are a `<ul>` named by the catalog (`productGrid.label`, "Products"), one `<li>` for
//   each card, so a screen reader says how many there are and a crawler finds a list. The cards are
//   `<article>`s with one link each (T32), and their titles are `h3` unless `heading` says (a page
//   whose products sit under an `h2`; the empty state's title is `h2` unless `emptyHeading` says).
// - `layout="grid"` is the columns of the loading skeleton, imported from the same module
//   (`product-grid-layout.ts`): two under `md`, three from `md`, four from `lg`, so the skeleton and
//   the grid line up and nothing moves when the cards arrive (T36 left that promise). Each card is
//   given the `sizes` of its column.
// - `layout="list"` is one card to a row, drawn as the horizontal card whatever `variant` is: a
//   row of square or tall tiles is a grid in one column and not a list, and the horizontal card
//   (a narrow picture, the text beside it) is the one made for a list one card wide. It is one
//   column at every width: that card's picture is a fixed 96 px, so a wider row only adds blank
//   space, and a second column would read as a grid. The rows are separated by a rule.
// - Nothing is drawn to say the grid is empty but EmptyState (T33), with the contract's `empty`
//   (its title, text and the way out) and no list, since an empty list is a list of nothing. The
//   icon is decoration.
// - Quick add (the `quick-add` variant) takes the form's `action` once for the grid and each
//   product's `status` by id, as ListingCard says. Every link takes `prefetch` from the prop, as
//   the cards' do; the DS passes `false`.
// - Per visitor (D44): none. A listing is the same for everyone and prerendered; the compare tray
//   and the recent searches are the per-visitor parts of a listing page, and they are other
//   organisms.
import type { Messages } from "@shopblok/i18n";
import type { ProductGrid as ProductGridContent } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { EmptyState, type HeadingLevel } from "@shopblok/ui/molecules/empty-state";
import type { HeadingElement, ProductCardCopy } from "@shopblok/ui/molecules/product-card/parts";
import type { LucideIcon } from "lucide-react";
import { PackageOpenIcon } from "lucide-react";
import { ListingCard, type ListingQuickAdd } from "./listing-card";
import { PRODUCT_GRID, PRODUCT_GRID_SIZES } from "./product-grid-layout";

type ProductGridProps = ProductGridContent & {
  /** The list's name, and the cards' words: `organisms.productGrid` and `molecules`'. */
  copy: ProductCardCopy & { grid: Messages["organisms"]["productGrid"] };
  /** The market's `<html lang>`. */
  locale: string;
  /** The cards' title element: `h3` by default, for a listing whose heading is an `h2`. */
  heading?: HeadingElement;
  /** The empty state's title level: 2 by default. */
  emptyHeading?: HeadingLevel;
  /** The empty state's icon (a Lucide component); decoration. */
  emptyIcon?: LucideIcon;
  /** The `quick-add` variant's form, for every card. */
  quickAdd?: ListingQuickAdd;
  /**
   * next/link's `prefetch` for every link (the cards' and the empty state's). Unset, Next
   * prefetches each in view; the DS page sets `false`, because its pages answer 404 until M3.
   */
  prefetch?: boolean | null;
  className?: string;
};

/** The picture's width in a list's row: the horizontal card's fixed `w-24`. */
const LIST_SIZES = "96px";

/** The rows of a list: a rule between them, none above the first or below the last. */
const LIST_ITEM = "min-w-0 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0";

function ProductGrid({
  products,
  variant,
  layout,
  empty,
  copy,
  locale,
  heading,
  emptyHeading = 2,
  emptyIcon = PackageOpenIcon,
  quickAdd,
  prefetch,
  className,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div
        data-slot="product-grid"
        data-state="empty"
        data-layout={layout}
        className={cn("min-w-0", className)}
      >
        <EmptyState {...empty} icon={emptyIcon} headingLevel={emptyHeading} prefetch={prefetch} />
      </div>
    );
  }
  const list = layout === "list";
  return (
    <ul
      aria-label={copy.grid.label}
      data-slot="product-grid"
      data-state="products"
      data-layout={layout}
      className={cn("min-w-0", list ? "flex flex-col" : PRODUCT_GRID, className)}
    >
      {products.map((product) => (
        <li key={product.id} data-slot="product-grid-item" className={list ? LIST_ITEM : "min-w-0"}>
          <ListingCard
            variant={list ? "horizontal" : variant}
            quickAdd={quickAdd}
            product={product}
            copy={copy}
            locale={locale}
            sizes={list ? LIST_SIZES : PRODUCT_GRID_SIZES}
            heading={heading}
            prefetch={prefetch}
          />
        </li>
      ))}
    </ul>
  );
}

export { ProductGrid };
export type { ProductGridProps };
