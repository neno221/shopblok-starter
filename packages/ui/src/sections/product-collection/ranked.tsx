// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The product collection's
// `ranked` member: a numbered list ("Top 5"), the source's products in its order, each a row with
// its number large at the start, then the picture, the name and the price; one column on a phone,
// two from `md`. The list is an `<ol>`, and each product's link is named with its number first
// ("Number 1: Heritage Hoodie", `sections.productCollection.rank`), so a screen reader that lists
// the links hears the ranking too; the large number is drawn for the eye and hidden from it, which
// would otherwise read it twice. The whole row is the link's target (the card's `after:` overlay).
// A server component.
import { formatMessage } from "@shopblok/i18n";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import {
  CardMedia,
  CardPrice,
  CardRating,
  CardRoot,
} from "@shopblok/ui/molecules/product-card/parts";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import type * as React from "react";
import { EmptyCollection, ProductCollectionIntro, ProductCollectionLink } from "./parts";
import type { ProductCollectionSectionProps } from "./standard";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function ProductCollectionRanked(props: ProductCollectionSectionProps) {
  const { settings, heading, intro, link, products, copy, locale, prefetch, className } = props;
  if (products.length === 0) return <EmptyCollection {...props} variant="ranked" />;
  return (
    <SectionFrame
      data-variant="ranked"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <ProductCollectionIntro heading={heading} intro={intro} />
      <ol
        aria-label={copy.products.grid.label}
        data-slot="product-ranking"
        className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2"
      >
        {products.map((product, index) => {
          const rank = index + 1;
          return (
            <li
              key={product.id}
              data-slot="product-rank"
              data-rank={rank}
              className="min-w-0 border-b border-border pb-4"
            >
              <CardRoot product={product} variant="horizontal" className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  data-slot="product-rank-number"
                  className="w-12 shrink-0 text-center text-4xl font-semibold text-muted-foreground tabular-nums md:w-16 md:text-5xl"
                >
                  {rank}
                </span>
                <CardMedia
                  product={product}
                  sizes="96px"
                  aspect="tall"
                  className="w-20 shrink-0 md:w-24"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h3
                    data-slot="product-card-title"
                    className="min-w-0 text-base leading-snug font-medium text-foreground"
                  >
                    <NextLink
                      href={product.href as LinkHref}
                      prefetch={prefetch}
                      className="block min-h-11 text-foreground no-underline outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring"
                    >
                      <VisuallyHidden>
                        {formatMessage(copy.productCollection.rank, { rank }, locale)}:{" "}
                      </VisuallyHidden>
                      {/* Clamped as the card's title is (CardTitle); the link's name is the whole. */}
                      <span
                        data-truncate=""
                        className="line-clamp-2 wrap-anywhere group-hover/card:underline"
                      >
                        {product.title}
                      </span>
                    </NextLink>
                  </h3>
                  <CardPrice product={product} copy={copy.products} locale={locale} />
                  <CardRating product={product} copy={copy.products} locale={locale} />
                </div>
              </CardRoot>
            </li>
          );
        })}
      </ol>
      <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { ProductCollectionRanked };
