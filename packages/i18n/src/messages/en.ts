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
    // T33: discovery and the site-wide molecules (each filled by the task's component).
    searchField: {
      // The field's name and its landmark's, and the same words as its placeholder.
      label: "Search products",
      placeholder: "Search products",
      submit: "Search",
      clear: "Clear search",
    },
    breadcrumbs: {
      label: "Breadcrumb",
      // Read out where the middle of a long trail is left out on a narrow screen.
      more: "Levels in between",
    },
    pagination: {
      label: "Pagination",
      previous: "Previous",
      next: "Next",
      more: "More pages",
      // A page link's name, and the current page's (which also says how many there are).
      page: "Page {page, number}",
      current: "Page {page, number} of {pageCount, number}",
    },
    sortSelect: {
      label: "Sort by",
      apply: "Apply",
      // The words of the sort options. The component does not read them: a listing's resolver
      // builds `SortState.options` from them (the contract holds each option's label).
      options: {
        relevance: "Relevance",
        newest: "Newest",
        priceAsc: "Price: low to high",
        priceDesc: "Price: high to low",
      },
    },
    filterGroup: {
      // An option's count, read out after its name ("Black, 8 products"); the digits are drawn apart.
      products: "{count, plural, one {# product} other {# products}}",
      showMore: "Show {count} more",
      showFewer: "Show fewer",
      // The price range's two fields and its two slider thumbs.
      minimum: "Minimum price",
      maximum: "Maximum price",
      bounds: "Prices from {min} to {max}",
    },
    activeFilterChips: {
      // The list's name: how many filters are applied.
      label: "{count, plural, one {# active filter} other {# active filters}}",
      // A chip's text ("Color: Black"); `{filter}` in `remove` is that text.
      chip: "{group}: {label}",
      remove: "Remove {filter}",
      clearAll: "Clear all",
      clearAllLabel: "Clear all filters",
    },
    emptyState: {},
    marketSwitcher: {
      // The trigger's name: the current market in the words of its three parts.
      trigger: "Country and language: {country}, {language}, {currency}",
      title: "Country and language",
      description:
        "Your country sets the currency, prices and delivery. Your language sets the words on the page.",
      close: "Close",
      list: "Countries and languages",
      // A language link's name: the language in its own words (the visible text), then its country.
      option: "{language}, {country}",
    },
    newsletterForm: {
      title: "Join our newsletter",
      description: "New arrivals, offers and stories, once a month. No spam.",
      emailLabel: "Email address",
      submit: "Subscribe",
      sending: "Subscribing…",
      // `{privacy}` is where the link goes; its text is `privacyLink`.
      consent: "By subscribing you agree to our {privacy}. You can unsubscribe at any time.",
      privacyLink: "privacy policy",
      done: "Thank you, you are subscribed.",
      error: "We could not subscribe this address. Check it and try again.",
    },
    accordionItem: {},
    toast: {
      // The kind of a toast, in words, beside its icon: colour and a drawing are not the only sign.
      kinds: { success: "Success", error: "Error", info: "Information" },
      close: "Close notification",
    },
    copyCodeChip: {
      copy: "Copy",
      label: "Copy code {code}",
      copied: "Copied",
      fallback: "Select the code and copy it",
    },
    countdownTimer: {
      label: "Offer ends {date}",
      ended: "This offer has ended",
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
