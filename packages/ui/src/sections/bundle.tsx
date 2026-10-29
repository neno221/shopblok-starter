// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `bundle`, D79). Products that go together,
// handpicked in the editor's order: the heading, the editor's words and the cards in a row, a "+"
// between them from `md` up to say they belong together (decoration: the list and the heading say
// it already). Each card keeps its own price and its own way to the cart; v1 has no bundle price
// (D79). Two across on a phone, three from `md`. A server component.
import type { BundleSection as BundleSectionData } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { ListingCard } from "@shopblok/ui/organisms/listing-card";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { PlusIcon } from "lucide-react";

type BundleSectionProps = BundleSectionData & {
  copy: Pick<SectionsCopy, "products">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function BundleSection({
  settings,
  heading,
  text,
  products,
  copy,
  locale,
  prefetch,
  className,
}: BundleSectionProps) {
  return (
    <SectionFrame
      settings={settings}
      slot="bundle-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
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
      <ul
        aria-label={copy.products.grid.label}
        className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-10"
      >
        {products.map((product, index) => (
          <li key={product.id} className="relative min-w-0">
            {index === 0 ? null : (
              <span
                aria-hidden="true"
                data-slot="bundle-plus"
                className={cn(
                  "absolute top-1/3 -start-8 hidden size-6 items-center justify-center rounded-full bg-muted text-muted-foreground",
                  // Not before the first card of a row of three.
                  index % 3 !== 0 && "md:flex",
                )}
              >
                <PlusIcon className="size-4" />
              </span>
            )}
            <ListingCard
              variant="standard"
              product={product}
              copy={copy.products}
              locale={locale}
              sizes="(min-width: 768px) 33vw, 50vw"
              prefetch={prefetch}
            />
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

export { BundleSection };
export type { BundleSectionProps };
