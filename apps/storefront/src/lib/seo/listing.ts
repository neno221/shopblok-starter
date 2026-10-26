import type { Breadcrumbs, ProductCard } from "@shopblok/registry/contracts";
import { siteBase } from "./product";

// A listing page's structured data (SPEC §12, T50): `CollectionPage` with the page's products as an
// `ItemList` (their positions on this page, counted from the page's first) and the page's
// `BreadcrumbList`, as one `@graph`. URLs are absolute, from `NEXT_PUBLIC_BASE_URL`.

const absolute = (path: string, base: URL) => new URL(path, base).toString();

export type ListingJsonLdInput = {
  name: string;
  /** The page's own URL (a listing's pages are self-canonical). */
  href: string;
  breadcrumbs: Breadcrumbs;
  products: readonly ProductCard[];
  /** The position of the page's first product in the whole listing, from 1. */
  firstPosition: number;
};

export function listingJsonLd(input: ListingJsonLdInput, base: URL = siteBase()): object {
  const url = absolute(input.href, base);
  const trail = [
    ...input.breadcrumbs.trail,
    { label: input.breadcrumbs.current, href: input.href },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        name: input.name,
        url,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: input.products.length,
          itemListElement: input.products.map((product, index) => ({
            "@type": "ListItem",
            position: input.firstPosition + index,
            name: product.title,
            url: absolute(product.href, base),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: trail.map((step, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: step.label,
          item: absolute(step.href, base),
        })),
      },
    ],
  };
}
