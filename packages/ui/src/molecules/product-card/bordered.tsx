// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, bordered. The standard card inside a
// bordered, padded box on the card tokens, with a shadow that grows on hover. The border and the
// padding are the card's own, so the stretched link's focus ring is drawn around the box. A server
// component: no state, no event.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardMedia,
  CardPrice,
  CardRating,
  CardRoot,
  CardTitle,
  cardBadges,
  type ProductCardProps,
} from "./parts";

function ProductCardBordered({
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
      variant="bordered"
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-3 text-card-foreground shadow-xs transition-shadow hover:shadow-md motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="portrait"
        radius="md"
        badges={cardBadges(product, copy.card)}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <CardTitle
          product={product}
          heading={heading}
          prefetch={prefetch}
          linkClassName="after:rounded-xl"
        />
        <CardPrice product={product} copy={copy} locale={locale} />
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardBordered };
