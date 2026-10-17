// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, compact. A 64 px square picture, a
// one-line title and a small price on one row, for a search suggestion or a mini list. Only the
// sold-out mark is kept of the badges, next to the price. The link is still 44 px high and covers
// the whole row. A server component: no state, no event.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardBadges,
  CardMedia,
  CardPrice,
  CardRoot,
  CardTitle,
  cardBadges,
  type ProductCardProps,
} from "./parts";

function ProductCardCompact({
  product,
  copy,
  locale,
  sizes,
  heading,
  prefetch,
  className,
  ...props
}: ProductCardProps) {
  return (
    <CardRoot
      product={product}
      variant="compact"
      className={cn("flex items-center gap-3", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="square"
        radius="sm"
        className="w-16 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <CardTitle
          product={product}
          heading={heading}
          prefetch={prefetch}
          lines={1}
          linkClassName="flex items-center after:rounded-md"
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CardPrice product={product} copy={copy} locale={locale} size="sm" />
          <CardBadges badges={cardBadges(product, copy.card, { soldOutOnly: true })} />
        </div>
      </div>
    </CardRoot>
  );
}

export { ProductCardCompact };
