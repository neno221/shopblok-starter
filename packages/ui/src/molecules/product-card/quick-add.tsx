// Ours (T32, SETUP.md "Product molecules (T32)"): ProductCard, quick add. The standard card with a
// form below it: the product's id and a submit button, outside the card's link and above its
// stretched area. `action` is what a `<form action>` takes (M3 passes a server action) and
// `status` is idle, adding, added or error; the button says "Choose options" for a product with
// more than one variant. A server component: the status comes from the caller.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CardMedia,
  CardPrice,
  CardQuickAdd,
  CardRating,
  CardRoot,
  CardTitle,
  cardBadges,
  type ProductCardProps,
  type QuickAddProps,
} from "./parts";

function ProductCardQuickAdd({
  product,
  copy,
  locale,
  sizes,
  heading,
  prefetch,
  action,
  status,
  className,
  ...props
}: ProductCardProps & QuickAddProps) {
  return (
    <CardRoot
      product={product}
      variant="quick-add"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <CardMedia
        product={product}
        sizes={sizes}
        aspect="tall"
        badges={cardBadges(product, copy.card)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <CardTitle product={product} heading={heading} prefetch={prefetch} />
        <CardPrice product={product} copy={copy} locale={locale} />
        <CardRating product={product} copy={copy} locale={locale} />
      </div>
      <CardQuickAdd product={product} copy={copy} locale={locale} action={action} status={status} />
    </CardRoot>
  );
}

export { ProductCardQuickAdd };
