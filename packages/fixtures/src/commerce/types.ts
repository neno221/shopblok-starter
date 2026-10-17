import type {
  ActiveFilters,
  Address,
  Announcement,
  Cart,
  CartLine,
  Category,
  EmptyStateContent,
  FacetGroup,
  FooterColumn,
  MarketOption,
  MediaFigure,
  NavItem,
  Order,
  PaymentMethod,
  ProductCard,
  ProductDetail,
  RatingSummary,
  Review,
  SavedPaymentMethod,
  SearchResult,
  ShippingOption,
} from "@shopblok/registry/contracts";
import type { DesignSystemLocale, DesignSystemMarket } from "../design-system";
import type { AccordionSection, ToastMessage } from "@shopblok/registry/contracts";

/** A section of a FAQ: the contract's heading and id, and the answer in paragraphs. */
export type FaqItem = AccordionSection & { answer: string[] };

/** A toast and the words of the button that shows it. */
export type ToastSample = { trigger: string; message: ToastMessage };
import type { Countdown, DiscountCode, NewsletterSignup } from "@shopblok/registry/contracts";

/**
 * What one locale's commerce fixtures hold (M2 plan, T30 step 3): a value of each view model of
 * `@shopblok/registry/contracts`, in the locale's language and its DS market's currency (D33), with
 * every link under the market's prefix. `commerce.test.ts` parses each with its schema.
 */
export type CommerceFixture = {
  locale: DesignSystemLocale;
  /** The DS market the fixture renders with: `designSystemFixtures[locale].market`. */
  market: DesignSystemMarket;
  /** What its URLs start with (SPEC §8.5): `""` for el-cy, `/us`, `/de`, `/ch/fr`. */
  prefix: string;
  /** Twelve cards: one with a long title, one on sale, one sold out, one with ten swatches. */
  products: ProductCard[];
  /** The product page of the first card (the Heritage Hoodie): colours, sizes, variants, media. */
  product: ProductDetail;
  /** The category tree, three levels deep. */
  categories: Category[];
  /** Three lines, under the free-shipping threshold, with a promotion code. */
  cart: Cart;
  /** One address in each DS market's country (CY, US, DE, CH), each in its format. */
  addresses: Address[];
  /** Two orders: one delivered (its whole history), one placed and paid. */
  orders: Order[];
  reviews: Review[];
  ratingSummary: RatingSummary;
  /** The header's items: links, a dropdown and a mega menu. */
  navigation: NavItem[];
  footer: FooterColumn[];
  /** The six seeded countries (markets.ts) with their languages; the DS market is current. */
  markets: MarketOption[];
  paymentMethods: PaymentMethod[];
  savedPaymentMethods: SavedPaymentMethod[];
  shippingOptions: ShippingOption[];
  search: SearchResult;
  facets: FacetGroup[];
  /** The filters `facets` has chosen, as chips: each with the listing without it (T33). */
  activeFilters: ActiveFilters;
  announcement: Announcement;
  figure: MediaFigure;
  /** EmptyState's samples (T33): filters that match nothing, a search with no result, an empty category. */
  emptyStates: {
    /** With a way out: the listing without its filters. */
    filters: EmptyStateContent;
    search: EmptyStateContent;
    /** With no action: there is nothing to do but wait. */
    category: EmptyStateContent;
  };
  /** The sample data of NewsletterForm, CopyCodeChip and CountdownTimer (T33). */
  marketing: {
    /** The newsletter form with nothing typed, with an address typed, and with a very long one. */
    newsletter: { empty: NewsletterSignup; typed: NewsletterSignup; long: NewsletterSignup };
    /** The cart's promotion code. */
    discountCode: DiscountCode;
    /** A code of the contract's longest length, with nowhere to break. */
    longDiscountCode: DiscountCode;
    /** Countdowns rendered at `fixtureNow` (D50) that end days, hours or seconds later, or at once. */
    countdown: {
      days: Countdown;
      hours: Countdown;
      seconds: Countdown;
      /** Three digits of days. */
      long: Countdown;
      /** `now` is `endsAt`: the contract allows it, and it is over. */
      ended: Countdown;
    };
  };
  /** The sample data of AccordionItem and Toast (T33). */
  site: {
    faq: {
      /** Five questions, with an id each section of an accordion can have. */
      items: FaqItem[];
      /** One at the length that breaks a layout: a long question, long answers. */
      long: FaqItem;
    };
    /** One toast of each kind, and a long one, each with the words of the button that shows it. */
    toasts: { success: ToastSample; error: ToastSample; info: ToastSample; long: ToastSample };
  };
  /** The same kinds of values at the length that breaks a layout. */
  long: {
    product: ProductCard;
    cartLine: CartLine;
    address: Address;
    navItem: NavItem;
    footerColumn: FooterColumn;
    review: Review;
    shippingOption: ShippingOption;
  };
};
