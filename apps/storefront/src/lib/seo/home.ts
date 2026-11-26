import type { Graph, Organization, SearchAction, WebSite } from "schema-dts";
import { shareableImage, siteBase } from "./product";

// The home page's structured data (SPEC §12, T51): the shop as an `Organization` and the market's
// site as a `WebSite` with a `SearchAction` on its search page, as one `@graph`. URLs are absolute,
// from `NEXT_PUBLIC_BASE_URL`; the organization is one for every market (its `@id` is the origin's).
// T68 (D82): the organization's legal name, e-mail, telephone and logo from the site settings.

export type HomeJsonLdInput = {
  storeName: string;
  /** The site settings' organization (D82), each part only when it is set. */
  organization?: { legalName?: string; email?: string; telephone?: string; logo?: string };
  /** The market's home (`/us`, or `/` for the market without a prefix). */
  homeHref: string;
  /** The market's search page (`/us/search`). */
  searchHref: string;
  /** The market's `<html lang>`. */
  language: string;
};

export function homeJsonLd(input: HomeJsonLdInput, base: URL = siteBase()): Graph {
  const origin = new URL("/", base).toString();
  const home = new URL(input.homeHref, base).toString();
  const search = new URL(input.searchHref, base).toString();
  const organization = `${origin}#organization`;
  const { legalName, email, telephone, logo } = input.organization ?? {};
  const logoUrl = logo === undefined ? undefined : shareableImage(logo, base);
  const shop: Organization = {
    "@type": "Organization",
    "@id": organization,
    name: input.storeName,
    url: origin,
    ...(legalName === undefined ? {} : { legalName }),
    ...(email === undefined ? {} : { email }),
    ...(telephone === undefined ? {} : { telephone }),
    ...(logoUrl === undefined ? {} : { logo: logoUrl }),
  };
  // `query-input` is Google's (its sitelinks search box), not schema.org's, so `schema-dts` has no
  // property for it: the type is widened by that one key.
  const searchAction: SearchAction & { "query-input": string } = {
    "@type": "SearchAction",
    // The placeholder stays as written: `URL` would escape its braces.
    target: { "@type": "EntryPoint", urlTemplate: `${search}?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  };
  const site: WebSite = {
    "@type": "WebSite",
    "@id": `${home}#website`,
    name: input.storeName,
    url: home,
    inLanguage: input.language,
    publisher: { "@id": organization },
    potentialAction: searchAction,
  };
  return { "@context": "https://schema.org", "@graph": [shop, site] };
}
