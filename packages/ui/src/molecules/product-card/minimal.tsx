// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, minimal. A square picture with square
// corners, then the title and the price, centred: no rating, no swatches, and no badges but the
// sold-out mark (a product that cannot be bought says so in every variant). A server component:
// no state, no event.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardMedia,
  CardPrice,
  CardRoot,
  CardTitle,
  cardBadges,
  type ProductCardProps,
} from "./parts";

function ProductCardMinimal({
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
      variant="minimal"
      className={cn("flex flex-col gap-3 text-center", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="square"
        radius="none"
        badges={cardBadges(product, copy.card, { soldOutOnly: true })}
      />
      <div className="flex min-w-0 flex-col items-center gap-1">
        <CardTitle
          product={product}
          heading={heading}
          prefetch={prefetch}
          linkClassName="after:rounded-none"
        />
        <CardPrice
          product={product}
          copy={copy}
          locale={locale}
          className="items-center [&>div]:justify-center"
        />
      </div>
    </CardRoot>
  );
}

export { ProductCardMinimal };
