import type { DesignSystemLocale } from "../../design-system";
import { createContext } from "../context";
import type { Copy } from "../copy";
import type { CommerceFixture } from "../types";
import { buildActiveFilters } from "./active-filters";
import { buildAddressSamples } from "./address-samples";
import { buildAccount, buildCartCheckout } from "./cart-checkout-account";
import { buildCartSamples } from "./cart-samples";
import {
  buildCategories,
  buildFacets,
  buildProduct,
  buildProducts,
  buildRatingSummary,
  buildReviews,
  buildSearch,
} from "./catalog";
import {
  buildAddresses,
  buildCart,
  buildOrders,
  buildPaymentMethods,
  buildSavedPaymentMethods,
  buildShippingOptions,
} from "./checkout";
import { buildCheckoutFlow } from "./checkout-flow";
import {
  buildAnnouncement,
  buildFigure,
  buildLong,
  buildMarkets,
  buildNavigation,
} from "./content";
import { buildFooter } from "./footer";
import { buildHeader } from "./header";
import { buildEmptyStates } from "./listing";
import { buildListingOrganisms } from "./listing-organisms";
import { buildMarketing } from "./marketing";
import { buildPaymentSamples } from "./payment-samples";
import { buildProductPage } from "./product-page";
import { buildSite } from "./site";

/**
 * One locale's fixtures: the shared data (data/) in the locale's words (copy/), its DS market's
 * currency, and every link under its prefix. The four locales are made by this one function, so
 * what they share (ids, handles, image seeds, stock, prices per currency) cannot drift apart.
 */
export function buildCommerceFixture(locale: DesignSystemLocale, copy: Copy): CommerceFixture {
  const ctx = createContext(locale, copy);
  const products = buildProducts(ctx);
  const facets = buildFacets(ctx);
  const addresses = buildAddresses(ctx);
  const navigation = buildNavigation(ctx);
  const markets = buildMarkets(ctx);
  const cart = buildCart(ctx);
  const paymentMethods = buildPaymentMethods(ctx);
  const search = buildSearch(ctx, products);
  const activeFilters = buildActiveFilters(ctx, facets);
  const emptyStates = buildEmptyStates(ctx);
  const product = buildProduct(ctx);
  const reviews = buildReviews(ctx);
  const ratingSummary = buildRatingSummary();
  const orders = buildOrders(ctx, addresses);
  const savedPaymentMethods = buildSavedPaymentMethods(ctx);
  const shippingOptions = buildShippingOptions(ctx);
  const checkoutFlow = buildCheckoutFlow(ctx);
  return {
    locale,
    market: { ...ctx.market },
    prefix: ctx.prefix,
    products,
    product,
    categories: buildCategories(ctx),
    cart,
    addresses,
    addressSamples: buildAddressSamples(),
    orders,
    reviews,
    ratingSummary,
    navigation,
    footer: buildFooter(ctx, markets, paymentMethods),
    markets,
    paymentMethods,
    savedPaymentMethods,
    shippingOptions,
    search,
    facets,
    // The chips come from the same facets as the sidebar, so the two cannot drift.
    activeFilters,
    announcement: buildAnnouncement(ctx),
    header: buildHeader(ctx, navigation, markets, cart.itemCount),
    figure: buildFigure(ctx),
    emptyStates,
    listing: buildListingOrganisms(
      ctx,
      products,
      search,
      facets,
      activeFilters,
      emptyStates.filters,
    ),
    productPage: buildProductPage(ctx, product, reviews, ratingSummary),
    marketing: buildMarketing(ctx),
    site: buildSite(ctx),
    paymentSamples: buildPaymentSamples(ctx),
    cartSamples: buildCartSamples(ctx, cart),
    checkoutFlow,
    cartCheckout: buildCartCheckout(
      ctx,
      cart,
      checkoutFlow.steps,
      shippingOptions,
      paymentMethods,
      savedPaymentMethods,
      orders,
    ),
    account: buildAccount(ctx, orders, addresses, savedPaymentMethods),
    long: buildLong(ctx),
  };
}
