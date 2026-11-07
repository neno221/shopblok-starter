// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The comparison's
// `cards` member: a card per product, each with its picture, its name (a link to its page), its
// price and the table's rows stacked as a description list under the editor's labels, one above the
// other on a phone and side by side from `md` (as many columns as products), so nothing scrolls
// sideways. The heading is the section's h2 and each product's name an h3 under it. A product
// without a value shows a dash, read as "Not specified". A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { ComparisonValue, ProductLink, type ComparisonSectionProps } from "./parts";

/** The columns from `md` up: as many as there are products (two to four). */
const columns = ["md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"] as const;

function ComparisonCards({
  settings,
  heading,
  products,
  rows,
  copy,
  locale,
  prefetch,
  className,
}: ComparisonSectionProps) {
  return (
    <SectionFrame
      data-variant="cards"
      settings={settings}
      slot="comparison-section"
      className={className}
      innerClassName="flex flex-col gap-6"
    >
      <SectionHeading>{heading}</SectionHeading>
      <ul className={cn("grid grid-cols-1 gap-4 md:gap-6", columns[products.length - 2])}>
        {products.map((product, index) => (
          <li
            key={product.id}
            data-slot="comparison-card"
            className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-5 text-card-foreground"
          >
            {product.image === undefined ? null : (
              <Image
                src={product.image.src}
                alt=""
                ratio="square"
                radius="md"
                sizes="(min-width: 768px) 25vw, 100vw"
                className="w-32 md:w-full"
              />
            )}
            <h3 className="min-w-0">
              <ProductLink product={product} prefetch={prefetch} />
            </h3>
            <PriceBlock price={product.price} copy={copy.products.priceBlock} locale={locale} />
            {rows.length === 0 ? null : (
              <dl className="flex flex-col border-t text-sm">
                {rows.map((row, rowIndex) => (
                  <div
                    key={`${rowIndex} ${row.label}`}
                    className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 border-b py-2.5"
                  >
                    <dt className="font-medium text-muted-foreground wrap-anywhere">{row.label}</dt>
                    <dd className="min-w-0 text-end wrap-anywhere">
                      <ComparisonValue
                        value={row.values[index] ?? null}
                        missing={copy.comparison.missing}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

export { ComparisonCards };
