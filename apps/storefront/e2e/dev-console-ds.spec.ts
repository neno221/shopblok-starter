import { checkRoutesInDev } from "./support/dev-console";

// T27 (M2 plan, D53): the DS pages in `next dev`, judged as `dev-console.spec.ts` judges the
// storefront's routes (support/dev-console.ts). They need no stack, so the design-system job runs
// this after its checks, against `next dev -p 8000`; the project exists only when
// E2E_DEV_CONSOLE=true (playwright.config.ts). Locally: SETUP.md, "CI for M2 (T27)".
//
// T25 step 1 asked for one atom page in each of the four locales: Select is the atom page with the
// most client code (Base UI's list box, its portal and positioning), added by T21. The Foundations
// page and the frame stay as T25 left them.
const locales = ["en", "el", "de", "fr"] as const;

checkRoutesInDev([
  { path: "/design-system/en", status: 200 },
  ...locales.map((locale) => ({
    path: `/design-system/${locale}/foundations/typography`,
    status: 200,
  })),
  ...locales.map((locale) => ({ path: `/design-system/${locale}/atoms/select`, status: 200 })),
  { path: "/design-system/el/frame/foundations/colors", status: 200 },
  // T29 (D52): the preview, the live render alone, which T40 captures as a thumbnail.
  { path: "/design-system/el/preview/atoms/select", status: 200 },
  // T31 (D45): a sheet and a popover drawn open on first render, each portalled into its box.
  { path: "/design-system/en/checks/overlay-box", status: 200 },
  // T32: one molecule page in each locale: VariantSelector, the product molecule with the most
  // client code (Base UI's radio groups around Swatch and SizePill).
  ...locales.map((locale) => ({
    path: `/design-system/${locale}/molecules/variant-selector`,
    status: 200,
  })),
  // T33: MarketSwitcher in each locale (a client component that takes the server's flags, D49, and
  // draws a popover and a drawer open in their boxes), and FilterGroup's price range in one.
  ...locales.map((locale) => ({
    path: `/design-system/${locale}/molecules/market-switcher`,
    status: 200,
  })),
  { path: "/design-system/de/molecules/filter-group", status: 200 },
  // T34: AddressForm in each locale (its client part swaps the fields when the country changes),
  // and one page each for the other client parts: the cart line's quantity, the saved card's
  // confirmation dialog, and the verification notice's cooldown clock.
  ...locales.map((locale) => ({
    path: `/design-system/${locale}/molecules/address-form`,
    status: 200,
  })),
  { path: "/design-system/el/molecules/cart-line-item", status: 200 },
  { path: "/design-system/fr/molecules/saved-payment-method-card", status: 200 },
  { path: "/design-system/de/molecules/verification-notice", status: 200 },
]);
