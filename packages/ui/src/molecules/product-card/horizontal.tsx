// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, horizontal. A narrow picture at the
// inline start and the text beside it, for a list one card wide (a wishlist, "you may also like").
// The picture is a fixed 96 px, so the text keeps the rest of any width down to the design system's
// narrowest cell; the badges go in the text column, where a long label has room to wrap. A server
// component: no state, no event.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardBadges,
  CardMedia,
  CardPrice,
  CardRating,
  CardRoot,
  CardTitle,
  cardBadges,
  type ProductCardProps,
} from "./parts";

function ProductCardHorizontal({
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
      variant="horizontal"
      className={cn("flex items-start gap-3", className)}
      {...props}
    >
      <CardMedia product={product} sizes={sizes} aspect="tall" className="w-24 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <CardBadges badges={cardBadges(product, copy.card)} />
        <CardTitle product={product} heading={heading} prefetch={prefetch} />
        <CardPrice product={product} copy={copy} locale={locale} />
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardHorizontal };
