import type { DesignSystemLocale } from "../../design-system";
import { createContext } from "../context";
import type { Copy } from "../copy";
import type { CommerceFixture } from "../types";
import { buildActiveFilters } from "./active-filters";
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
import {
  buildAnnouncement,
  buildFigure,
  buildFooter,
  buildLong,
  buildMarkets,
  buildNavigation,
} from "./content";
import { buildEmptyStates } from "./listing";
import { buildMarketing } from "./marketing";
import { buildSite } from "./site";

/**
 * One locale's fixtures: the shared data (data/) in the locale's words (copy/), its DS market's
 * currency, and every link under its prefix. The four locales are made by this one function, so
 * what they share (ids, handles, image seeds, stock, prices per currency) cannot drift apart.
 */
export function buildCommerceFixture(locale: DesignSystemLocale, copy: Copy): CommerceFixture {
  const ctx = createContext(locale, copy);
  const products = buildProducts(ctx);
  const addresses = buildAddresses(ctx);
  return {
    locale,
    market: { ...ctx.market },
    prefix: ctx.prefix,
    products,
    product: buildProduct(ctx),
    categories: buildCategories(ctx),
    cart: buildCart(ctx),
    addresses,
    orders: buildOrders(ctx, addresses),
    reviews: buildReviews(ctx),
    ratingSummary: buildRatingSummary(),
    navigation: buildNavigation(ctx),
    footer: buildFooter(ctx),
    markets: buildMarkets(ctx),
    paymentMethods: buildPaymentMethods(ctx),
    savedPaymentMethods: buildSavedPaymentMethods(ctx),
    shippingOptions: buildShippingOptions(ctx),
    search: buildSearch(ctx, products),
    facets: buildFacets(ctx),
    activeFilters: buildActiveFilters(ctx, buildFacets(ctx)),
    announcement: buildAnnouncement(ctx),
    figure: buildFigure(ctx),
    emptyStates: buildEmptyStates(ctx),
    marketing: buildMarketing(ctx),
    site: buildSite(ctx),
    long: buildLong(ctx),
  };
}
