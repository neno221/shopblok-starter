/**
 * The demo catalog `seed-demo-catalog.ts` creates (development only, D7).
 * Plain data, no Medusa imports. Everything is identified by a deterministic
 * handle or title, which is how a second run recognises its own rows.
 *
 * Prices are in major units (Medusa stores 25 as 25, never as cents).
 */
import type { SupportedCurrency, TranslatedLocale } from "./markets";

/** The search index `src/search/product.ts` defines. */
export const PRODUCT_INDEX = "product";

/** The same text in each translated locale; English is the data itself. */
export type Names = Record<TranslatedLocale, string>;

const names = (el: string, de: string, fr: string): Names => ({
  "el-GR": el,
  "de-DE": de,
  "fr-FR": fr,
});

export type DemoCategory = { handle: string; name: string; translations: Names };

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    handle: "apparel",
    name: "Apparel",
    translations: names("Ρούχα", "Bekleidung", "Vêtements"),
  },
  {
    handle: "accessories",
    name: "Accessories",
    translations: names("Αξεσουάρ", "Accessoires", "Accessoires"),
  },
  {
    handle: "home",
    name: "Home",
    translations: names("Σπίτι", "Zuhause", "Maison"),
  },
];

export type DemoCollection = {
  handle: string;
  title: string;
  translations: Names;
};

export const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    handle: "everyday-basics",
    title: "Everyday Basics",
    translations: names("Καθημερινά βασικά", "Alltagsbasics", "Essentiels du quotidien"),
  },
  {
    handle: "summer-edit",
    title: "Summer Edit",
    translations: names("Καλοκαιρινή επιλογή", "Sommer-Auswahl", "Sélection d'été"),
  },
];

/**
 * Shared (non-exclusive) options. Sizes read the same in every language, so
 * they have no value translations.
 */
export type DemoOption = {
  title: string;
  values: string[];
  translations: Names;
  valueTranslations: Record<string, Names>;
};

export const DEMO_OPTIONS: DemoOption[] = [
  {
    title: "Size",
    values: ["S", "M", "L", "XL"],
    translations: names("Μέγεθος", "Größe", "Taille"),
    valueTranslations: {},
  },
  {
    title: "Color",
    values: ["Black", "White", "Navy"],
    translations: names("Χρώμα", "Farbe", "Couleur"),
    valueTranslations: {
      Black: names("Μαύρο", "Schwarz", "Noir"),
      White: names("Λευκό", "Weiß", "Blanc"),
      Navy: names("Ναυτικό μπλε", "Marineblau", "Bleu marine"),
    },
  },
];

export type DemoProduct = {
  handle: string;
  title: string;
  description: string;
  category: string;
  collection: string;
  /** Option title to the values this product is sold in; variants are their product. */
  options: Record<string, string[]>;
  /** One price per supported currency, the same for every variant. */
  prices: Record<SupportedCurrency, number>;
  translations: Record<TranslatedLocale, { title: string; description: string }>;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    handle: "demo-classic-tee",
    title: "Classic Tee",
    description: "A soft everyday T-shirt in organic cotton.",
    category: "apparel",
    collection: "everyday-basics",
    options: { Size: ["S", "M", "L", "XL"], Color: ["Black", "White"] },
    prices: { eur: 25, usd: 28, gbp: 22, chf: 26 },
    translations: {
      "el-GR": {
        title: "Κλασικό μπλουζάκι",
        description: "Ένα απαλό καθημερινό μπλουζάκι από οργανικό βαμβάκι.",
      },
      "de-DE": {
        title: "Klassisches T-Shirt",
        description: "Ein weiches Alltags-T-Shirt aus Bio-Baumwolle.",
      },
      "fr-FR": {
        title: "T-shirt classique",
        description: "Un t-shirt doux pour tous les jours, en coton biologique.",
      },
    },
  },
  {
    handle: "demo-heritage-hoodie",
    title: "Heritage Hoodie",
    description: "A heavyweight hoodie with a brushed fleece lining.",
    category: "apparel",
    collection: "everyday-basics",
    options: { Size: ["S", "M", "L", "XL"], Color: ["Black", "Navy"] },
    prices: { eur: 59, usd: 64, gbp: 51, chf: 58 },
    translations: {
      "el-GR": {
        title: "Φούτερ με κουκούλα Heritage",
        description: "Βαρύ φούτερ με κουκούλα και βουρτσισμένη φλις επένδυση.",
      },
      "de-DE": {
        title: "Heritage-Hoodie",
        description: "Ein schwerer Hoodie mit angerauter Fleece-Innenseite.",
      },
      "fr-FR": {
        title: "Sweat à capuche Heritage",
        description: "Un sweat à capuche épais, doublé de molleton gratté.",
      },
    },
  },
  {
    handle: "demo-everyday-joggers",
    title: "Everyday Joggers",
    description: "Relaxed joggers with an elastic waist and tapered legs.",
    category: "apparel",
    collection: "everyday-basics",
    options: { Size: ["S", "M", "L"] },
    prices: { eur: 49, usd: 54, gbp: 43, chf: 48 },
    translations: {
      "el-GR": {
        title: "Παντελόνι φόρμας Everyday",
        description: "Άνετο παντελόνι φόρμας με λάστιχο στη μέση και στενό μπατζάκι.",
      },
      "de-DE": {
        title: "Everyday-Jogginghose",
        description: "Lockere Jogginghose mit Gummibund und schmal zulaufenden Beinen.",
      },
      "fr-FR": {
        title: "Jogging Everyday",
        description: "Un jogging décontracté à taille élastique et jambes fuselées.",
      },
    },
  },
  {
    handle: "demo-linen-shorts",
    title: "Linen Shorts",
    description: "Lightweight linen shorts for warm days.",
    category: "apparel",
    collection: "summer-edit",
    options: { Size: ["S", "M", "L"] },
    prices: { eur: 39, usd: 42, gbp: 34, chf: 38 },
    translations: {
      "el-GR": {
        title: "Λινό σορτς",
        description: "Ελαφρύ λινό σορτς για ζεστές μέρες.",
      },
      "de-DE": {
        title: "Leinenshorts",
        description: "Leichte Shorts aus Leinen für warme Tage.",
      },
      "fr-FR": {
        title: "Short en lin",
        description: "Un short léger en lin pour les journées chaudes.",
      },
    },
  },
  {
    handle: "demo-canvas-cap",
    title: "Canvas Cap",
    description: "A six-panel cap in washed canvas with an adjustable strap.",
    category: "accessories",
    collection: "summer-edit",
    options: { Color: ["Black", "White", "Navy"] },
    prices: { eur: 22, usd: 24, gbp: 19, chf: 22 },
    translations: {
      "el-GR": {
        title: "Καπέλο από καμβά",
        description: "Καπέλο έξι τμημάτων από πλυμένο καμβά με ρυθμιζόμενο λουράκι.",
      },
      "de-DE": {
        title: "Canvas-Kappe",
        description: "Eine sechsteilige Kappe aus gewaschenem Canvas mit verstellbarem Riemen.",
      },
      "fr-FR": {
        title: "Casquette en toile",
        description: "Une casquette à six panneaux en toile délavée, avec sangle réglable.",
      },
    },
  },
  {
    handle: "demo-tote-bag",
    title: "Everyday Tote Bag",
    description: "A sturdy cotton tote that carries the weekly shop.",
    category: "accessories",
    collection: "everyday-basics",
    options: { Color: ["Black", "White"] },
    prices: { eur: 18, usd: 20, gbp: 16, chf: 18 },
    translations: {
      "el-GR": {
        title: "Τσάντα tote Everyday",
        description: "Ανθεκτική βαμβακερή τσάντα που αντέχει τα καθημερινά ψώνια.",
      },
      "de-DE": {
        title: "Everyday-Tragetasche",
        description: "Eine robuste Baumwolltasche für den Wocheneinkauf.",
      },
      "fr-FR": {
        title: "Sac cabas Everyday",
        description: "Un solide sac en coton pour les courses de la semaine.",
      },
    },
  },
  {
    handle: "demo-ceramic-mug",
    title: "Ceramic Mug",
    description: "A hand-glazed ceramic mug that holds 350 ml.",
    category: "home",
    collection: "everyday-basics",
    options: { Color: ["White", "Black"] },
    prices: { eur: 14, usd: 16, gbp: 12, chf: 14 },
    translations: {
      "el-GR": {
        title: "Κεραμική κούπα",
        description: "Κεραμική κούπα με χειροποίητη υαλωτή επικάλυψη, χωρητικότητας 350 ml.",
      },
      "de-DE": {
        title: "Keramiktasse",
        description: "Eine handglasierte Keramiktasse mit 350 ml Fassungsvermögen.",
      },
      "fr-FR": {
        title: "Tasse en céramique",
        description: "Une tasse en céramique émaillée à la main, d'une contenance de 350 ml.",
      },
    },
  },
  {
    handle: "demo-dotted-notebook",
    title: "Dotted Notebook",
    description: "A softcover notebook with 120 dotted pages.",
    category: "home",
    collection: "summer-edit",
    options: { Color: ["Black", "Navy"] },
    prices: { eur: 12, usd: 14, gbp: 10, chf: 12 },
    translations: {
      "el-GR": {
        title: "Σημειωματάριο με τελείες",
        description: "Σημειωματάριο με μαλακό εξώφυλλο και 120 σελίδες με τελείες.",
      },
      "de-DE": {
        title: "Notizbuch gepunktet",
        description: "Ein Notizbuch mit Softcover und 120 gepunkteten Seiten.",
      },
      "fr-FR": {
        title: "Carnet pointé",
        description: "Un carnet à couverture souple de 120 pages pointées.",
      },
    },
  },
];

export type DemoVariant = {
  title: string;
  sku: string;
  options: Record<string, string>;
  manage_inventory: false;
  prices: { currency_code: SupportedCurrency; amount: number }[];
};

/**
 * One variant per combination of the product's option values. The title is the
 * values joined with " / " in option order (what Medusa's own demo data does)
 * and the SKU derives from the handle, so both are stable between runs.
 *
 * Variants don't track stock (`manage_inventory: false`): there are no
 * inventory levels, so a cart can add them without a stock location holding any.
 */
export function buildVariants(product: DemoProduct): DemoVariant[] {
  let combinations: Record<string, string>[] = [{}];

  for (const [option, values] of Object.entries(product.options)) {
    combinations = combinations.flatMap((combination) =>
      values.map((value) => ({ ...combination, [option]: value })),
    );
  }

  const currencies = Object.keys(product.prices) as SupportedCurrency[];

  return combinations.map((options) => {
    const values = Object.values(options);

    return {
      title: values.join(" / "),
      sku: [product.handle, ...values].join("-").toUpperCase(),
      options,
      manage_inventory: false,
      prices: currencies.map((currency_code) => ({
        currency_code,
        amount: product.prices[currency_code],
      })),
    };
  });
}
