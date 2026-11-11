// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D79, D100). The bundle's `list`
// member: the products that go together as compact rows, each its picture, its name, its price and
// its own way to the cart (its page, where its options are chosen), and under them the sum of the
// listed prices as text, "Together €95.00" ("from" when a product's price depends on its options).
// v1 has no bundle price (D79), so the sum is only the prices added up, in the market's currency,
// and it is not drawn when the prices are in different currencies (a design system's mix). A server
// component.
import {
  CardMedia,
  CardPrice,
  CardRoot,
  CardTitle,
} from "@shopblok/ui/molecules/product-card/parts";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import type { PriceSummary, ProductCard } from "@shopblok/registry/contracts";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import type { BundleSectionProps } from "./standard";

/** The listed prices added up, or `null` when they are in different currencies. */
export function bundleTotal(products: readonly ProductCard[]): PriceSummary | null {
  const [first] = products;
  if (first === undefined) return null;
  const currencyCode = first.price.price.currencyCode;
  if (products.some((product) => product.price.price.currencyCode !== currencyCode)) return null;
  // In major units: rounded to the cent, so 0.1 + 0.2 is 0.30.
  const amount =
    Math.round(products.reduce((sum, product) => sum + product.price.price.amount, 0) * 100) / 100;
  return {
    price: { amount, currencyCode },
    varies: products.some((product) => product.price.varies),
  };
}

function BundleList({
  settings,
  heading,
  text,
  products,
  copy,
  locale,
  prefetch,
  className,
}: BundleSectionProps) {
  const total = bundleTotal(products);
  return (
    <SectionFrame
      data-variant="list"
      settings={settings}
      slot="bundle-section"
      className={className}
      innerClassName="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <SectionHeading>{heading}</SectionHeading>
        {text === undefined ? null : (
          <div className="flex max-w-prose flex-col gap-3 text-base text-pretty wrap-anywhere text-muted-foreground">
            {text.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <ul
          aria-label={copy.products.grid.label}
          data-slot="bundle-rows"
          className="flex flex-col rounded-xl border border-border"
        >
          {products.map((product) => (
            <li
              key={product.id}
              data-slot="bundle-row"
              className="min-w-0 border-b border-border p-3 last:border-b-0 md:p-4"
            >
              <CardRoot product={product} variant="horizontal" className="flex items-center gap-4">
                <CardMedia
                  product={product}
                  sizes="80px"
                  aspect="square"
                  className="w-16 shrink-0 md:w-20"
                />
                <CardTitle
                  product={product}
                  prefetch={prefetch}
                  // The row leaves the name a narrow column on a phone (W7 review item 9).
                  lines={3}
                  className="flex-1 text-base"
                />
                <CardPrice
                  product={product}
                  copy={copy.products}
                  locale={locale}
                  className="shrink-0 items-end text-end"
                />
              </CardRoot>
            </li>
          ))}
        </ul>
        {total === null ? null : (
          <div
            data-slot="bundle-total"
            className="flex flex-wrap items-baseline justify-end gap-x-2 text-base font-medium"
          >
            <span>{copy.bundle.total}</span>
            <PriceBlock price={total} copy={copy.products.priceBlock} locale={locale} size="lg" />
          </div>
        )}
      </div>
    </SectionFrame>
  );
}

export { BundleList };
