// Mock data for the design-system pages (M1 plan, T22; D33): for each of the four locales, the
// market whose formats it renders with, ordinary and long strings, prices, stock, a rating, sizes
// and colours. The atoms' DS entries take their sample content from here, never from literals of
// their own, so a long German label or a Swiss franc price is the same fixture in every entry.
// Amounts are in major units, as Medusa returns them (`formatMoney` in @shopblok/i18n).
//
// The locale list repeats `LOCALES` of @shopblok/i18n on purpose: this package has no dependencies
// but its config, and a storefront test checks that the two lists are the same.

export const designSystemLocales = ["en", "el", "de", "fr"] as const;

export type DesignSystemLocale = (typeof designSystemLocales)[number];

/** The market a DS locale renders with (D33): its key, country, language and `<html lang>`. */
export type DesignSystemMarket = {
  /** `{language}-{country}`, a key of the seeded market map (markets.ts). */
  key: string;
  /** ISO 3166-1 alpha-2, lowercase. */
  country: string;
  /** ISO 639-1, lowercase: the DS locale itself. */
  language: DesignSystemLocale;
  /** `{language}-{COUNTRY}`: `<html lang>` and the locale of every `Intl` call. */
  htmlLang: string;
  /** ISO 4217, uppercase. */
  currency: string;
};

/** One set of sample strings. */
export type DesignSystemStrings = {
  productName: string;
  productDescription: string;
  /** A button's label. */
  action: string;
  /** A form field's label. */
  fieldLabel: string;
  placeholder: string;
  helpText: string;
  errorText: string;
};

export type DesignSystemFixture = {
  locale: DesignSystemLocale;
  market: DesignSystemMarket;
  /** What a shop writes: short enough to fit anywhere. */
  ordinary: DesignSystemStrings;
  /** The same strings at the length that breaks a layout (German's runs about 30 % longer). */
  long: DesignSystemStrings;
  prices: {
    regular: number;
    /** A marked-down price and the one it replaces. */
    sale: { amount: number; original: number };
    /** Four digits, so the locale's grouping and decimal marks show. */
    high: number;
  };
  stock: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    /** At or under this many, a stock indicator says "low". */
    lowThreshold: number;
  };
  rating: { value: number; max: number; count: number };
  sizes: { label: string; available: boolean }[];
  colours: { name: string; hex: string }[];
};

const sizes: DesignSystemFixture["sizes"] = [
  { label: "XS", available: true },
  { label: "S", available: true },
  { label: "M", available: true },
  { label: "L", available: true },
  { label: "XL", available: false },
  { label: "XXL", available: true },
];

const stock: DesignSystemFixture["stock"] = {
  inStock: 24,
  lowStock: 3,
  outOfStock: 0,
  lowThreshold: 5,
};

const rating: DesignSystemFixture["rating"] = {
  value: 4.6,
  max: 5,
  count: 1284,
};

// The amounts are the demo catalog's Heritage Hoodie (apps/backend/src/scripts/lib/demo-catalog.ts):
// EUR 59, USD 64, CHF 58.
function prices(regular: number, sale: number): DesignSystemFixture["prices"] {
  return { regular, sale: { amount: sale, original: regular }, high: 1249.5 };
}

const en: DesignSystemFixture = {
  locale: "en",
  market: {
    key: "en-us",
    country: "us",
    language: "en",
    htmlLang: "en-US",
    currency: "USD",
  },
  ordinary: {
    productName: "Heritage Hoodie",
    productDescription: "A midweight hoodie in brushed organic cotton, cut for everyday wear.",
    action: "Add to cart",
    fieldLabel: "Size",
    placeholder: "Choose a size",
    helpText: "Fits true to size.",
    errorText: "Choose a size to continue.",
  },
  long: {
    productName:
      "Heritage Hoodie in brushed organic cotton fleece with reinforced seams and a double-lined hood",
    productDescription:
      "A midweight hoodie cut to be worn all day. The organic cotton is brushed on the inside for extra warmth, and the seams are reinforced where they take the most strain.",
    action: "Add to cart and continue to checkout",
    fieldLabel: "Delivery instructions for the courier",
    placeholder: "Tell the courier where to leave the parcel if nobody is home",
    helpText: "We pass this on to the courier exactly as you write it.",
    errorText: "We could not add this item, because the size you chose is no longer in stock.",
  },
  prices: prices(64, 49),
  stock,
  rating,
  sizes,
  colours: [
    { name: "Black", hex: "#111111" },
    { name: "Oatmeal", hex: "#d9cdb8" },
    { name: "Forest green", hex: "#2f5d3a" },
    { name: "Sky blue", hex: "#8ec5ea" },
    { name: "Brick", hex: "#a4452c" },
  ],
};

const el: DesignSystemFixture = {
  locale: "el",
  market: {
    key: "el-cy",
    country: "cy",
    language: "el",
    htmlLang: "el-CY",
    currency: "EUR",
  },
  ordinary: {
    productName: "Φούτερ με κουκούλα Heritage",
    productDescription:
      "Φούτερ μεσαίου βάρους από βουρτσισμένο οργανικό βαμβάκι, για καθημερινή χρήση.",
    action: "Προσθήκη στο καλάθι",
    fieldLabel: "Μέγεθος",
    placeholder: "Επιλέξτε μέγεθος",
    helpText: "Η εφαρμογή είναι στο κανονικό μέγεθος.",
    errorText: "Επιλέξτε μέγεθος για να συνεχίσετε.",
  },
  long: {
    productName:
      "Φούτερ με κουκούλα Heritage από βουρτσισμένο οργανικό βαμβακερό φλις με ενισχυμένες ραφές και διπλή κουκούλα",
    productDescription:
      "Ένα φούτερ μεσαίου βάρους που κόβεται για να φοριέται όλη μέρα. Το οργανικό βαμβάκι είναι βουρτσισμένο στο εσωτερικό για επιπλέον ζεστασιά, και οι ραφές ενισχύονται στα σημεία που δέχονται τη μεγαλύτερη καταπόνηση.",
    action: "Προσθήκη στο καλάθι και συνέχεια στο ταμείο",
    fieldLabel: "Οδηγίες παράδοσης για τον κούριερ",
    placeholder: "Γράψτε πού να αφήσει το δέμα ο κούριερ αν δεν είναι κανείς σπίτι",
    helpText: "Τις μεταβιβάζουμε στον κούριερ ακριβώς όπως τις γράφετε.",
    errorText:
      "Δεν μπορέσαμε να προσθέσουμε το προϊόν, επειδή το μέγεθος που επιλέξατε δεν είναι πια διαθέσιμο.",
  },
  prices: prices(59, 47),
  stock,
  rating,
  sizes,
  colours: [
    { name: "Μαύρο", hex: "#111111" },
    { name: "Βρώμη", hex: "#d9cdb8" },
    { name: "Πράσινο του δάσους", hex: "#2f5d3a" },
    { name: "Γαλάζιο", hex: "#8ec5ea" },
    { name: "Τουβλί", hex: "#a4452c" },
  ],
};

const de: DesignSystemFixture = {
  locale: "de",
  market: {
    key: "de-de",
    country: "de",
    language: "de",
    htmlLang: "de-DE",
    currency: "EUR",
  },
  ordinary: {
    productName: "Heritage-Hoodie",
    productDescription:
      "Ein Hoodie mittlerer Stärke aus gebürsteter Bio-Baumwolle, geschnitten für den Alltag.",
    action: "In den Warenkorb",
    fieldLabel: "Größe",
    placeholder: "Größe wählen",
    helpText: "Fällt normal aus.",
    errorText: "Wählen Sie eine Größe, um fortzufahren.",
  },
  long: {
    productName:
      "Heritage-Kapuzenpullover aus gebürstetem Bio-Baumwollfleece mit verstärkten Nähten und doppelt gefütterter Kapuze",
    productDescription:
      "Ein Kapuzenpullover mittlerer Stärke, der für einen ganzen Tag geschnitten ist. Die Bio-Baumwolle ist innen für zusätzliche Wärme gebürstet, und die Nähte sind dort verstärkt, wo sie am stärksten beansprucht werden.",
    action: "In den Warenkorb legen und weiter zur Kasse",
    fieldLabel: "Lieferhinweise für den Paketdienst",
    placeholder:
      "Sagen Sie dem Paketdienst, wo er das Paket abstellen soll, wenn niemand zu Hause ist",
    helpText: "Wir geben diese Hinweise genau so an den Paketdienst weiter, wie Sie sie schreiben.",
    errorText:
      "Wir konnten diesen Artikel nicht hinzufügen, weil die gewählte Größe nicht mehr auf Lager ist.",
  },
  prices: prices(59, 47),
  stock,
  rating,
  sizes,
  colours: [
    { name: "Schwarz", hex: "#111111" },
    { name: "Hafer", hex: "#d9cdb8" },
    { name: "Waldgrün", hex: "#2f5d3a" },
    { name: "Himmelblau", hex: "#8ec5ea" },
    { name: "Ziegelrot", hex: "#a4452c" },
  ],
};

const fr: DesignSystemFixture = {
  locale: "fr",
  market: {
    key: "fr-ch",
    country: "ch",
    language: "fr",
    htmlLang: "fr-CH",
    currency: "CHF",
  },
  ordinary: {
    productName: "Sweat à capuche Heritage",
    productDescription:
      "Un sweat à capuche de poids moyen en coton biologique gratté, coupé pour tous les jours.",
    action: "Ajouter au panier",
    fieldLabel: "Taille",
    placeholder: "Choisir une taille",
    helpText: "Taille normalement.",
    errorText: "Choisissez une taille pour continuer.",
  },
  long: {
    productName:
      "Sweat à capuche Heritage en molleton de coton biologique gratté, coutures renforcées et capuche doublée",
    productDescription:
      "Un sweat à capuche de poids moyen, coupé pour être porté toute la journée. Le coton biologique est gratté à l'intérieur pour plus de chaleur, et les coutures sont renforcées aux endroits les plus sollicités.",
    action: "Ajouter au panier et passer à la caisse",
    fieldLabel: "Instructions de livraison pour le coursier",
    placeholder: "Indiquez au coursier où laisser le colis si personne n'est à la maison",
    helpText: "Nous transmettons ces instructions au coursier exactement comme vous les écrivez.",
    errorText:
      "Nous n'avons pas pu ajouter cet article, car la taille choisie n'est plus en stock.",
  },
  prices: prices(58, 46),
  stock,
  rating,
  sizes,
  colours: [
    { name: "Noir", hex: "#111111" },
    { name: "Avoine", hex: "#d9cdb8" },
    { name: "Vert forêt", hex: "#2f5d3a" },
    { name: "Bleu ciel", hex: "#8ec5ea" },
    { name: "Brique", hex: "#a4452c" },
  ],
};

/** One fixture per DS locale. */
export const designSystemFixtures: Record<DesignSystemLocale, DesignSystemFixture> = {
  en,
  el,
  de,
  fr,
};
