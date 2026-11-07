// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100, D102). The product
// collection's `tabs` member: up to four sources as tabs ("New", "On sale"), each over a grid of
// standard cards in the listing's columns. Only the first tab's products are in the HTML: without
// scripts, before the tabs' code has loaded and for a crawler, the tabs are a list of links to the
// listings their products come from (the first marked as the one shown) over the first tab's grid.
// In the browser they are tabs (`tabs-panels.tsx`, loaded on demand by `tabs-island.tsx`) that
// fetch another tab's products when it is chosen; drawn, they hide that list and grid through the
// `:has()` rule on the wrapper, so nothing is drawn twice and nothing moves. With one tab left (the
// others' sources have nothing in the market) it is the heading over that tab's grid. The tab list
// and the links are named by the heading. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { useId } from "react";
import type * as React from "react";
import {
  CollectionCards,
  EmptyCollection,
  ProductCollectionIntro,
  ProductCollectionLink,
} from "./parts";
import type { ProductCollectionSectionProps } from "./standard";
import { ProductCollectionTabsIsland } from "./tabs-island";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function ProductCollectionTabs(props: ProductCollectionSectionProps) {
  const {
    settings,
    heading,
    intro,
    link,
    tabs = [],
    products,
    copy,
    locale,
    prefetch,
    className,
  } = props;
  const headingId = useId();
  if (products.length === 0) return <EmptyCollection {...props} variant="tabs" />;
  const cards = (
    <CollectionCards products={products} copy={copy.products} locale={locale} prefetch={prefetch} />
  );
  return (
    <SectionFrame
      data-variant="tabs"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <ProductCollectionIntro heading={heading} intro={intro} headingId={headingId} />
      {tabs.length < 2 ? (
        cards
      ) : (
        <div
          data-slot="product-collection-tabs-root"
          className="group/tabs flex min-w-0 flex-col gap-6"
        >
          <ProductCollectionTabsIsland
            tabs={tabs}
            first={products}
            labelledBy={headingId}
            copy={{ products: copy.products, tabs: copy.tabs }}
            locale={locale}
            prefetch={prefetch}
          />
          <div
            data-slot="product-collection-tab-links"
            className="flex min-w-0 flex-col gap-6 group-has-data-[slot=product-collection-tabs]/tabs:hidden"
          >
            <ul aria-labelledby={headingId} className="flex flex-wrap gap-x-2 gap-y-1">
              {tabs.map((tab, index) => (
                <li key={`${index} ${tab.href}`} className="max-w-full min-w-0">
                  <NextLink
                    href={tab.href as LinkHref}
                    prefetch={prefetch}
                    aria-current={index === 0 ? "true" : undefined}
                    data-slot="product-collection-tab-link"
                    className={cn(
                      "inline-flex min-h-11 min-w-11 items-center rounded-md px-3 text-base font-medium wrap-anywhere underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring",
                      index === 0 ? "text-foreground underline" : "text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </NextLink>
                </li>
              ))}
            </ul>
            {cards}
          </div>
        </div>
      )}
      <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { ProductCollectionTabs };
