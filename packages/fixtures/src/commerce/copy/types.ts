import type { Address, LineOption } from "@shopblok/registry/contracts";
import type {
  CategoryKey,
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

/** One question of a FAQ and its answer in paragraphs. */
export type FaqCopy = { title: string; answer: string[] };

/** A toast, and the words of the button that shows it. */
export type ToastCopy = {
  trigger: string;
  title: string;
  description?: string;
  actionLabel?: string;
};

export type Copy = {
  /** The first breadcrumb: the market's home page. */
  home: string;
  productTitles: Record<Exclude<ProductHandle, "heritage-hoodie">, string>;
  /** The rest of the Heritage Hoodie's description, after the design system's sentence. */
  hoodieDetails: string;
  /** The label of the merchant's own badge (`custom`). */
  customBadge: string;
  categories: Record<CategoryKey, string>;
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
    /** The footer's last line (T36), from the store's name and the year. */
    copyright: (store: string, year: number) => string;
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
    /** SearchOverlay's (T37): the visitor's last queries, newest first, and one that finds nothing. */
    recent: [string, string, string, string];
    misspelt: string;
  };
  /** The home page's words (T51). */
  homePage: {
    /** The hero's words (the shop's, as `site.ts` writes them in the app). */
    hero: { title: string; text: string; action: string };
    /** The sections' headings and links (the catalogs' `templates.home`). */
    categories: string;
    newArrivals: string;
    seeAllNew: string;
    shopAll: string;
  };
  /**
   * The listing and search pages' words (T50): the sort's four options as the catalog names them,
   * and the search page's heading for `search.query`.
   */
  listingPage: {
    sort: { relevance: string; newest: string; priceAsc: string; priceDesc: string };
    resultsFor: string;
  };
  /** ProductCarousel's heading and its link to the listing (T37). */
  carousel: { title: string; viewAll: string };
  /**
   * The product page's words (T38): the notes under the buy box's button, the titles and words of
   * the information's sections (the description is the product's own), and the size guide's.
   */
  productPage: {
    /** The related products' heading on the product page (T49). */
    related: string;
    notes: [string, string];
    sections: { description: string; details: string; delivery: string; returns: string };
    /** Facts about the hoodie: a label and its value each. */
    facts: { material: [string, string]; fit: [string, string]; origin: [string, string] };
    care: [string, string, string];
    delivery: [string, string];
    returns: string;
    returnsLink: string;
    sizeGuide: {
      title: string;
      chest: string;
      waist: string;
      length: string;
      sleeve: string;
      note: string;
    };
  };
  facets: {
    category: string;
    colour: string;
    size: string;
    price: string;
    inStock: string;
    onSale: string;
  };
  /** The chips of the chosen filters (ActiveFilterChips): the price range as the market writes it. */
  activeFilters: { priceRange: (min: number, max: number) => string };
  /** The free-shipping message names the threshold (EUR 150, USD 165, CHF 150) as its locale writes it. */
  announcement: { message: string; link: string };
  /**
   * The header's samples (T35): two more messages for the announcement bar to show in turn after
   * `announcement`, one at the length that breaks a layout, the account's links at the foot of the
   * mobile drawer, the `markets` global's own suggestion message, and the picture the transparent
   * header sits on.
   */
  header: {
    announcements: [{ message: string; link: string }, { message: string; link: string }];
    longAnnouncement: { message: string; link: string };
    account: { signIn: string; orders: string; wishlist: string };
    suggestionMessage: string;
    heroAlt: string;
  };
  /** `credit` is the name alone ("Shopblok Studio"): MediaFigure's copy adds the "Photo: …". */
  figure: { alt: string; caption: string; credit: string };
  /**
   * EmptyState's samples (T33): no product matches the filters, a search finds nothing, a category
   * has no products yet. `action` is the link's text.
   */
  emptyStates: {
    filters: { title: string; text: string; action: string };
    search: { title: string; text: string; action: string };
    category: { title: string; text: string };
  };
  /**
   * AccordionItem's and Toast's samples (T33): a FAQ of five questions and one long one, and a toast
   * of each kind with the button that shows it. `answer` is paragraphs. CookieConsent's (T36): the
   * shop's own sentence.
   */
  site: {
    faq: {
      items: [FaqCopy, FaqCopy, FaqCopy, FaqCopy, FaqCopy];
      long: FaqCopy;
    };
    toasts: { success: ToastCopy; error: ToastCopy; info: ToastCopy; long: ToastCopy };
    /** The cookie banner's sentence in the shop's own words (`site-settings`, T36). */
    cookieMessage: string;
  };
  /**
   * The account's samples (T39): the names of the account's pages in its navigation, and the
   * return reasons a shop writes in Medusa (four, in the order the select lists them).
   */
  account: {
    nav: {
      overview: string;
      orders: string;
      addresses: string;
      paymentMethods: string;
      returns: string;
      profile: string;
    };
    reasons: { tooSmall: string; tooLarge: string; notAsDescribed: string; changedMind: string };
    /** What a customer writes in the return's note. */
    note: string;
  };
  /**
   * The labels of Stepper's samples (T34): checkout's three steps as SPEC §8.4 names them (contact
   * and address; delivery and payment; review), the cart, the delivery and the payment as steps of
   * their own for a longer flow, and four labels at the length that breaks a layout.
   */
  checkoutFlow: {
    cart: string;
    contact: string;
    delivery: string;
    deliveryAndPayment: string;
    payment: string;
    review: string;
    long: [string, string, string, string];
  };
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
  /** A CMS page under a parent (T65): the parent's title and the page's. */
  cmsPage: { parent: string; title: string };
};
