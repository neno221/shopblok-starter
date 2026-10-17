import type {
  Address,
  Announcement,
  Cart,
  CartLine,
  Category,
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
  announcement: Announcement;
  figure: MediaFigure;
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
