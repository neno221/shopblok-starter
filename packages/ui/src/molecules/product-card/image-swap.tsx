// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, image swap. The standard card whose
// picture changes to the product's second image while the pointer is over the card or focus is
// inside it, with CSS only (`group-hover`, `group-focus-within`), so it needs no client code. Under
// reduced motion the second picture is not drawn at all (`motion-reduce:hidden`), and a touch
// screen, which has no hover, never shows it. The second picture is decoration (`alt=""`, hidden
// from assistive technology): the first one is the product's. `swapped` draws the second picture
// as on hover, for a static page (the design system's state). A card with one image shows it
// and nothing else. A server component: no state, no event.
import { Image } from "@shopblok/ui/atoms/image";
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

function ProductCardImageSwap({
  product,
  copy,
  locale,
  sizes,
  heading,
  prefetch,
  swapped = false,
  className,
  ...props
}: ProductCardProps & {
  /** Draw the second picture, as on hover (also under reduced motion). */
  swapped?: boolean;
}) {
  const second = product.images[1];
  return (
    <CardRoot
      product={product}
      variant="image-swap"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="tall"
        badges={cardBadges(product, copy.card)}
      >
        {second === undefined ? null : (
          <div
            data-slot="product-card-swap-image"
            data-swap-image=""
            data-swapped={swapped ? "" : undefined}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
              swapped
                ? "opacity-100"
                : "opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 motion-reduce:hidden",
            )}
          >
            <Image src={second.src} alt="" sizes={sizes} ratio="tall" />
          </div>
        )}
      </CardMedia>
      <div className="flex min-w-0 flex-col gap-1.5">
        <CardTitle product={product} heading={heading} prefetch={prefetch} />
        <CardPrice product={product} copy={copy} locale={locale} />
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
    </CardRoot>
  );
}

export { ProductCardImageSwap };
