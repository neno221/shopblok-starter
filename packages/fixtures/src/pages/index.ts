import type {
  AccountPage,
  AuthPage,
  CartPage,
  CheckoutPage,
  CmsPage,
  ErrorPage,
  HomePage,
  ListingResults,
  NotFoundPage,
  OrderConfirmationPage,
  OrderLookupPage,
  ProductDetailPage,
  ProductListingPage,
  QueryParam,
  SearchResultsPage,
  SortState,
} from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { orderSummary } from "../commerce/build/cart-checkout-account";
import { copies } from "../commerce/copy";
import { fixtureImage } from "../commerce/images";
import type { DesignSystemLocale } from "../design-system";

// The templates' page-level fixtures (D56, T48): what each template shows between the header and
// the footer, in each DS locale. The DS draws a template inside the classic header and the
// multi-column footer of the commerce fixtures (`commerceFixtures[locale].header`, `.footer`), so the
// links are that market's own.

export type PageFixtures = {
  /** A 404 with the home page and the search page as the ways on. */
  notFound: NotFoundPage;
  /** A 500: the home page (the retry is the page's). */
  error: ErrorPage;
  /**
   * The Heritage Hoodie's page (T49): its gallery and its buy box with nothing chosen (the default a
   * shop's server renders), the sticky bar asking for options, its information, the first page of
   * its reviews, and the listing carousel's other products as the related ones.
   */
  productDetail: ProductDetailPage;
  /**
   * The hoodie's category (T50): the first of its two pages, newest first, with the listing
   * organisms' twelve cards and filters (two chosen), and the same page with no product.
   */
  productListing: ProductListingPage;
  /**
   * The same page with the shop's own content on its category (T69, D83): an editor's banner, and
   * the words of the introduction a story draws as the template's `slots.intro` (rich text is the
   * storefront's, not a contract).
   */
  productListingContent: { page: ProductListingPage; intro: string };
  /** The search page for `search.query` (T50): the same results, by relevance, the query kept. */
  searchResults: SearchResultsPage;
  /**
   * The home (T51): the hero, the catalog's top-level categories with a picture each, the listing
   * carousel's products as the new arrivals, and the link to every product.
   */
  home: HomePage;
  /** The cart page (T52): the commerce cart with its code, and the same with no line. */
  cart: { full: CartPage; empty: CartPage };
  /**
   * The checkout's three steps (T52): the contact step with the placed order's address typed, the
   * delivery step with every shipping option and the system payment (nothing chosen yet), and the
   * review of the standard delivery to that address.
   */
  checkout: { contact: CheckoutPage; delivery: CheckoutPage; review: CheckoutPage };
  /** The receipt (T52): the order placed and paid, with its summary. */
  orderConfirmation: OrderConfirmationPage;
  /**
   * The sign-in and registration pages (T53): sign in (blank, and after the e-mail's link), the
   * registration, the e-mail to check, the reset link asked for and sent, the new password, and a
   * link that no longer works.
   */
  auth: {
    login: AuthPage;
    verified: AuthPage;
    register: AuthPage;
    checkEmail: AuthPage;
    forgot: AuthPage;
    forgotSent: AuthPage;
    reset: AuthPage;
    linkExpired: AuthPage;
  };
  /**
   * The account (T53), one page per screen: the overview with the two orders, the orders, the
   * placed order, the address book, an address to change, the payment methods (none until M6),
   * the returns, the delivered order's return form, and the profile.
   */
  account: {
    overview: AccountPage;
    orders: AccountPage;
    order: AccountPage;
    addresses: AccountPage;
    address: AccountPage;
    paymentMethods: AccountPage;
    returns: AccountPage;
    return: AccountPage;
    profile: AccountPage;
  };
  /** The guest-order claim (T53): the form, a claim sent, the sign-in, the link's page, accepted. */
  orderLookup: {
    lookup: OrderLookupPage;
    sent: OrderLookupPage;
    signIn: OrderLookupPage;
    transfer: OrderLookupPage;
    accepted: OrderLookupPage;
  };
  /**
   * A CMS page under a parent (T65): "Our team" under "About us", with its breadcrumbs and its
   * title as the heading; the DS draws sections under it.
   */
  cmsPage: CmsPage;
};

/** The sort as a listing offers it: newest, then by price; a search puts relevance first. */
function sortState(
  action: string,
  labels: { relevance: string; newest: string; priceAsc: string; priceDesc: string },
  selected: "relevance" | "newest",
  params: QueryParam[],
): SortState {
  const byPrice = [
    { value: "price-asc", label: labels.priceAsc },
    { value: "price-desc", label: labels.priceDesc },
  ];
  const newest = { value: "newest", label: labels.newest };
  return {
    action,
    name: "sort",
    options:
      selected === "relevance"
        ? [{ value: "relevance", label: labels.relevance }, newest, ...byPrice]
        : [newest, ...byPrice],
    selected,
    params,
  };
}

function pagesFor(locale: DesignSystemLocale): PageFixtures {
  const fixtures = commerceFixtures[locale];
  const { header, product, productPage, listing, categories } = fixtures;
  const related = listing.carousel.products.filter((card) => card.id !== product.id);
  const copy = copies[locale];
  const searchHref = listing.search.idle.search.action;
  // The hoodie's own category is the listing: its trail up to it, and its name.
  const category = product.breadcrumbs.at(-1) ?? { label: product.title, href: product.href };
  const trail = product.breadcrumbs.slice(0, -1);
  // The filter form lands on the search page with the listing named (D59), as the shop's does.
  const scope = { name: "scope", value: "category:hoodies" };
  const results = (selected: "relevance" | "newest", params: QueryParam[]): ListingResults => ({
    toolbar: {
      count: listing.filters.resultCount,
      sort: sortState(searchHref, copy.listingPage.sort, selected, params),
    },
    filters: { ...listing.filters, action: searchHref, params },
    grid: listing.grid.products,
    page: { page: 1, pageCount: 2 },
  });
  const query = listing.search.results.search.query;
  const home = header.content.homeHref.replace(/\/$/, "");
  const storeHref = `${home}/store`;
  const { cartCheckout, orders, shippingOptions, checkoutFlow } = fixtures;
  const placed = orders[1];
  const standard = shippingOptions.find((option) => option.id === "so_standard");
  if (placed === undefined || standard === undefined)
    throw new Error("the placed order or the standard delivery is missing");
  const {
    id: _id,
    isDefaultBilling: _billing,
    isDefaultShipping: _shipping,
    ...typed
  } = placed.shippingAddress;
  const contactHref = `${home}/checkout/contact`;
  const loginHref = `${home}/login`;
  const lookupHref = `${home}/order/lookup`;
  const login = (
    fields: Partial<Extract<AuthPage["screen"], { kind: "login" }>>,
  ): AuthPage["screen"] => ({
    kind: "login",
    email: "",
    registerHref: `${home}/register`,
    forgotHref: `${home}/forgot-password`,
    ...fields,
  });
  const accountParts = fixtures.account;
  const account = (
    current: AccountPage["nav"]["current"],
    screen: AccountPage["screen"],
  ): AccountPage => ({ variant: "default", nav: { ...accountParts.nav, current }, screen });
  const bookAddress = accountParts.addressBook.full.entries[0]?.address;
  if (bookAddress === undefined) throw new Error("the address book is empty");
  const deliveryHref = `${home}/checkout/delivery`;
  return {
    notFound: {
      homeHref: header.content.homeHref,
      ...(header.content.utilities.search === undefined
        ? {}
        : { searchHref: header.content.utilities.search }),
    },
    error: { homeHref: header.content.homeHref },
    productDetail: {
      variant: "default",
      breadcrumbs: { trail: product.breadcrumbs, current: product.title },
      gallery: productPage.gallery.all,
      buyBox: productPage.buyBox.empty,
      sticky: productPage.sticky.incomplete,
      info: productPage.info,
      reviews: productPage.reviews.first,
      related: {
        title: copies[locale].productPage.related,
        products: related,
        variant: "standard",
      },
    },
    productListing: {
      variant: "default",
      breadcrumbs: { trail: trail.length > 0 ? trail : [category], current: category.label },
      title: category.label,
      results: results("newest", [scope]),
    },
    productListingContent: {
      page: {
        variant: "default",
        breadcrumbs: { trail: trail.length > 0 ? trail : [category], current: category.label },
        title: category.label,
        // The editor's alternative text (the media's): the banner is a picture, not decoration.
        banner: fixtureImage({ seed: 44, ratio: "3:1", alt: category.label }),
        results: results("newest", [scope]),
      },
      intro: copy.listingPage.intro,
    },
    searchResults: {
      variant: "default",
      search: { action: searchHref, query },
      title: copy.listingPage.resultsFor,
      results: results("relevance", [{ name: "q", value: query }]),
    },
    home: {
      variant: "default",
      hero: {
        title: copy.homePage.hero.title,
        text: copy.homePage.hero.text,
        image: fixtureImage({ seed: 21, ratio: "16:9", alt: "" }),
        action: { label: copy.homePage.hero.action, href: storeHref },
      },
      categories: {
        title: copy.homePage.categories,
        items: categories.slice(0, 8).map((category, index) => ({
          label: category.title,
          href: category.href,
          // Decorative: the tile's name says where it goes.
          image: fixtureImage({ seed: 30 + index, ratio: "3:4", alt: "" }),
        })),
      },
      newArrivals: {
        title: copy.homePage.newArrivals,
        products: listing.carousel.products,
        variant: "standard",
        viewAll: { label: copy.homePage.seeAllNew, href: storeHref },
      },
      shopAll: { label: copy.homePage.shopAll, href: storeHref },
    },
    cart: {
      full: {
        variant: "default",
        cart: cartCheckout.drawer.full.cart,
        promoCode: "",
        checkoutHref: contactHref,
        continueHref: storeHref,
      },
      empty: {
        variant: "default",
        cart: cartCheckout.drawer.empty.cart,
        promoCode: "",
        checkoutHref: contactHref,
        continueHref: storeHref,
      },
    },
    checkout: {
      contact: {
        variant: "default",
        checkout: cartCheckout.checkout.contact,
        step: {
          kind: "contact",
          email: placed.email,
          address: { countries: checkoutFlow.estimator.answered.countries, values: typed },
        },
      },
      delivery: {
        variant: "default",
        checkout: cartCheckout.checkout.delivery,
        step: {
          kind: "delivery",
          options: shippingOptions,
          payment: cartCheckout.payment.system,
          addressHref: contactHref,
        },
      },
      review: {
        variant: "default",
        checkout: cartCheckout.checkout.review,
        step: {
          kind: "review",
          email: placed.email,
          shippingAddress: placed.shippingAddress,
          shippingMethod: { name: standard.name, price: standard.price },
          payment: placed.payment,
          editHrefs: { contact: contactHref, delivery: deliveryHref },
        },
      },
    },
    orderConfirmation: {
      variant: "default",
      order: placed,
      summary: orderSummary(placed),
      continueHref: storeHref,
    },
    auth: {
      login: { variant: "default", screen: login({ email: "" }) },
      verified: { variant: "default", screen: login({ email: placed.email, notice: "verified" }) },
      register: {
        variant: "default",
        screen: {
          kind: "register",
          values: { email: "", firstName: "", lastName: "", phone: "" },
          loginHref,
        },
      },
      checkEmail: {
        variant: "default",
        screen: {
          kind: "check-email",
          verification: checkoutFlow.verification.waiting,
          loginHref,
        },
      },
      forgot: { variant: "default", screen: { kind: "forgot", email: "", sent: false, loginHref } },
      forgotSent: {
        variant: "default",
        screen: { kind: "forgot", email: placed.email, sent: true, loginHref },
      },
      reset: {
        variant: "default",
        screen: { kind: "reset", email: placed.email, token: "reset-token", loginHref },
      },
      linkExpired: {
        variant: "default",
        screen: { kind: "link-expired", link: "verify", restartHref: loginHref },
      },
    },
    account: {
      overview: account("overview", {
        kind: "overview",
        firstName: placed.shippingAddress.firstName,
        email: placed.email,
        recent: accountParts.orders.list,
        ordersHref: `${home}/account/orders`,
        addressesHref: `${home}/account/addresses`,
        profileHref: `${home}/account/profile`,
        lookupHref,
      }),
      orders: account("orders", {
        kind: "orders",
        table: accountParts.orders.list,
        page: { page: 1, pageCount: 1 },
        pageHref: `${home}/account/orders`,
        lookupHref,
      }),
      order: account("orders", {
        kind: "order",
        order: placed,
        summary: orderSummary(placed),
        backHref: `${home}/account/orders`,
        returnHref: `${home}/account/returns/${placed.id}`,
      }),
      addresses: account("addresses", { kind: "addresses", book: accountParts.addressBook.full }),
      address: account("addresses", {
        kind: "address",
        addressId: bookAddress.id,
        address: {
          countries: checkoutFlow.estimator.answered.countries,
          values: bookAddress,
        },
        isDefaultShipping: bookAddress.isDefaultShipping === true,
        backHref: `${home}/account/addresses`,
      }),
      paymentMethods: account("payment-methods", {
        kind: "payment-methods",
        wallet: { cards: [] },
      }),
      returns: account("returns", {
        kind: "returns",
        table: {
          ...accountParts.orders.list,
          orders: accountParts.orders.list.orders
            .filter((order) => order.id === accountParts.returnRequest.blank.orderId)
            .map((order) => ({ ...order, href: `${home}/account/returns/${order.id}` })),
        },
      }),
      return: account("returns", {
        kind: "return",
        request: accountParts.returnRequest.filled,
        sent: false,
        backHref: `${home}/account/returns`,
      }),
      profile: account("profile", {
        kind: "profile",
        email: placed.email,
        values: {
          firstName: placed.shippingAddress.firstName,
          lastName: placed.shippingAddress.lastName,
          phone: placed.shippingAddress.phone ?? "",
        },
        saved: false,
      }),
    },
    orderLookup: {
      lookup: {
        variant: "default",
        screen: {
          kind: "lookup",
          values: { number: "", email: "" },
          sent: false,
          accountHref: `${home}/account`,
        },
      },
      sent: {
        variant: "default",
        screen: {
          kind: "lookup",
          values: { number: String(placed.displayId), email: placed.email },
          sent: true,
          accountHref: `${home}/account`,
        },
      },
      signIn: {
        variant: "default",
        screen: { kind: "sign-in", loginHref, registerHref: `${home}/register` },
      },
      transfer: { variant: "default", screen: { kind: "transfer", displayId: placed.displayId } },
      accepted: {
        variant: "default",
        screen: { kind: "transfer-done", outcome: "accepted", homeHref: storeHref },
      },
    },
    cmsPage: {
      title: copy.cmsPage.title,
      breadcrumbs: {
        trail: [
          { label: copy.home, href: header.content.homeHref },
          { label: copy.cmsPage.parent, href: `${home}/about` },
        ],
        current: copy.cmsPage.title,
      },
      heading: "title",
    },
  };
}

/** Each DS locale's page fixtures. */
export const pageFixtures: Record<DesignSystemLocale, PageFixtures> = {
  en: pagesFor("en"),
  el: pagesFor("el"),
  de: pagesFor("de"),
  fr: pagesFor("fr"),
};
