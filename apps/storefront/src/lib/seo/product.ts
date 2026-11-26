import type { Breadcrumbs, ProductDetail } from "@shopblok/registry/contracts";
import type { BreadcrumbList, Graph, ItemAvailability, Offer, Product, Thing, WithContext } from "schema-dts";
import { env, type RawEnv } from "../env";

// The product page's structured data and texts for crawlers (SPEC §12, T49): JSON-LD `Product` with
// one `Offer` per variant that has a price, and the `BreadcrumbList` of its trail. URLs are absolute,
// from `NEXT_PUBLIC_BASE_URL` (which `next build` writes into the bundle, as it does for the
// metadata's `metadataBase`).
//
// M7 D147 (T110): the builders stay plain objects, typed with `schema-dts` (a dev dependency, types
// only: `import type`, so no byte of it reaches a bundle), which settles SPEC §12's open question.

const LOCAL_BASE = "http://localhost:8000";

let warnedLocal = false;

/**
 * The site's origin for absolute URLs: `NEXT_PUBLIC_BASE_URL`, or the local one when it is unset.
 * A value that is not a URL throws (a typo would otherwise publish localhost in every canonical),
 * and a production build or server without one says so once on the console: CI builds with no
 * `.env`, so it cannot fail there, but a real deployment must not publish localhost unnoticed.
 */
export function siteBase(source: RawEnv = env): URL {
  const value = source.NEXT_PUBLIC_BASE_URL?.trim();
  if (!value) {
    if (source.NODE_ENV === "production" && !warnedLocal) {
      warnedLocal = true;
      console.error(
        `[seo] NEXT_PUBLIC_BASE_URL is not set: canonical, hreflang, Open Graph and JSON-LD URLs use ${LOCAL_BASE}`,
      );
    }
    return new URL(LOCAL_BASE);
  }
  try {
    return new URL(value);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_BASE_URL is "${value}", which is not a URL (https://shop.example)`,
    );
  }
}

/** `path` (or a URL) as an absolute URL on `base`. */
export const absolute = (path: string, base: URL) => new URL(path, base).toString();

/**
 * A page's `BreadcrumbList`: its trail, the page itself last, each step an absolute URL. The
 * product, listing, journal and post pages share it (PR 100 review, item 6).
 */
export function breadcrumbList(
  trail: readonly { label: string; href: string }[],
  base: URL,
): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.label,
      item: absolute(step.href, base),
    })),
  };
}

/** A page's breadcrumbs, the page itself last at `href`, as its `BreadcrumbList`. */
export const pageBreadcrumbs = (
  breadcrumbs: Breadcrumbs,
  href: string,
  base: URL,
): BreadcrumbList =>
  breadcrumbList([...breadcrumbs.trail, { label: breadcrumbs.current, href }], base);

/** A picture a crawler can fetch: an http(s) URL or a path, not the placeholder's `data:` one. */
export function shareableImage(src: string, base: URL): string | undefined {
  return /^(?:https?:\/\/|\/(?!\/))/.test(src) ? absolute(src, base) : undefined;
}

/** The description's first ~160 characters, cut at a word: what `<meta name="description">` takes. */
export function metaDescription(text: string, limit = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), limit / 2)).trimEnd()}…`;
}

const SCHEMA_STOCK = {
  "in-stock": "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  out: "https://schema.org/OutOfStock",
} as const satisfies Record<string, ItemAvailability>;

/**
 * `Product`, its `Offer`s and the page's `BreadcrumbList`, as one `@graph`. `validUntil` is the day
 * a variant's sale price ends, by the variant's id (M7 D147: `priceValidUntil`, from the sale's
 * price list, `lib/medusa/sale-ends.ts`); a regular price has none, and Google takes an offer
 * without one (its Product structured data lists it as recommended, not required).
 */
export function productJsonLd(
  product: ProductDetail,
  base: URL = siteBase(),
  validUntil: Readonly<Record<string, string>> = {},
): Graph {
  const url = absolute(product.href, base);
  const images = product.media.flatMap((item) => shareableImage(item.src, base) ?? []);
  const trail = [...product.breadcrumbs, { label: product.title, href: product.href }];
  const node: Product = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    ...(product.description === "" ? {} : { description: product.description }),
    ...(images.length === 0 ? {} : { image: images }),
    url,
    offers: product.variants.map((variant): Offer => {
      const until = validUntil[variant.id];
      return {
        "@type": "Offer",
        ...(variant.sku === undefined ? {} : { sku: variant.sku }),
        name: variant.title,
        price: String(variant.price.amount),
        priceCurrency: variant.price.currencyCode,
        ...(until === undefined ? {} : { priceValidUntil: until }),
        availability: variant.available ? SCHEMA_STOCK[variant.stock.status] : SCHEMA_STOCK.out,
        url: `${url}?variant=${encodeURIComponent(variant.id)}`,
      };
    }),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [node, breadcrumbList(trail, base)],
  };
}

/** Structured data a page writes: one `@graph`, or one node with its `@context` (the FAQs). */
export type JsonLd = Graph | WithContext<Thing>;

/**
 * JSON for a `<script type="application/ld+json">`: `<` escaped, so a product text holding
 * `</script>` cannot end the element.
 */
export function jsonLdText(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
