// Ours (T32, SETUP.md "Product molecules (T32)"): the parts the ten ProductCard variants are built
// from. The card is one link: the title's, stretched over the card by its `::after` (the root is
// the positioned box, so no part between the root and the link may be positioned, and a variant
// that layers things uses a grid), and any other control sits outside the link and above it
// (`relative z-10`), so nothing interactive is nested in a link. A server component throughout:
// nothing here has state or an event.
import { formatMessage, formatNumber, type Messages } from "@shopblok/i18n";
import type { ColorSwatch, ProductCard } from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { Button } from "@shopblok/ui/atoms/button";
import { Image, type ImageProps } from "@shopblok/ui/atoms/image";
import { Link } from "@shopblok/ui/atoms/link";
import { Rating } from "@shopblok/ui/atoms/rating";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import NextImage from "next/image";
import type * as React from "react";

/** The strings of a card: its own, and its price's. */
type ProductCardCopy = {
  card: Messages["molecules"]["productCard"];
  priceBlock: Messages["molecules"]["priceBlock"];
};

type HeadingElement = "h2" | "h3" | "h4" | "h5" | "h6";

/** What every variant takes. Other attributes go to the card's `<article>`. */
type ProductCardProps = Omit<React.ComponentProps<"article">, "children"> & {
  product: ProductCard;
  copy: ProductCardCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /**
   * The width the picture is drawn at, per breakpoint (`(min-width: 768px) 25vw, 50vw`), which
   * picks the source to download. Required: the caller knows the grid the card sits in.
   */
  sizes: string;
  /** The title's heading element: `h3` by default, for a card in a section that has an `h2`. */
  heading?: HeadingElement;
  /**
   * The title link's `prefetch` (next/link). Unset, Next prefetches the product page's shell when
   * the card comes into view, as a shop wants; the DS page sets `false`, because the product pages
   * do not exist before M3 and each prefetch would answer 404.
   */
  prefetch?: boolean | null;
};

type QuickAddStatus = "idle" | "adding" | "added" | "error";

/** The shapes a card's picture can take: Image's three, and the editorial variant's taller one. */
type Aspect = "square" | "portrait" | "tall" | "editorial";

// `frame` is the aspect-ratio class of the Image atom's `ratio`, or the editorial one that replaces
// it; the card with no picture draws the same frame.
const ASPECTS: Record<Aspect, { ratio: NonNullable<ImageProps["ratio"]>; frame: string }> = {
  square: { ratio: "square", frame: "aspect-square" },
  portrait: { ratio: "portrait", frame: "aspect-[4/5]" },
  tall: { ratio: "tall", frame: "aspect-[3/4]" },
  editorial: { ratio: "tall", frame: "aspect-[2/3]" },
};

const RADII = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  none: "rounded-none",
} as const;

type Radius = keyof typeof RADII;

const isSoldOut = (product: ProductCard) => product.stock.status === "out";

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The card's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];
const toHref = (href: string) => href as LinkHref;

// --- Badges ----------------------------------------------------------------------------------

type CardBadge = { kind: "sold-out" | "sale" | "new" | "bestseller" | "custom"; label: string };

const BADGE_ORDER = ["sale", "new", "bestseller", "custom"] as const;

/**
 * At most `max` badges, sold out first (a product that cannot be bought says so before anything
 * else), then sale, new, bestseller and the merchant's own label (SBP, product-card.md).
 */
function cardBadges(
  product: ProductCard,
  copy: ProductCardCopy["card"],
  { max = 2, soldOutOnly = false } = {},
): CardBadge[] {
  const found: CardBadge[] = [];
  if (isSoldOut(product)) found.push({ kind: "sold-out", label: copy.soldOut });
  if (!soldOutOnly) {
    const ranked = [...product.badges].sort(
      (a, b) => BADGE_ORDER.indexOf(a.kind) - BADGE_ORDER.indexOf(b.kind),
    );
    for (const badge of ranked)
      found.push({
        kind: badge.kind,
        label: badge.kind === "custom" ? badge.label : copy.badges[badge.kind],
      });
  }
  return found.slice(0, max);
}

// The colours are the badge tokens (sale and new), the primary colour for the sold-out mark, and
// the secondary one for the rest, each 4.5:1 or more on its own fill.
const badgeStyles: Record<
  CardBadge["kind"],
  { variant: "default" | "secondary"; classes: string }
> = {
  "sold-out": { variant: "default", classes: "" },
  sale: { variant: "default", classes: "bg-badge-sale text-badge-sale-foreground" },
  new: { variant: "default", classes: "bg-badge-new text-badge-new-foreground" },
  bestseller: { variant: "secondary", classes: "" },
  custom: { variant: "secondary", classes: "" },
};

// `rounded-xl`, not the atom's `rounded-4xl`: a single line is a pill either way (the radius is capped
// at half the height), but a long label that wraps to three lines keeps its corners off the text.
function CardBadges({ badges, className }: { badges: CardBadge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <div
      data-slot="product-card-badges"
      className={cn("flex min-w-0 flex-wrap items-start gap-1", className)}
    >
      {badges.map((badge) => (
        <Badge
          key={`${badge.kind}-${badge.label}`}
          data-kind={badge.kind}
          variant={badgeStyles[badge.kind].variant}
          className={cn("rounded-xl wrap-anywhere", badgeStyles[badge.kind].classes)}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

// --- Root and media --------------------------------------------------------------------------

type CardRootProps = Omit<React.ComponentProps<"article">, "children"> & {
  product: ProductCard;
  variant: string;
  children: React.ReactNode;
};

/** The card's `<article>`: the positioned box the title's link is stretched over. */
function CardRoot({ product, variant, className, children, ...props }: CardRootProps) {
  return (
    <article
      data-slot="product-card"
      data-variant={variant}
      data-sold-out={isSoldOut(product) ? "" : undefined}
      className={cn("group/card relative min-w-0", className)}
      {...props}
    >
      {children}
    </article>
  );
}

type CardMediaProps = {
  product: ProductCard;
  sizes: string;
  aspect: Aspect;
  radius?: Radius;
  /** Over the picture, top-start. Nothing: none. */
  badges?: CardBadge[];
  /** Layers over the first picture (the image-swap variant's second one). */
  children?: React.ReactNode;
  className?: string;
};

/**
 * The first picture, in a frame that keeps its shape, with the badges top-start over it. A sold-out
 * product's picture is dimmed (the mark says why). A card with no picture keeps the frame.
 */
function CardMedia({
  product,
  sizes,
  aspect,
  radius = "md",
  badges = [],
  children,
  className,
}: CardMediaProps) {
  const image = product.images[0];
  const shape = ASPECTS[aspect];
  return (
    <div data-slot="product-card-media" className={cn("relative min-w-0", className)}>
      <div className={cn("relative", isSoldOut(product) && "opacity-60")}>
        {image === undefined ? (
          <div
            data-slot="product-card-no-image"
            aria-hidden="true"
            className={cn("w-full bg-muted", shape.frame, RADII[radius])}
          />
        ) : (
          <Image
            src={image.src}
            alt={image.alt}
            sizes={sizes}
            ratio={shape.ratio}
            radius={radius}
            className={shape.frame}
          />
        )}
        {children}
      </div>
      <CardBadges badges={badges} className="absolute inset-x-2 top-2" />
    </div>
  );
}

// --- Text ------------------------------------------------------------------------------------

/**
 * The title: a heading whose only content is the card's link. The link is at least 44 px high (D32)
 * and its `::after` covers the card, so the whole card is the target; the focus ring is drawn on
 * that `::after`, around the card. The title is clamped to `lines` with `data-truncate` (the one
 * place the design-system job lets text be cut); the link's name is the full title.
 */
function CardTitle({
  product,
  heading: Heading = "h3",
  prefetch,
  lines = 2,
  className,
  linkClassName,
}: {
  product: ProductCard;
  heading?: HeadingElement;
  prefetch?: boolean | null;
  lines?: 1 | 2;
  className?: string;
  /** The radius of the focus ring, which has to be the card's (`after:rounded-xl`). */
  linkClassName?: string;
}) {
  return (
    <Heading
      data-slot="product-card-title"
      className={cn("min-w-0 text-sm leading-snug font-medium text-foreground", className)}
    >
      <Link
        href={toHref(product.href)}
        prefetch={prefetch}
        className={cn(
          "block min-h-11 text-foreground no-underline focus-visible:ring-0 after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring",
          linkClassName,
        )}
      >
        <span
          data-truncate=""
          className={cn(
            "wrap-anywhere group-hover/card:underline",
            lines === 1 ? "line-clamp-1" : "line-clamp-2",
          )}
        >
          {product.title}
        </span>
      </Link>
    </Heading>
  );
}

function CardPrice({
  product,
  copy,
  locale,
  size,
  className,
}: {
  product: ProductCard;
  copy: ProductCardCopy;
  locale: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <PriceBlock
      price={product.price}
      copy={copy.priceBlock}
      locale={locale}
      size={size}
      className={className}
    />
  );
}

/**
 * The stars, named "4.6 out of 5, 128 reviews", and the count drawn beside them. A product with no
 * reviews shows nothing. The count is its own element, so in a narrow column it moves below the
 * stars instead of overflowing.
 */
function CardRating({
  product,
  copy,
  locale,
  className,
}: {
  product: ProductCard;
  copy: ProductCardCopy;
  locale: string;
  className?: string;
}) {
  const { rating } = product;
  if (rating === undefined || rating.count <= 0) return null;
  const label = formatMessage(
    copy.card.rating,
    {
      average: formatNumber(rating.average, locale, { maximumFractionDigits: 1 }),
      count: rating.count,
    },
    locale,
  );
  return (
    <div
      data-slot="product-card-rating"
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}
    >
      <Rating size="sm" value={rating.average} label={label} />
      <span aria-hidden="true" className="text-xs text-muted-foreground">
        {formatMessage(copy.card.ratingCount, { count: rating.count }, locale)}
      </span>
    </div>
  );
}

// --- Swatches --------------------------------------------------------------------------------

const MAX_SWATCHES = 5;

function SwatchDisc({ swatch }: { swatch: ColorSwatch }) {
  return (
    <span
      aria-hidden="true"
      className="relative block size-5 overflow-hidden rounded-full border border-input bg-muted"
      style={swatch.hex === undefined ? undefined : { backgroundColor: swatch.hex }}
    >
      {swatch.image === undefined ? null : (
        <NextImage src={swatch.image.src} alt="" fill sizes="20px" className="object-cover" />
      )}
      {swatch.available ? null : (
        <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-foreground" />
      )}
    </span>
  );
}

/**
 * The colours as a row of small discs, for display only (a swatch you can press belongs to the
 * product page's VariantSelector, and a control inside the card would nest in its link's area).
 * Each colour's name is read out, an unavailable one with that said; more than five show four and
 * "+N" for the rest.
 */
function CardSwatches({
  product,
  copy,
  locale,
  className,
}: {
  product: ProductCard;
  copy: ProductCardCopy;
  locale: string;
  className?: string;
}) {
  const { swatches } = product;
  if (swatches.length === 0) return null;
  const shown = swatches.length > MAX_SWATCHES ? swatches.slice(0, MAX_SWATCHES - 1) : swatches;
  const rest = swatches.length - shown.length;
  return (
    <ul
      data-slot="product-card-swatches"
      aria-label={copy.card.swatches}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {shown.map((swatch) => (
        <li key={swatch.id} data-unavailable={swatch.available ? undefined : ""}>
          <SwatchDisc swatch={swatch} />
          <VisuallyHidden>
            {swatch.available ? swatch.label : `${swatch.label}, ${copy.card.swatchUnavailable}`}
          </VisuallyHidden>
        </li>
      ))}
      {rest > 0 ? (
        <li data-slot="product-card-swatches-more">
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            {formatMessage(copy.card.moreCount, { count: rest }, locale)}
          </span>
          <VisuallyHidden>
            {formatMessage(copy.card.swatchesMore, { count: rest }, locale)}
          </VisuallyHidden>
        </li>
      ) : null}
    </ul>
  );
}

// --- Quick add -------------------------------------------------------------------------------

type QuickAddProps = {
  /**
   * What the form does when it is submitted, as `<form action>` takes it: M3 passes a server
   * action, a string is a URL (the design system passes the product's page).
   */
  action: React.ComponentProps<"form">["action"];
  /** `adding` shows a spinner and cannot be pressed; `added` and `error` are announced politely. */
  status?: QuickAddStatus;
};

/**
 * A form with the product's id and a submit button, outside the card's link and above its stretched
 * area. The visible text is "Add to cart", or "Choose options" when the product has more than one
 * variant (a card cannot say which to add: the action sends the shopper to the product's page);
 * the name adds the product's title after it, so the visible text stays inside the name (WCAG
 * 2.5.3) and a list of buttons can be told apart. A sold-out product's button is disabled and says
 * so. While `adding` the button is `aria-disabled` and, being a plain button then, submits nothing.
 */
function CardQuickAdd({
  product,
  copy,
  locale,
  action,
  status = "idle",
  className,
}: QuickAddProps & {
  product: ProductCard;
  copy: ProductCardCopy;
  locale: string;
  className?: string;
}) {
  const text = copy.card.quickAdd;
  const soldOut = isSoldOut(product);
  const adding = status === "adding" && !soldOut;
  const label = soldOut
    ? copy.card.soldOut
    : adding
      ? text.adding
      : status === "added"
        ? text.added
        : product.variantCount > 1
          ? text.chooseOptions
          : text.add;
  return (
    <form
      action={action}
      data-slot="product-card-quick-add"
      data-status={status}
      className={cn("relative z-10 flex flex-col", className)}
    >
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="handle" value={product.handle} />
      <Button
        type={adding ? "button" : "submit"}
        variant="outline"
        disabled={soldOut || adding}
        focusableWhenDisabled={adding}
        aria-busy={adding ? true : undefined}
        className="w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        {adding ? <Spinner aria-hidden="true" label={text.adding} /> : null}
        {status === "added" && !soldOut ? <CheckIcon aria-hidden="true" /> : null}
        <span data-slot="product-card-quick-add-label">{label}</span>
        <VisuallyHidden>
          {formatMessage(text.forProduct, { title: product.title }, locale)}
        </VisuallyHidden>
      </Button>
      <div role="status" aria-live="polite">
        {status === "added" && !soldOut ? <VisuallyHidden>{text.added}</VisuallyHidden> : null}
        {status === "error" && !soldOut ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="wrap-anywhere">{text.error}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}

export {
  CardBadges,
  CardMedia,
  CardPrice,
  CardQuickAdd,
  CardRating,
  CardRoot,
  CardSwatches,
  CardTitle,
  cardBadges,
  isSoldOut,
};
export type {
  Aspect,
  CardBadge,
  HeadingElement,
  ProductCardCopy,
  ProductCardProps,
  QuickAddProps,
  QuickAddStatus,
  Radius,
};
