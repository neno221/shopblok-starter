import type { ProductDetail } from "@shopblok/registry/contracts";
import { env, type RawEnv } from "../env";

// The product page's structured data and texts for crawlers (SPEC §12, T49): JSON-LD `Product` with
// one `Offer` per variant that has a price, and the `BreadcrumbList` of its trail. URLs are absolute,
// from `NEXT_PUBLIC_BASE_URL` (which `next build` writes into the bundle, as it does for the
// metadata's `metadataBase`).

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
): object {
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
} as const;

/** `Product`, its `Offer`s and the page's `BreadcrumbList`, as one `@graph`. */
export function productJsonLd(product: ProductDetail, base: URL = siteBase()): object {
  const url = absolute(product.href, base);
  const images = product.media.flatMap((item) => shareableImage(item.src, base) ?? []);
  const trail = [...product.breadcrumbs, { label: product.title, href: product.href }];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.title,
        ...(product.description === "" ? {} : { description: product.description }),
        ...(images.length === 0 ? {} : { image: images }),
        url,
        offers: product.variants.map((variant) => ({
          "@type": "Offer",
          ...(variant.sku === undefined ? {} : { sku: variant.sku }),
          name: variant.title,
          price: String(variant.price.amount),
          priceCurrency: variant.price.currencyCode,
          availability: variant.available ? SCHEMA_STOCK[variant.stock.status] : SCHEMA_STOCK.out,
          url: `${url}?variant=${encodeURIComponent(variant.id)}`,
        })),
      },
      breadcrumbList(trail, base),
    ],
  };
}

/**
 * JSON for a `<script type="application/ld+json">`: `<` escaped, so a product text holding
 * `</script>` cannot end the element.
 */
export function jsonLdText(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
