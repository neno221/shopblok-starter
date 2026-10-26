import type { Messages } from "@shopblok/i18n";
import type { CategoryTile, HomePage, Image, ProductCard } from "@shopblok/registry/contracts";

// The home page (T51, D58) from what the page read: the shop's hero words and picture (`site.ts`
// until M4's `hero` block), the top-level categories with their first product's picture, and the
// newest products. A section with nothing to show is left out, so an empty shop is the hero and
// the link to every product.

/** The category showcase shows the first eight top-level categories (the contract's most). */
export const HOME_CATEGORIES = 8;
/** The new arrivals' carousel shows the eight newest products. */
export const NEW_ARRIVALS = 8;

export type HomeInput = {
  hero: { title: string; text: string; action: string; image: Image };
  /** The top-level categories in the navigation's order, with their pages' URLs. */
  categories: readonly { label: string; href: string; image?: Image }[];
  /** The newest products as cards, newest first. */
  newArrivals: readonly ProductCard[];
  /** The catalog's `templates.home` headings and links. */
  copy: Messages["templates"]["home"];
  /** Every product's listing (`{m}/store`). */
  storeHref: string;
};

export function toHomePage({
  hero,
  categories,
  newArrivals,
  copy,
  storeHref,
}: HomeInput): HomePage {
  const tiles: CategoryTile[] = categories.slice(0, HOME_CATEGORIES).map((category) => ({
    label: category.label,
    href: category.href,
    ...(category.image === undefined ? {} : { image: category.image }),
  }));
  const products = newArrivals.slice(0, NEW_ARRIVALS);
  return {
    variant: "default",
    hero: {
      title: hero.title,
      text: hero.text,
      image: hero.image,
      action: { label: hero.action, href: storeHref },
    },
    ...(tiles.length === 0 ? {} : { categories: { title: copy.categories, items: tiles } }),
    ...(products.length === 0
      ? {}
      : {
          newArrivals: {
            title: copy.newArrivals,
            products,
            variant: "standard",
            viewAll: { label: copy.seeAllNew, href: `${storeHref}?sort=newest` },
          },
        }),
    shopAll: { label: copy.shopAll, href: storeHref },
  };
}
