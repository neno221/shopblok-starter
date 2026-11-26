import type { Breadcrumbs } from "@shopblok/registry/contracts";
import type { Graph, WebPage } from "schema-dts";
import { absolute, pageBreadcrumbs, siteBase } from "./product";

// A CMS page's structured data (SPEC §12, D82, T68): a `WebPage` (its title, its SEO description
// and its language) and its `BreadcrumbList` (Home, its parents, the page), as one `@graph`. URLs
// are absolute, from `NEXT_PUBLIC_BASE_URL`.

export type CmsPageJsonLdInput = {
  title: string;
  /** The page's own URL, its canonical. */
  href: string;
  /** The market's `<html lang>`. */
  language: string;
  /** Home and the page's parents (the page itself is added last). */
  breadcrumbs: Breadcrumbs;
  description?: string;
};

export function cmsPageJsonLd(input: CmsPageJsonLdInput, base: URL = siteBase()): Graph {
  const url = absolute(input.href, base);
  const page: WebPage = {
    "@type": "WebPage",
    "@id": `${url}#page`,
    name: input.title,
    url,
    inLanguage: input.language,
    ...(input.description === undefined ? {} : { description: input.description }),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [page, pageBreadcrumbs(input.breadcrumbs, input.href, base)],
  };
}
