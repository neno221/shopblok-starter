import type { Breadcrumbs, ProductCard } from "@shopblok/registry/contracts";
import { absolute, breadcrumbList, siteBase } from "./product";

// A listing page's structured data (SPEC §12, T50): `CollectionPage` with the page's products as an
// `ItemList` (the whole listing's size, and the products' positions in it) and the page's
// `BreadcrumbList`, as one `@graph`. URLs are absolute, from `NEXT_PUBLIC_BASE_URL`.

export type ListingJsonLdInput = {
  name: string;
  /** The page's own URL (a listing's pages are self-canonical). */
  href: string;
  breadcrumbs: Breadcrumbs;
  products: readonly ProductCard[];
  /** The position of the page's first product in the whole listing, from 1. */
  firstPosition: number;
  /** Every product in the listing, over all its pages: the list's size, which the positions run in. */
  total: number;
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
          numberOfItems: input.total,
          itemListElement: input.products.map((product, index) => ({
            "@type": "ListItem",
            position: input.firstPosition + index,
            name: product.title,
            url: absolute(product.href, base),
          })),
        },
      },
      breadcrumbList(trail, base),
    ],
  };
}
