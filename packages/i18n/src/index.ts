// The locale list, the Intl formatters and the M0 message catalogs (the wiring page's copy).
// Kept in this one file while the package is small.

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

const en = {
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
    noProducts: "This region has no products.",
  },
  notFound: {
    title: "Page not found",
    body: "The page you are looking for does not exist.",
    home: "Back to the home page",
  },
};

/** The shape every catalog must have: English defines it. */
export type Messages = typeof en;

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
    noProducts: "Αυτή η περιοχή δεν έχει προϊόντα.",
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
    noProducts: "Diese Region hat keine Produkte.",
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
    noProducts: "Cette région n'a aucun produit.",
  },
  notFound: {
    title: "Page introuvable",
    body: "La page que vous recherchez n'existe pas.",
    home: "Retour à l'accueil",
  },
};

export const catalogs = { en, el, de, fr } satisfies Record<Locale, Messages>;
