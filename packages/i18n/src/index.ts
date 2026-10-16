// The locale list, the Intl formatters and the message catalogs (M0's wiring page, the 404 page and,
// from M1, the design-system pages' chrome). Kept in this one file while the package is small.

/** The store languages (SPEC §8.5) as ISO 639-1 codes. English is the base language. */
export const LOCALES = ["en", "el", "de", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** The authoring language, and the fallback for a missing translation. */
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

const currencyFormats = new Map<string, Intl.NumberFormat>();

/**
 * Formats an amount in major units: Medusa v2 returns 12.5 for €12.50, so the amount is never
 * divided or multiplied by 100. `locale` is a BCP 47 tag such as `el-CY` or `de-CH`, and
 * `currency` an ISO 4217 code in either case (Medusa's are lowercase).
 */
export function formatMoney(amount: number, currency: string, locale: string): string {
  // Building an Intl.NumberFormat costs far more than a format() call, and a listing page
  // formats dozens of prices, so keep one per locale and currency.
  const key = `${locale}|${currency.toUpperCase()}`;
  let format = currencyFormats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, { style: "currency", currency });
    currencyFormats.set(key, format);
  }
  return format.format(amount);
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}

// The design-system pages' own chrome (T22, D33). A developer tool: English only, so the other
// three catalogs have no such key and `Messages` leaves it out. What the pages show of an entry
// (its sample content) is in the chosen locale and comes from @shopblok/fixtures. The atoms' own
// copy (strings an atom needs whatever the page: a spinner's name) is the `atoms` key, in all four
// languages; atoms take it as props (D30).
const designSystem = {
  title: "Design system",
  skipToContent: "Skip to the content",
  navLabel: "Design system",
  overview: "Overview",
  overviewIntro:
    "Foundations and components of the Shopblok storefront, rendered from the shared tokens and fixtures. Pick a locale to see long strings and the market's currency formats.",
  groups: {
    foundations: "Foundations",
    atoms: "Atoms",
  },
  locale: {
    label: "Locale",
    current: "current",
  },
  sections: {
    liveRender: "Live render",
    states: "States",
    a11y: "Accessibility notes",
    viewports: "Viewports",
  },
  viewports: {
    all: "All three",
    group: "Preview width",
    scaleNote: "Scaled to fit",
    title: "Preview at",
    openFrame: "Open the frame",
  },
  fixtures: {
    market: "Market",
    currency: "Currency",
  },
};

const en = {
  designSystem,
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
    quantityStepper: { label: "Quantity", decrease: "Decrease quantity", increase: "Increase quantity" },
    stock: { inStock: "In stock", low: "Only {count} left", outOfStock: "Out of stock" },
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
  notFound: {
    title: "Page not found",
    body: "The page you are looking for does not exist.",
    home: "Back to the home page",
  },
};

/** The shape every catalog must have: English defines it, except for the design-system chrome. */
export type Messages = Omit<typeof en, "designSystem">;

const el: Messages = {
  wiring: {
    title: "Έλεγχος σύνδεσης Shopblok",
    market: "Αγορά",
    language: "Γλώσσα",
    currency: "Νόμισμα",
    products: "Προϊόντα",
    pages: "Σελίδες Payload",
    backendUnavailable: "Το backend του Medusa δεν είναι προσβάσιμο.",
    backendHint:
      "Ξεκινήστε το backend με pnpm dev και φορτώστε ξανά τη σελίδα· το αρχείο καταγραφής του διακομιστή έχει τις λεπτομέρειες.",
    region: "Περιοχή",
    noRegion:
      "Το Medusa δεν έχει περιοχή για τη χώρα αυτής της αγοράς, γι' αυτό δεν υπάρχουν τιμές.",
    priceCurrencies: "Νομίσματα φίλτρου τιμής",
    noProducts: "Αυτή η περιοχή δεν έχει προϊόντα.",
  },
  atoms: {
    spinner: { loading: "Φόρτωση" },
    chip: { remove: "Αφαίρεση" },
    link: { newTab: "Ανοίγει σε νέα καρτέλα" },
    price: { sale: "Τιμή προσφοράς", original: "Αρχική τιμή" },
    rating: { label: "{value} στα {max}" },
    quantityStepper: { label: "Ποσότητα", decrease: "Μείωση ποσότητας", increase: "Αύξηση ποσότητας" },
    stock: { inStock: "Διαθέσιμο", low: "Απομένουν μόνο {count}", outOfStock: "Εξαντλημένο" },
    variant: { unavailable: "Μη διαθέσιμο" },
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
  notFound: {
    title: "Η σελίδα δεν βρέθηκε",
    body: "Η σελίδα που ψάχνετε δεν υπάρχει.",
    home: "Επιστροφή στην αρχική σελίδα",
  },
};

const de: Messages = {
  wiring: {
    title: "Shopblok-Verbindungsprüfung",
    market: "Markt",
    language: "Sprache",
    currency: "Währung",
    products: "Produkte",
    pages: "Payload-Seiten",
    backendUnavailable: "Das Medusa-Backend ist nicht erreichbar.",
    backendHint:
      "Starten Sie das Backend mit pnpm dev und laden Sie die Seite neu; das Server-Log enthält die Details.",
    region: "Region",
    noRegion: "Medusa hat keine Region für das Land dieses Marktes, daher gibt es keine Preise.",
    priceCurrencies: "Währungen des Preisfilters",
    noProducts: "Diese Region hat keine Produkte.",
  },
  atoms: {
    spinner: { loading: "Wird geladen" },
    chip: { remove: "Entfernen" },
    link: { newTab: "Öffnet in einem neuen Tab" },
    price: { sale: "Angebotspreis", original: "Ursprünglicher Preis" },
    rating: { label: "{value} von {max}" },
    quantityStepper: { label: "Menge", decrease: "Menge verringern", increase: "Menge erhöhen" },
    stock: { inStock: "Auf Lager", low: "Nur noch {count} verfügbar", outOfStock: "Nicht auf Lager" },
    variant: { unavailable: "Nicht verfügbar" },
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
  notFound: {
    title: "Seite nicht gefunden",
    body: "Die gesuchte Seite existiert nicht.",
    home: "Zurück zur Startseite",
  },
};

const fr: Messages = {
  wiring: {
    title: "Vérification de la connexion Shopblok",
    market: "Marché",
    language: "Langue",
    currency: "Devise",
    products: "Produits",
    pages: "Pages Payload",
    backendUnavailable: "Le backend Medusa est injoignable.",
    backendHint:
      "Démarrez le backend avec pnpm dev puis rechargez la page ; le journal du serveur donne les détails.",
    region: "Région",
    noRegion:
      "Medusa n'a pas de région pour le pays de ce marché, il n'y a donc aucun prix à afficher.",
    priceCurrencies: "Devises du filtre de prix",
    noProducts: "Cette région n'a aucun produit.",
  },
  atoms: {
    spinner: { loading: "Chargement" },
    chip: { remove: "Supprimer" },
    link: { newTab: "S’ouvre dans un nouvel onglet" },
    price: { sale: "Prix soldé", original: "Prix initial" },
    rating: { label: "{value} sur {max}" },
    quantityStepper: { label: "Quantité", decrease: "Diminuer la quantité", increase: "Augmenter la quantité" },
    stock: { inStock: "En stock", low: "Plus que {count} en stock", outOfStock: "Rupture de stock" },
    variant: { unavailable: "Indisponible" },
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
  notFound: {
    title: "Page introuvable",
    body: "La page que vous recherchez n'existe pas.",
    home: "Retour à l'accueil",
  },
};

export const catalogs = { en, el, de, fr } satisfies Record<Locale, Messages>;
