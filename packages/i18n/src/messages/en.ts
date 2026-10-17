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
    // T34: cart, checkout and account.
    cartLineItem: {
      // A chosen option beside its value; `named` is the line as its controls are named after it
      // (the product, and which of it when it has options: a cart can hold one product twice).
      option: "{option}: {value}",
      named: "{title} ({options})",
      quantity: "Quantity, {line}",
      decrease: "Decrease quantity, {line}",
      increase: "Increase quantity, {line}",
      // The button of the quantity form that shows when there is no script to send it by itself.
      update: "Update",
      updateLabel: "Update quantity, {line}",
      remove: "Remove {line}",
      // `{price}` is where the amount goes: some languages put the word before it.
      unitPrice: "{price} each",
      unitPriceLabel: "Unit price",
      lineTotalLabel: "Line total",
      sale: "Sale price",
      original: "Original price",
      updating: "Updating…",
      stock: {
        low: "{count, plural, other {Only # left}}",
        lowNoCount: "Low stock",
        out: "Out of stock",
      },
    },
    promoCodeField: {
      toggle: "Add a promotion code",
      label: "Promotion code",
      apply: "Apply",
      applying: "Applying…",
      removing: "Removing…",
      // The list of codes applied, and what one takes off ("Saves $5.00").
      appliedList: "Applied promotion codes",
      saves: "Saves {amount}",
      remove: "Remove promotion code {code}",
      errors: {
        invalid: "This code is not valid. Check it and try again.",
        expired: "This code has expired.",
        notApplicable: "This code does not apply to your cart.",
        alreadyApplied: "This code is already applied.",
        failed: "We could not apply this code. Please try again.",
      },
    },
    freeShippingProgress: {
      // `{amount}` is what is left to spend, formatted as money.
      remaining: "Add {amount} more for free shipping",
      reached: "You get free shipping",
    },
    addressCard: {
      defaultShipping: "Default shipping",
      defaultBilling: "Default billing",
      phone: "Phone {phone}",
      edit: "Edit",
      // The visible word comes first in each name (WCAG 2.5.3), then which address.
      editLabel: "Edit the address of {name}, {city}",
      remove: "Remove",
      removeLabel: "Remove the address of {name}, {city}",
      removing: "Removing…",
      removingLabel: "Removing the address of {name}, {city}",
    },
    addressForm: {
      // The form's name (a landmark): which address it is for.
      label: { shipping: "Shipping address", billing: "Billing address", address: "Address" },
      requiredNote: "All fields are required unless marked optional.",
      // After the label of a field that may stay empty (WCAG 3.3.2).
      optional: "(optional)",
      countryLabel: "Country or region",
      // Said once when the country changes and the fields change with it (WCAG 4.1.3).
      fieldsUpdated: "The address fields now follow the format for {country}.",
      // Under the postal code, so the shopper knows the shape before typing.
      example: "For example: {example}",
      // A field's name, by what the country calls it: Google's name types (D48).
      labels: {
        firstName: "First name",
        lastName: "Last name",
        company: "Company",
        address1: "Address",
        address2: "Apartment, suite, etc.",
        phone: "Phone",
        city: { city: "City", district: "District", post_town: "Town or city", suburb: "Suburb" },
        province: {
          area: "Area",
          county: "County",
          department: "Department",
          district: "District",
          do_si: "Province or city",
          emirate: "Emirate",
          island: "Island",
          oblast: "Oblast",
          parish: "Parish",
          prefecture: "Prefecture",
          province: "Province",
          region: "Region",
          state: "State",
        },
        postalCode: { postal: "Postal code", zip: "ZIP code", pin: "PIN code", eircode: "Eircode" },
      },
      errors: {
        required: "{field} is required.",
        invalid: "{field} is not valid. Check it and try again.",
        pattern: "{field} is not in the right format.",
        // A postal code that does not match its country's pattern, with an example that does.
        postalCode: {
          postal: "Enter a postal code like {example}.",
          zip: "Enter a ZIP code like {example}.",
          pin: "Enter a PIN code like {example}.",
          eircode: "Enter an Eircode like {example}.",
        },
      },
      // The form's own status line, said politely.
      summary:
        "{count, plural, one {# field needs your attention.} other {# fields need your attention.}}",
      error: "We could not save this address. Check the details and try again.",
      submit: "Save address",
      saving: "Saving…",
    },
    shippingOptionCard: {
      free: "Free",
      // Business days to delivery: a range (the plural follows the upper number), one number when the
      // two are the same, and "same day" for 0 to 0.
      estimate:
        "{maxDays, plural, one {{minDays, number}–# business day} other {{minDays, number}–# business days}}",
      estimateExact: "{days, plural, one {# business day} other {# business days}}",
      sameDay: "Same day",
      pickup: "Collect from {location}",
      unavailable: "Not available for this order",
    },
    paymentMethodCard: {
      // Read out (not drawn: the marks are) when the name does not say which brands the method takes.
      accepts: "Accepts {brands}",
      // Under a method that sends the customer to the provider's page.
      redirect: "You will be redirected to {name} to complete your payment.",
    },
    savedPaymentMethodCard: {
      // The card in words: the brand's name (`atoms.payment`) and the last four digits.
      card: "{brand} ending in {last4}",
      default: "Default",
      // `date` is month and year (08/2028).
      expires: "Expires {date}",
      expired: "Expired {date}",
      holder: "Cardholder: {name}",
      // The button's text, and its name (which says which card).
      remove: "Remove",
      removeNamed: "Remove {card}",
      // The confirmation: an alert dialog.
      confirmTitle: "Remove this payment method?",
      confirmText: "{card} will be removed from your saved payment methods.",
      cancel: "Cancel",
      confirm: "Remove",
      removing: "Removing…",
      error: "We could not remove this payment method. Please try again.",
    },
    orderSummaryRow: {
      // The label of each kind of row.
      subtotal: "Subtotal",
      discount: "Discount",
      shipping: "Shipping",
      tax: "Taxes",
      total: "Total",
      // A row's label with what it is for beside it: the promotion code of a discount.
      withDetail: "{label} ({detail})",
      // Shipping that costs nothing, and an amount that is not known yet (the next step works it out).
      free: "Free",
      pending: "Calculated at the next step",
    },
    stepper: {
      // The default name of the list of steps; a flow that is not checkout passes its own.
      label: "Checkout steps",
      // Read out before the current step's name, with its place in the flow (not drawn).
      position: "Step {step} of {count}:",
      // Read out after the name of a step that is done (not drawn: the check mark is).
      completed: ", completed",
    },
    shippingEstimator: {
      title: "Estimate shipping",
      description: "Enter your country and postal code to see delivery options and prices.",
      country: "Country",
      countryPlaceholder: "Select a country",
      postalCode: "Postal code",
      submit: "Show delivery options",
      // The list's name, and what is said when nothing ships to the place.
      results: "Delivery options for {postalCode}, {country}",
      none: "We cannot deliver to {postalCode}, {country} right now. Try another postal code or country.",
      free: "Free",
      // The time a delivery takes, in business days: a range, or one number (0 is the same day).
      estimateRange:
        "{minDays, number}–{maxDays, plural, one {# business day} other {# business days}}",
      estimateExact: "{days, plural, =0 {Same day} one {# business day} other {# business days}}",
      pickupAt: "Collect from {location}",
      errors: {
        postalCode: "Enter a valid postal code for this country.",
        failed: "We could not get delivery options. Please try again.",
      },
    },
    verificationNotice: {
      title: "Check your email",
      // `{email}` is drawn in bold.
      sent: "We sent a link to {email}. Open it to verify your address.",
      spam: "Nothing in your inbox? Check your spam folder.",
      resend: "Send a new link",
      sending: "Sending…",
      // `{time}` is the seconds left, written by Intl ("42 sec"); it ticks down in the browser.
      cooldown: "You can ask for a new link in {time}.",
      // Said once, politely, when the wait is over.
      ready: "You can ask for a new link now.",
      resent: "We sent a new link.",
      error: "We could not send the email. Please try again.",
    },
  },
  // T35: navigation and the headers. A component takes its part (`organisms.megaMenu`) as `copy`.
  organisms: {
    announcementBar: {
      // The bar's landmark and, when it shows several messages in turn, its controls.
      region: "Announcements",
      pause: "Pause announcements",
      play: "Play announcements",
      previous: "Previous announcement",
      next: "Next announcement",
      // Which message is shown, for a reader who does not see it change.
      position: "{current} of {total}",
      dismiss: "Close announcements",
    },
    megaMenu: {
      // The first link of a panel whose label goes somewhere too.
      shopAll: "Shop all {label}",
      featured: "Featured",
    },
    mobileNavDrawer: {
      open: "Menu",
      title: "Menu",
      close: "Close menu",
      // The button that goes up a level, named by the level it goes back to.
      back: "Back to {label}",
      shopAll: "Shop all {label}",
      account: "Your account",
    },
    marketSuggestionBanner: {
      region: "Store suggestion",
      // {country} and {currency} are the suggested store's; {current} is the country the page is in.
      message:
        "It looks like you're in {country}. Its store has prices in {currency} and delivers locally.",
      go: "Go to the {country} store",
      stay: "Stay in the {current} store",
    },
    header: {
      skipToContent: "Skip to content",
      // The logo's link.
      home: "{store}, home",
      // The navigation landmark's name: a screen reader adds "navigation".
      navigation: "Main",
      search: "Search",
      account: "Account",
      wishlist: "Wishlist",
      cart: "Cart",
      // What the cart holds, after its name ("Cart 3 items"): only once the browser knows it (D44).
      cartItems: "{count, plural, =0 {empty} one {# item} other {# items}}",
      // The badge of a cart with more items than it has room for.
      cartOverflow: "{max}+",
    },
    // T36: the footers, cookie consent and the loading skeletons.
    footer: {
      // The logo's or the wordmark's link.
      home: "{store}, home",
      // The landmark of the columns of links: a screen reader adds "navigation".
      navigation: "Footer",
      // The legal links' landmark, when they are a list of their own.
      legal: "Legal",
      // The heading over the social links, and each link's name: the network's own name.
      social: "Follow us",
      socialLink: "{store} on {network}",
      // The list of the payment marks.
      payment: "Ways to pay",
      // Read after a link that opens another site in a new tab.
      newTab: "Opens in a new tab",
    },
    cookieConsent: {
      // The banner's landmark.
      region: "Cookie consent",
      title: "Cookies on this store",
      // `{policy}` is where the link goes; its text is `policyLink`.
      message:
        "We use necessary cookies to make the store work. With your permission we also use analytics cookies to see how the store is used, and marketing cookies to show you offers that match your interests. Read our {policy}.",
      policyLink: "cookie policy",
      acceptAll: "Accept all",
      rejectAll: "Reject all",
      choose: "Choose cookies",
      // The dialog "choose" opens.
      dialogTitle: "Cookie preferences",
      dialogDescription:
        "Choose which cookies we may use. Nothing is switched on until you save.",
      necessary: "Necessary",
      necessaryDescription:
        "Keep the store working: they remember your cart, your sign-in, your country and language, and this choice.",
      // The necessary category's switch, which is on and cannot change.
      alwaysOn: "Always on",
      analytics: "Analytics",
      analyticsDescription: "Count visits and show us how the store is used, so we can improve it.",
      marketing: "Marketing",
      marketingDescription: "Show you offers that match your interests, here and on other sites.",
      save: "Save my choices",
      close: "Close",
    },
    loadingSkeleton: {
      // The busy region's name, for each layout.
      productGrid: "Loading products",
      productPage: "Loading the product",
      cart: "Loading your cart",
      accountList: "Loading your account",
    },
    // T37: the listing organisms.
    searchOverlay: {
      // The button that opens the overlay, and the dialog's name.
      open: "Search",
      title: "Search the store",
      // The field's name, and the same words as its placeholder.
      label: "Search products",
      placeholder: "Search products",
      close: "Close search",
      recent: "Recent searches",
      clearRecent: "Clear recent searches",
      products: "Products",
      categories: "Categories",
      suggestions: "Suggestions",
      // The form's submit: the search page with every result.
      seeAll: "{count, plural, one {See # result} other {See all # results}}",
      // Announced politely as the results change (WCAG 4.1.3).
      loading: "Searching…",
      status: "{count, plural, =0 {No results} one {# result} other {# results}}",
      noResults: "No results for “{query}”",
      noResultsHint: "Check the spelling, or try a more general word.",
    },
    filterSidebar: {
      // The form's heading and name.
      title: "Filters",
      apply: "Apply filters",
    },
    filterDrawer: {
      // The button that opens the drawer, and how many filters are chosen, read after it.
      open: "Filters",
      chosen: "{count, plural, one {# filter chosen} other {# filters chosen}}",
      title: "Filters",
      close: "Close filters",
      show: "{count, plural, =0 {No results} one {Show # result} other {Show # results}}",
      clear: "Clear all",
    },
    productToolbar: {
      count: "{count, plural, =0 {No products} one {# product} other {# products}}",
      // The grid or list toggle's name, and its two buttons.
      view: "View",
      grid: "Grid",
      list: "List",
    },
    productGrid: {
      // The list of products' name.
      label: "Products",
    },
    productCarousel: {
      // What a screen reader calls the carousel and each slide (`aria-roledescription`).
      carousel: "carousel",
      slide: "slide",
      previous: "Previous products",
      next: "Next products",
      // A slide's name, and what is announced when the carousel moves.
      position: "{index, number} of {count, number}",
      showing: "Showing {from, number} to {to, number} of {count, number}",
    },
    compareTray: {
      region: "Compare products",
      count: "{count, number} of {max, number} chosen",
      remove: "Remove {title}",
      clear: "Remove all",
      compare: "Compare",
      // Shown while too few products are chosen; the compare link waits for them.
      needMore:
        "{count, plural, one {Choose # more product to compare} other {Choose # more products to compare}}",
    },
  },
  notFound: {
    title: "Page not found",
    body: "The page you are looking for does not exist.",
    home: "Back to the home page",
  },
};

/** The shape every catalog has: English's. */
export type Messages = typeof en;
