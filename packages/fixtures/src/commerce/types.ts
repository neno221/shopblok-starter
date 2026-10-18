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
import type { AddressFormState } from "@shopblok/registry/contracts";
import type { AccordionSection, ToastMessage } from "@shopblok/registry/contracts";
import type { ConsentChoice, CookieConsent, Footer } from "@shopblok/registry/contracts";
import type {
  CompareTray,
  FilterPanel,
  ProductCarousel,
  ProductGrid,
  SearchOverlay,
} from "@shopblok/registry/contracts";
import type {
  BuyBox,
  MobileStickyATC,
  ProductGallery,
  ProductInfo,
  ReviewsSection,
  SizeGuide,
} from "@shopblok/registry/contracts";
import type {
  AccountNav,
  AddressBook,
  CartDrawer,
  CheckoutSteps,
  OrderSummary,
  OrderTable,
  OrderTimeline,
  PaymentMethodsManager,
  PaymentStep,
  QuickCart,
  ReturnRequest,
} from "@shopblok/registry/contracts";

/** A section of a FAQ: the contract's heading and id, and the answer in paragraphs. */
export type FaqItem = AccordionSection & { answer: string[] };

/** A toast and the words of the button that shows it. */
export type ToastSample = { trigger: string; message: ToastMessage };
import type { Countdown, DiscountCode, NewsletterSignup } from "@shopblok/registry/contracts";
import type { FreeShipping, PromoCodeEntry } from "@shopblok/registry/contracts";
import type {
  AnnouncementBar,
  Header,
  Image,
  MarketSuggestion,
  MobileNav,
} from "@shopblok/registry/contracts";
import type {
  ShippingEstimate,
  StepperState,
  SummaryLine,
  VerificationRequest,
} from "@shopblok/registry/contracts";

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
  /** The sample data of AddressForm and AddressCard beyond the address book (T34). */
  addressSamples: {
    /** The seeded markets the address book leaves out: the United Kingdom and France. */
    gb: Address;
    fr: Address;
    /** Japan, which no market seeds: a country added in settings (Principle 10). */
    jp: Address;
    /** A country Google's format data does not list (`ic`): the generic form. */
    generic: Address;
    /** A US form with a state missing and a four-digit ZIP code: what a failed submit hands back. */
    mistaken: AddressFormState["values"];
  };
  /** Two orders: one delivered (its whole history), one placed and paid. */
  orders: Order[];
  reviews: Review[];
  ratingSummary: RatingSummary;
  /** The header's items: links, a dropdown and a mega menu. */
  navigation: NavItem[];
  /** The sample data of the five footers (T36). */
  footer: {
    /** What every footer variant draws: three columns, the newsletter, five profiles, four legal links, the checkout's eight marks, the markets. */
    content: Footer;
    /** The least a shop can have: no columns, newsletter, profiles, marks or switcher; two legal links and the copyright. */
    bare: Footer;
  };
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
  /** The sample data of the header and its organisms (T35). */
  header: {
    /** What every header variant draws: the navigation, every utility, the markets, three messages in turn. */
    content: Header;
    /** The visitor's cart count the DS feeds the browser's store (D44): the cart's own. */
    cartCount: number;
    /** The announcement bar with one message, with three in turn, and with one at the length that breaks a layout. */
    announcements: { single: AnnouncementBar; rotating: AnnouncementBar; long: AnnouncementBar };
    /** Another seeded market suggested to a visitor of this one, with the copy's words or the shop's own. */
    suggestions: { copy: MarketSuggestion; message: MarketSuggestion };
    /** The mobile drawer's levels and its foot: the navigation, the account's links, the markets. */
    mobileNav: MobileNav;
    /** The picture the transparent header sits on. */
    hero: Image;
  };
  figure: MediaFigure;
  /** EmptyState's samples (T33): filters that match nothing, a search with no result, an empty category. */
  emptyStates: {
    /** With a way out: the listing without its filters. */
    filters: EmptyStateContent;
    search: EmptyStateContent;
    /** With no action: there is nothing to do but wait. */
    category: EmptyStateContent;
  };
  /**
   * The listing organisms' samples (T37). SearchOverlay before the first query (the recent queries
   * alone), with the results of `search`, while the next query loads (the last results kept), and for
   * a query that finds nothing; the filters as one form (the facets, the chips); a grid of the twelve
   * cards and one with none; the carousel of new products; the compare tray with one product (too
   * few), three, and four (full). ProductToolbar's sort is built by its story from the catalog's
   * words, as SortSelect's is.
   */
  listing: {
    search: {
      idle: SearchOverlay;
      results: SearchOverlay;
      loading: SearchOverlay;
      empty: SearchOverlay;
    };
    filters: FilterPanel;
    grid: { products: ProductGrid; empty: ProductGrid };
    carousel: ProductCarousel;
    compare: { one: CompareTray; three: CompareTray; full: CompareTray };
  };
  /**
   * The product page organisms' samples (T38), all of the Heritage Hoodie (`product`). The gallery
   * with nothing chosen, with a colour chosen (forest: its picture is the main one), and with one
   * picture; the buy box with nothing chosen, a colour only, black in M (in stock), forest in M (three
   * left, so three at most) and black in XL (sold out); the sticky bar ready, with an option missing
   * and sold out; the information's four sections; the first page of the 128 reviews, and none; the
   * size guide, in inches first in the US.
   */
  productPage: {
    gallery: { all: ProductGallery; chosen: ProductGallery; single: ProductGallery };
    buyBox: { empty: BuyBox; partial: BuyBox; ready: BuyBox; low: BuyBox; soldOut: BuyBox };
    sticky: { ready: MobileStickyATC; incomplete: MobileStickyATC; soldOut: MobileStickyATC };
    info: ProductInfo;
    reviews: { first: ReviewsSection; none: ReviewsSection };
    sizeGuide: SizeGuide;
  };
  /**
   * The cart and checkout organisms' samples (T39). The cart drawer with the cart and empty; the
   * dropdown after the cart's first line was added; the order summary of the cart (shipping still to
   * choose) and of the delivered order; the three checkout steps, the review with the standard
   * delivery in its summary; the payment step for a customer with the three saved cards (the default
   * chosen), for a guest, and with no provider at all (the system payment).
   */
  cartCheckout: {
    drawer: { full: CartDrawer; empty: CartDrawer };
    quickCart: QuickCart;
    summary: { cart: OrderSummary; order: OrderSummary };
    checkout: { contact: CheckoutSteps; delivery: CheckoutSteps; review: CheckoutSteps };
    payment: { saved: PaymentStep; guest: PaymentStep; system: PaymentStep };
  };
  /**
   * The account organisms' samples (T39). The account's six pages, on the orders; the history of the
   * delivered order and of the one only paid; the two orders newest first, and none; the address book
   * and the saved cards, full and empty; the return form of the delivered order, blank and with one
   * tee, a reason and a note.
   */
  account: {
    nav: AccountNav;
    timeline: { delivered: OrderTimeline; placed: OrderTimeline };
    orders: { list: OrderTable; empty: OrderTable };
    addressBook: { full: AddressBook; empty: AddressBook };
    paymentMethods: { cards: PaymentMethodsManager; empty: PaymentMethodsManager };
    returnRequest: { blank: ReturnRequest; filled: ReturnRequest };
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
  /** The sample data of AccordionItem and Toast (T33), and CookieConsent (T36). */
  site: {
    faq: {
      /** Five questions, with an id each section of an accordion can have. */
      items: FaqItem[];
      /** One at the length that breaks a layout: a long question, long answers. */
      long: FaqItem;
    };
    /** One toast of each kind, and a long one, each with the words of the button that shows it. */
    toasts: { success: ToastSample; error: ToastSample; info: ToastSample; long: ToastSample };
    /** CookieConsent's (T36): the banner with the copy's sentence or the shop's own, and three choices a visitor can make. */
    cookieConsent: {
      copy: CookieConsent;
      message: CookieConsent;
      choices: { rejected: ConsentChoice; analytics: ConsentChoice; accepted: ConsentChoice };
    };
  };
  /** The sample data of CartLineItem, FreeShippingProgress and PromoCodeField (T34). */
  cartSamples: {
    /** The cart's own lines are the regular, sale and low-stock cases; these are the other states. */
    lines: {
      /** Cannot be bought: the quantity cannot change, the line can be removed. */
      outOfStock: CartLine;
      /** The quantity is the most the stock allows. */
      atLimit: CartLine;
      /** A product with no picture. */
      noImage: CartLine;
      /** A product with no options (one variant). */
      noOptions: CartLine;
    };
    /** From nothing in the cart to the threshold reached, and an amount of seven digits. */
    freeShipping: {
      empty: FreeShipping;
      almost: FreeShipping;
      reached: FreeShipping;
      large: FreeShipping;
    };
    /** The promotion field: empty, a code applied, a code typed, two applied, and the longest. */
    promo: {
      empty: PromoCodeEntry;
      applied: PromoCodeEntry;
      typed: PromoCodeEntry;
      two: PromoCodeEntry;
      /** A code of 40 characters with nowhere to break, applied and typed. */
      long: PromoCodeEntry;
    };
  };
  /** The sample data of SavedPaymentMethodCard and PaymentMethodCard (T34): the states the account's own are not. */
  paymentSamples: {
    /** Expired the month before `fixtureNow`. */
    expiredCard: SavedPaymentMethod;
    /** Expires in `fixtureNow`'s month: a card works through its last day. */
    expiringCard: SavedPaymentMethod;
    /** The longest holder's name, on the default card. */
    longHolderCard: SavedPaymentMethod;
    /** No holder's name. */
    anonymousCard: SavedPaymentMethod;
    /** A method whose name is the length that breaks a layout, with three marks. */
    longMethod: PaymentMethod;
  };
  /** The sample data of OrderSummaryRow, Stepper, ShippingEstimator and VerificationNotice (T34). */
  checkoutFlow: {
    /** The rows of a summary from the cart's totals, and the states a row can be in. */
    summary: {
      subtotal: SummaryLine;
      /** The amount taken off, with the cart's promotion code beside it. */
      discount: SummaryLine;
      /** No amount yet: shipping before an option is chosen. */
      shippingPending: SummaryLine;
      /** The standard delivery's price. */
      shippingPaid: SummaryLine;
      shippingFree: SummaryLine;
      /** The tax the price includes; with no amount where the market adds it at checkout (US). */
      tax: SummaryLine;
      total: SummaryLine;
      /** A discount whose code is 40 characters with nowhere to break. */
      longDetail: SummaryLine;
      /** A total of seven digits before the decimals. */
      large: SummaryLine;
    };
    /** Steps of a flow at each place the reader can be; only the steps already done have an `href`. */
    steps: {
      /** Checkout's three steps (SPEC §8.4), on the first, the second and the third. */
      contact: StepperState;
      delivery: StepperState;
      review: StepperState;
      /** The cart, contact, delivery, payment and review, on the payment. */
      five: StepperState;
      /** Four steps at the length that breaks a layout, on the third. */
      long: StepperState;
    };
    /** The estimator before it is sent, with one country, answered, with nothing to offer, and so on. */
    estimator: {
      empty: ShippingEstimate;
      /** A region of one country: nothing to choose. */
      single: ShippingEstimate;
      /** The market's country and address, with every shipping option (one of them not available). */
      answered: ShippingEstimate;
      /** A country the shop does not deliver to: an answer with no option. */
      none: ShippingEstimate;
      /** A postal code the country's format refuses, as the server hands it back. */
      mistaken: ShippingEstimate;
      /** An option named at the length that breaks a layout, and the pickup. */
      long: ShippingEstimate;
    };
    /** The address a link was sent to: with a wait running, with none, and a very long address. */
    verification: {
      waiting: VerificationRequest;
      ready: VerificationRequest;
      long: VerificationRequest;
    };
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
