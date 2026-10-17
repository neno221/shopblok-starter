import type { Address, LineOption } from "@shopblok/registry/contracts";
import type {
  CategoryHandle,
  ColourKey,
  designSystemColourKeys,
  ProductHandle,
} from "../data/catalog";

// The words of one locale's commerce fixtures. Everything that is not a number, an id, a handle
// or a date is here, and `build/` puts it into the contracts' shapes. The Heritage Hoodie's title
// and the colours of `design-system.ts` are not repeated: the context takes them from there.

type Six<T> = [T, T, T, T, T, T];

export type ReviewCopy = { author: string; title?: string; body: string };

/** A tile of a mega menu: its title and what its picture shows. */
export type FeatureCopy = { title: string; alt: string };

export type Copy = {
  /** The first breadcrumb: the market's home page. */
  home: string;
  productTitles: Record<Exclude<ProductHandle, "heritage-hoodie">, string>;
  /** The rest of the Heritage Hoodie's description, after the design system's sentence. */
  hoodieDetails: string;
  /** The label of the merchant's own badge (`custom`). */
  customBadge: string;
  categories: Record<CategoryHandle, string>;
  /** The colours that `design-system.ts` does not name. */
  colours: Record<Exclude<ColourKey, (typeof designSystemColourKeys)[number]>, string>;
  /** The titles of the two options of a variant. */
  options: { colour: string; size: string };
  /** What a product photo shows, from the product's title (and the colour). */
  imageAlt: {
    front: (title: string) => string;
    back: (title: string) => string;
    detail: (title: string) => string;
    colour: (title: string, colour: string) => string;
  };
  reviews: Six<ReviewCopy>;
  navigation: {
    newIn: string;
    sale: string;
    /** The title of the mega menu's column of pages that are not categories. */
    discover: string;
    bestsellers: string;
    giftCards: string;
    organic: string;
    womenFeatures: [FeatureCopy, FeatureCopy];
    menFeatures: [FeatureCopy];
  };
  footer: {
    shop: string;
    help: string;
    company: string;
    legal: string;
    shipping: string;
    sizeGuide: string;
    contact: string;
    faq: string;
    trackOrder: string;
    about: string;
    sustainability: string;
    careers: string;
    stores: string;
    terms: string;
    privacy: string;
    cookies: string;
    imprint: string;
  };
  shipping: {
    standard: string;
    express: string;
    free: string;
    pickup: string;
    sameDay: string;
    /** The store where an order can be collected. */
    storeName: string;
  };
  /** The card's name; the other methods are brands and keep theirs. */
  card: string;
  search: {
    query: string;
    categories: [string, string];
    suggestions: [string, string, string];
  };
  facets: {
    category: string;
    colour: string;
    size: string;
    price: string;
    inStock: string;
    onSale: string;
  };
  /** The free-shipping message names the threshold (EUR 150, USD 165, CHF 150) as its locale writes it. */
  announcement: { message: string; link: string };
  /** `credit` is the name alone ("Shopblok Studio"): MediaFigure's copy adds the "Photo: …". */
  figure: { alt: string; caption: string; credit: string };
  /** The same kinds of strings at the length that breaks a layout (German's are the longest). */
  long: {
    productTitle: string;
    badge: string;
    cartLine: { title: string; options: [LineOption, LineOption] };
    /** An address in the market's country, with its long street, city and company. */
    address: Omit<Address, "id" | "countryCode" | "isDefaultShipping" | "isDefaultBilling">;
    nav: {
      label: string;
      columns: [
        { title: string; links: [string, string, string] },
        { title: string; links: [string, string, string] },
      ];
      feature: FeatureCopy;
    };
    footer: { title: string; links: [string, string, string, string, string] };
    review: ReviewCopy & { title: string };
    shippingName: string;
  };
};
