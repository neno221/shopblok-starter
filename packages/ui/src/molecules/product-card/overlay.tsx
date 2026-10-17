// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, overlay. The title and the price sit
// over the bottom of a tall picture, on a panel of the page's own background (`bg-background`,
// opaque: the picture cannot lower the text's contrast, 19.9:1 for the title and 6.4:1 or more
// for the price tokens). The picture and the panel share one grid cell, so the panel needs no
// `position`: a positioned panel would become the box the title's link is stretched over. A server
// component: no state, no event.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardMedia,
  CardPrice,
  CardRoot,
  CardTitle,
  cardBadges,
  type ProductCardProps,
} from "./parts";

function ProductCardOverlay({
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
      variant="overlay"
      className={cn("grid grid-cols-[minmax(0,1fr)] rounded-xl", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="portrait"
        radius="xl"
        badges={cardBadges(product, copy.card)}
        className="col-start-1 row-start-1"
      />
      <div
        data-slot="product-card-panel"
        className="z-10 col-start-1 row-start-1 m-2 flex min-w-0 flex-col gap-1 self-end rounded-lg bg-background p-3 text-foreground shadow-sm"
      >
        <CardTitle
          product={product}
          heading={heading}
          prefetch={prefetch}
          linkClassName="after:rounded-xl"
        />
        <CardPrice product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardOverlay };
