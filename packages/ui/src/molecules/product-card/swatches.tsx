// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, swatches. The standard card with the
// product's colours as a row of small discs under the price. The discs are display only: a colour
// you can press is the product page's VariantSelector, and a control in the card would sit in the
// link's area. A server component: no state, no event.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardMedia,
  CardPrice,
  CardRating,
  CardRoot,
  CardSwatches,
  CardTitle,
  cardBadges,
  type ProductCardProps,
} from "./parts";

function ProductCardSwatches({
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
      variant="swatches"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="tall"
        badges={cardBadges(product, copy.card)}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <CardTitle product={product} heading={heading} prefetch={prefetch} />
        <CardPrice product={product} copy={copy} locale={locale} />
        <CardSwatches product={product} copy={copy} locale={locale} className="py-0.5" />
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardSwatches };
