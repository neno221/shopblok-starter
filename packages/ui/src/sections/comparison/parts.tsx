// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; D99). What the comparison's
// members share, moved out of `standard.tsx` (T64) with the same classes, so the first member's
// pixels are unchanged: the props, a product's picture and link, a missing value, and the table
// itself, which `highlight` draws with one column set apart (`pick`). Server components.
import type {
  ComparisonProduct,
  ComparisonSection as ComparisonSectionData,
} from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { Link } from "@shopblok/ui/atoms/link";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
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

/** The pick's cells: the muted fill between two rules in the primary colour. */
const PICKED = "border-x-2 border-x-primary bg-muted";

/** A product's name, as a link to its page. */
function ProductLink({
  product,
  prefetch,
  className,
}: {
  product: ComparisonProduct;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <Link
      href={product.href as React.ComponentProps<typeof Link>["href"]}
      prefetch={prefetch}
      variant="standalone"
      className={cn("text-base font-semibold", className)}
    >
      {product.title}
    </Link>
  );
}

/** A value, or a dash read as "Not specified". */
function ComparisonValue({ value, missing }: { value: string | null; missing: string }) {
  return (
    value ?? (
      <>
        <span aria-hidden="true">—</span>
        <VisuallyHidden>{missing}</VisuallyHidden>
      </>
    )
  );
}

/** The pick's badge, inside its column's header so a screen reader says it with the product. */
function PickBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      data-slot="comparison-pick"
      className={cn(
        "inline-flex rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * The table: captioned by the heading, a column per product headed by its picture and its link,
 * then the price and the editor's rows. It scrolls sideways in its own focusable box on a narrow
 * screen (a group named by the caption). With `pick`, that product's column is set apart (its
 * cells on the muted fill between two rules) and its header says it is the pick.
 */
function ComparisonTable({
  heading,
  products,
  rows,
  pick,
  copy,
  locale,
  prefetch,
}: ComparisonSectionProps) {
  const captionId = useId();
  const picked = (product: ComparisonProduct | undefined) =>
    pick !== undefined && product?.id === pick;
  return (
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
              <th
                key={product.id}
                scope="col"
                className={cn(
                  CELL,
                  // With a pick, every header keeps the badge's row, so the pictures line up.
                  pick !== undefined && "relative pt-10",
                  picked(product) && cn(PICKED, "rounded-t-lg border-t-2 border-t-primary"),
                )}
              >
                {picked(product) ? (
                  <PickBadge label={copy.comparison.pick} className="absolute start-3 top-3" />
                ) : null}
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
                  <ProductLink product={product} prefetch={prefetch} />
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
              <td key={product.id} className={cn(CELL, picked(product) && PICKED)}>
                <PriceBlock price={product.price} copy={copy.products.priceBlock} locale={locale} />
              </td>
            ))}
          </tr>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex} ${row.label}`}>
              <th scope="row" className={`${CELL} font-medium text-muted-foreground`}>
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={products[index]?.id ?? index}
                  className={cn(CELL, picked(products[index]) && PICKED)}
                >
                  <ComparisonValue value={value} missing={copy.comparison.missing} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { CELL, ComparisonTable, ComparisonValue, PickBadge, ProductLink };
export type { ComparisonSectionProps };
