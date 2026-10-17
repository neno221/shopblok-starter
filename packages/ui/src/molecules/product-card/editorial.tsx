// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, editorial. A tall 2:3 picture and
// larger type: the title in 20 px semibold, the price at its large size, set under a rule. For a
// lookbook or a featured row with few cards, where each one gets room. A server component: no
// state, no event.
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

function ProductCardEditorial({
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
      variant="editorial"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="editorial"
        radius="sm"
        badges={cardBadges(product, copy.card)}
      />
      <div className="flex min-w-0 flex-col gap-2 border-t pt-3">
        <CardTitle
          product={product}
          heading={heading}
          prefetch={prefetch}
          className="text-xl leading-tight font-semibold tracking-tight"
          linkClassName="after:rounded-sm"
        />
        <CardPrice product={product} copy={copy} locale={locale} size="lg" />
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardEditorial };
