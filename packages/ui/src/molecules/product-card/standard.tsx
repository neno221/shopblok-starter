// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, standard. A 3:4 picture with the badges
// top-start over it, then the title (two lines at most), the price and the rating. The card is
// one link, the title's, stretched over the whole card. A server component: no state, no event.
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

function ProductCardStandard({
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
      variant="standard"
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
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardStandard };
