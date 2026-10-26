import { siteBase } from "./product";

// The home page's structured data (SPEC §12, T51): the shop as an `Organization` and the market's
// site as a `WebSite` with a `SearchAction` on its search page, as one `@graph`. URLs are absolute,
// from `NEXT_PUBLIC_BASE_URL`; the organization is one for every market (its `@id` is the origin's).

export type HomeJsonLdInput = {
  storeName: string;
  /** The market's home (`/us`, or `/` for the market without a prefix). */
  homeHref: string;
  /** The market's search page (`/us/search`). */
  searchHref: string;
  /** The market's `<html lang>`. */
  language: string;
};

export function homeJsonLd(input: HomeJsonLdInput, base: URL = siteBase()): object {
  const origin = new URL("/", base).toString();
  const home = new URL(input.homeHref, base).toString();
  const search = new URL(input.searchHref, base).toString();
  const organization = `${origin}#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": organization, name: input.storeName, url: origin },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: input.storeName,
        url: home,
        inLanguage: input.language,
        publisher: { "@id": organization },
        potentialAction: {
          "@type": "SearchAction",
          // The placeholder stays as written: `URL` would escape its braces.
          target: { "@type": "EntryPoint", urlTemplate: `${search}?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
