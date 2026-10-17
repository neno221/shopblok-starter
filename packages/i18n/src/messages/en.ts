// The English catalog (D43): it defines every key, and `Messages` is its shape, so the other three
// catalogs are type-checked against it. Messages are ICU MessageFormat (`{count, plural, one {# item}
// other {# items}}`), the syntax next-intl (M3) and Payload's `ui-strings` (M4) read; format one with
// `formatMessage`. A component takes its strings as props (D30), from `molecules.cartLineItem` and
// the like; `messages.test.ts` checks that every locale has every key with English's arguments.

export const en = {
  wiring: {
    title: "Shopblok wiring check",
    market: "Market",
    language: "Language",
    currency: "Currency",
    products: "Products",
    pages: "Payload pages",
    backendUnavailable: "The Medusa backend is not reachable.",
    backendHint: "Start the backend with pnpm dev and reload; the server log has the details.",
    region: "Region",
    noRegion: "Medusa has no region for this market's country, so there are no prices to show.",
    priceCurrencies: "Price filter currencies",
    noProducts: "This region has no products.",
  },
  atoms: {
    spinner: { loading: "Loading" },
    chip: { remove: "Remove" },
    link: { newTab: "Opens in a new tab" },
    price: { sale: "Sale price", original: "Original price" },
    rating: { label: "{value} out of {max}" },
    quantityStepper: {
      label: "Quantity",
      decrease: "Decrease quantity",
      increase: "Increase quantity",
    },
    stock: {
      inStock: "In stock",
      low: "{count, plural, other {Only # left}}",
      outOfStock: "Out of stock",
    },
    variant: { unavailable: "Unavailable" },
    payment: {
      visa: "Visa",
      mastercard: "Mastercard",
      americanexpress: "American Express",
      applepay: "Apple Pay",
      googlepay: "Google Pay",
      revolut: "Revolut",
      paypal: "PayPal",
      klarna: "Klarna",
    },
  },
  // What the root layouts' Providers draw (D47): the toasts' region and their close button.
  primitives: { toast: { region: "Notifications", close: "Close notification" } },
  // Filled by M2's component tasks (T32 to T39), each with its components' strings.
  molecules: {
    variantSelector: {
      chosen: "{option}: {value}",
      unavailable: "Unavailable",
    },
    ratingSummary: {
      rating: "{value} out of {max}",
      count:
        "{count, plural, =0 {No reviews yet} one {Based on # review} other {Based on # reviews}}",
      distribution: "Ratings by number of stars",
      row: "{stars, plural, one {# star} other {# stars}}, {count, plural, one {# review} other {# reviews}}",
    },
    reviewItem: {
      rating: "Rated {value} out of {max}",
      verified: "Verified purchase",
    },
    mediaFigure: {
      credit: "Photo: {credit}",
    },
    priceBlock: {
      sale: "Sale price",
      original: "Original price",
      from: "From {price}",
      taxIncluded: "Tax included",
      taxExcluded: "Tax excluded",
    },
    productCard: {
      soldOut: "Sold out",
      badges: { sale: "Sale", new: "New", bestseller: "Bestseller" },
      rating: "{average} out of 5, {count, plural, one {# review} other {# reviews}}",
      ratingCount: "({count, number})",
      swatches: "Colors",
      swatchUnavailable: "Unavailable",
      swatchesMore: "{count, plural, one {# more color} other {# more colors}}",
      moreCount: "+{count, number}",
      quickAdd: {
        add: "Add to cart",
        chooseOptions: "Choose options",
        adding: "Adding to cart…",
        added: "Added to cart",
        error: "Could not add to cart. Please try again.",
        forProduct: ", {title}",
      },
    },
  },
  organisms: {},
  notFound: {
    title: "Page not found",
    body: "The page you are looking for does not exist.",
    home: "Back to the home page",
  },
};

/** The shape every catalog has: English's. */
export type Messages = typeof en;
