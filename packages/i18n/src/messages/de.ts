import type { Messages } from "./en";

// The German catalog: English's keys and ICU arguments (D43), drafted by the sessions as M1's were;
// W4 is where a native speaker reads it.

export const de: Messages = {
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
    stock: {
      inStock: "Auf Lager",
      low: "{count, plural, other {Nur noch # verfügbar}}",
      outOfStock: "Nicht auf Lager",
    },
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
  primitives: { toast: { region: "Benachrichtigungen", close: "Benachrichtigung schließen" } },
  // Filled by M2's component tasks (T32 to T39), each with its components' strings.
  molecules: {
    variantSelector: {
      chosen: "{option}: {value}",
      unavailable: "Nicht verfügbar",
    },
    ratingSummary: {
      rating: "{value} von {max}",
      count:
        "{count, plural, =0 {Noch keine Bewertungen} one {Basierend auf # Bewertung} other {Basierend auf # Bewertungen}}",
      distribution: "Bewertungen nach Sternen",
      row: "{stars, plural, one {# Stern} other {# Sterne}}, {count, plural, one {# Bewertung} other {# Bewertungen}}",
    },
    reviewItem: {
      rating: "Bewertet mit {value} von {max}",
      verified: "Verifizierter Kauf",
    },
    mediaFigure: {
      credit: "Foto: {credit}",
    },
    priceBlock: {
      sale: "Angebotspreis",
      original: "Ursprünglicher Preis",
      from: "Ab {price}",
      taxIncluded: "Inkl. Steuern",
      taxExcluded: "Zzgl. Steuern",
    },
    productCard: {
      soldOut: "Ausverkauft",
      badges: { sale: "Sale", new: "Neu", bestseller: "Bestseller" },
      rating: "{average} von 5, {count, plural, one {# Bewertung} other {# Bewertungen}}",
      ratingCount: "({count, number})",
      swatches: "Farben",
      swatchUnavailable: "Nicht verfügbar",
      swatchesMore: "{count, plural, one {# weitere Farbe} other {# weitere Farben}}",
      moreCount: "+{count, number}",
      quickAdd: {
        add: "In den Warenkorb",
        chooseOptions: "Optionen wählen",
        adding: "Wird hinzugefügt …",
        added: "In den Warenkorb gelegt",
        error: "Der Artikel konnte nicht hinzugefügt werden. Bitte versuchen Sie es erneut.",
        forProduct: ", {title}",
      },
    },
  },
  organisms: {},
  notFound: {
    title: "Seite nicht gefunden",
    body: "Die gesuchte Seite existiert nicht.",
    home: "Zurück zur Startseite",
  },
};
