// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `comparison`, D79). Two to four handpicked
// products side by side in a table: a column each, headed by its picture and its name (a link to its
// page); a row for the price in the market's currency, one for each of the products' options (its
// values, in the market's language) and one for each `metadata` key the editor named, under the
// editor's label. A product without a value shows a dash, read as "Not specified". The table is
// captioned by the heading. On a narrow screen it scrolls sideways in its own box, which takes the
// focus so the keyboard can scroll it too (the size guide's pattern); the box is a group named by
// the caption, not a region, so two comparisons with one heading are not two landmarks of one
// name. A server component.
import type { ComparisonSection as ComparisonSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { Link } from "@shopblok/ui/atoms/link";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { useId } from "react";
import type * as React from "react";

type ComparisonSectionProps = ComparisonSectionData & {
  copy: Pick<SectionsCopy, "products" | "comparison">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

const CELL = "border-b px-3 py-3 text-start align-top wrap-anywhere";

function ComparisonSection({
  settings,
  heading,
  products,
  rows,
  copy,
  locale,
  prefetch,
  className,
}: ComparisonSectionProps) {
  const captionId = useId();
  return (
    <SectionFrame settings={settings} slot="comparison-section" className={className}>
      <div
        data-slot="table-container"
        role="group"
        tabIndex={0}
        aria-labelledby={captionId}
        className="relative w-full overflow-x-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <table data-slot="comparison-table" className="w-full min-w-xl table-fixed text-sm">
          <caption
            id={captionId}
            className="mb-6 text-start text-2xl font-semibold text-balance wrap-anywhere md:text-3xl"
          >
            {heading}
          </caption>
          <thead>
            <tr>
              <td className="w-32 border-b" />
              {products.map((product) => (
                <th key={product.id} scope="col" className={CELL}>
                  <span className="flex flex-col items-start gap-2">
                    {product.image === undefined ? null : (
                      <Image
                        src={product.image.src}
                        alt=""
                        ratio="square"
                        radius="md"
                        sizes="128px"
                        className="w-24 md:w-32"
                      />
                    )}
                    <Link
                      href={product.href as React.ComponentProps<typeof Link>["href"]}
                      prefetch={prefetch}
                      variant="standalone"
                      className="text-base font-semibold"
                    >
                      {product.title}
                    </Link>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={`${CELL} font-medium text-muted-foreground`}>
                {copy.comparison.price}
              </th>
              {products.map((product) => (
                <td key={product.id} className={CELL}>
                  <PriceBlock
                    price={product.price}
                    copy={copy.products.priceBlock}
                    locale={locale}
                  />
                </td>
              ))}
            </tr>
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex} ${row.label}`}>
                <th scope="row" className={`${CELL} font-medium text-muted-foreground`}>
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={products[index]?.id ?? index} className={CELL}>
                    {value ?? (
                      <>
                        <span aria-hidden="true">—</span>
                        <VisuallyHidden>{copy.comparison.missing}</VisuallyHidden>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionFrame>
  );
}

export { ComparisonSection };
export type { ComparisonSectionProps };
