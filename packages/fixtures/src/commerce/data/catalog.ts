import type { RatingOverview, Stock } from "@shopblok/registry/contracts";
import type { ImageRatio } from "../images";

// What the four locales share about the catalog: ids, handles, image seeds, stock, ratings and
// the prices per currency. Names, descriptions and every other word are the locale's (copy/).

/** The currencies of the DS markets (D33). */
export type Currency = "EUR" | "USD" | "CHF";

/** An amount in each currency, in major units: round numbers, written by hand, never converted. */
export type Prices = Record<Currency, number>;

/**
 * The colours the catalog uses. Black, oatmeal, forest, sky and brick are the five of
 * `design-system.ts`, whose names the fixtures reuse (the context checks the hex values agree).
 */
export const palette = {
  black: "#111111",
  oatmeal: "#d9cdb8",
  forest: "#2f5d3a",
  sky: "#8ec5ea",
  brick: "#a4452c",
  white: "#f4f1ea",
  charcoal: "#3b3d40",
  navy: "#1f2f4a",
  olive: "#6b6b3a",
  rust: "#b5602d",
  burgundy: "#6e2433",
  sand: "#c4ad84",
} as const;

export type ColourKey = keyof typeof palette;

/** The design system's colours, in the order of its `colours` list. */
export const designSystemColourKeys = ["black", "oatmeal", "forest", "sky", "brick"] as const;

export type ProductHandle =
  | "heritage-hoodie"
  | "relaxed-fit-zip-hoodie"
  | "brushed-fleece-hoodie"
  | "garment-dyed-hoodie"
  | "essential-tee"
  | "fisherman-knit-sweater"
  | "canvas-tote-bag"
  | "organic-cotton-cap"
  | "merino-ankle-socks"
  | "tapered-chino-trousers"
  | "waxed-field-jacket"
  | "ribbed-merino-turtleneck";

export type BadgeKind = "sale" | "new" | "bestseller" | "custom";

export type ProductSpec = {
  id: string;
  handle: ProductHandle;
  /** The price, or the lowest of the variants' when `varies`. */
  prices: Prices;
  /** What the price replaces on a sale. */
  compareAt?: Prices;
  varies?: boolean;
  badges: BadgeKind[];
  colours: { key: ColourKey; available: boolean }[];
  /** How many sizes each colour comes in (1: one size). */
  sizes: number;
  stock: Stock;
  rating?: RatingOverview;
  /** One or two: the second is the hover image. */
  images: { seed: number; ratio: ImageRatio }[];
};

const colours = (...keys: ColourKey[]): ProductSpec["colours"] =>
  keys.map((key) => ({ key, available: true }));

const unavailable = (...keys: ColourKey[]): ProductSpec["colours"] =>
  keys.map((key) => ({ key, available: false }));

const inStock: Stock = { status: "in-stock" };

/**
 * Twelve products of a clothing and lifestyle shop. The first is the design system's Heritage
 * Hoodie; the first four are hoodies, so a search for "hoodie" returns them.
 */
export const productSpecs: ProductSpec[] = [
  {
    id: "prod_heritage_hoodie",
    handle: "heritage-hoodie",
    prices: { EUR: 59, USD: 64, CHF: 58 },
    badges: ["new"],
    colours: colours("black", "oatmeal", "forest", "sky"),
    sizes: 6,
    stock: inStock,
    rating: { average: 4.6, count: 128 },
    images: [
      { seed: 0, ratio: "3:4" },
      { seed: 4, ratio: "3:4" },
    ],
  },
  {
    // The long title (60+ characters in English): the card has to wrap or clamp it.
    id: "prod_relaxed_fit_zip_hoodie",
    handle: "relaxed-fit-zip-hoodie",
    prices: { EUR: 79, USD: 85, CHF: 77 },
    badges: [],
    colours: colours("charcoal", "oatmeal", "navy"),
    sizes: 5,
    stock: inStock,
    rating: { average: 4.4, count: 62 },
    images: [
      { seed: 6, ratio: "3:4" },
      { seed: 7, ratio: "3:4" },
    ],
  },
  {
    // On sale: compareAt, and the badge that goes with it.
    id: "prod_brushed_fleece_hoodie",
    handle: "brushed-fleece-hoodie",
    prices: { EUR: 49, USD: 54, CHF: 48 },
    compareAt: { EUR: 69, USD: 75, CHF: 67 },
    badges: ["sale"],
    colours: colours("forest", "sand", "charcoal", "brick"),
    sizes: 5,
    stock: inStock,
    rating: { average: 4.2, count: 215 },
    images: [
      { seed: 8, ratio: "3:4" },
      { seed: 9, ratio: "3:4" },
    ],
  },
  {
    // Sold out: every colour with it.
    id: "prod_garment_dyed_hoodie",
    handle: "garment-dyed-hoodie",
    prices: { EUR: 69, USD: 75, CHF: 67 },
    badges: [],
    colours: unavailable("olive", "rust", "black"),
    sizes: 5,
    stock: { status: "out", quantity: 0 },
    rating: { average: 4.7, count: 94 },
    images: [
      { seed: 10, ratio: "3:4" },
      { seed: 11, ratio: "3:4" },
    ],
  },
  {
    // Exactly ten swatches, one of them unavailable.
    id: "prod_essential_tee",
    handle: "essential-tee",
    prices: { EUR: 29, USD: 32, CHF: 29 },
    badges: ["bestseller"],
    colours: [
      ...colours("black", "white", "oatmeal", "charcoal", "navy", "forest", "olive", "rust"),
      ...unavailable("burgundy"),
      ...colours("sky"),
    ],
    sizes: 6,
    stock: inStock,
    rating: { average: 4.5, count: 412 },
    images: [
      { seed: 12, ratio: "3:4" },
      { seed: 13, ratio: "3:4" },
    ],
  },
  {
    id: "prod_fisherman_knit_sweater",
    handle: "fisherman-knit-sweater",
    prices: { EUR: 89, USD: 97, CHF: 87 },
    badges: [],
    colours: colours("oatmeal", "navy", "forest"),
    sizes: 5,
    stock: inStock,
    rating: { average: 4.8, count: 46 },
    images: [
      { seed: 14, ratio: "3:4" },
      { seed: 15, ratio: "3:4" },
    ],
  },
  {
    // The variants' prices differ (the large bag costs more): `prices` is the lowest, shown "from".
    id: "prod_canvas_tote_bag",
    handle: "canvas-tote-bag",
    prices: { EUR: 39, USD: 42, CHF: 38 },
    varies: true,
    badges: [],
    colours: colours("sand", "black"),
    sizes: 2,
    stock: inStock,
    rating: { average: 4.3, count: 71 },
    images: [
      { seed: 16, ratio: "1:1" },
      { seed: 17, ratio: "1:1" },
    ],
  },
  {
    // A merchant's own badge ("Limited edition"), and no reviews yet.
    id: "prod_organic_cotton_cap",
    handle: "organic-cotton-cap",
    prices: { EUR: 25, USD: 27, CHF: 24 },
    badges: ["custom"],
    colours: colours("black", "olive", "sand"),
    sizes: 1,
    stock: inStock,
    images: [{ seed: 18, ratio: "1:1" }],
  },
  {
    id: "prod_merino_ankle_socks",
    handle: "merino-ankle-socks",
    prices: { EUR: 18, USD: 20, CHF: 18 },
    badges: [],
    colours: colours("charcoal", "white", "navy", "black"),
    sizes: 3,
    stock: inStock,
    rating: { average: 4.8, count: 203 },
    images: [{ seed: 19, ratio: "1:1" }],
  },
  {
    id: "prod_tapered_chino_trousers",
    handle: "tapered-chino-trousers",
    prices: { EUR: 79, USD: 85, CHF: 77 },
    badges: [],
    colours: colours("sand", "olive", "navy"),
    sizes: 5,
    stock: inStock,
    rating: { average: 4.1, count: 33 },
    images: [
      { seed: 20, ratio: "3:4" },
      { seed: 21, ratio: "3:4" },
    ],
  },
  {
    // Few left: the card says how many.
    id: "prod_waxed_field_jacket",
    handle: "waxed-field-jacket",
    prices: { EUR: 149, USD: 165, CHF: 145 },
    badges: ["bestseller"],
    colours: colours("olive", "black"),
    sizes: 5,
    stock: { status: "low", quantity: 4 },
    rating: { average: 4.6, count: 51 },
    images: [
      { seed: 22, ratio: "3:4" },
      { seed: 23, ratio: "3:4" },
    ],
  },
  {
    id: "prod_ribbed_merino_turtleneck",
    handle: "ribbed-merino-turtleneck",
    prices: { EUR: 99, USD: 109, CHF: 96 },
    badges: ["new"],
    colours: colours("black", "oatmeal", "burgundy"),
    sizes: 5,
    stock: inStock,
    images: [{ seed: 24, ratio: "3:4" }],
  },
];

/** The product page of the first card: its colours, its sizes and which variants cannot be bought. */
export const hoodie = {
  colours: ["black", "oatmeal", "forest", "sky"] as const,
  sizes: ["XS", "S", "M", "L", "XL", "XXL"] as const,
  /** Sold out: XL in every colour (design-system.ts has XL unavailable too), and sky in XS and XXL. */
  unavailable: (colour: ColourKey, size: string): boolean =>
    size === "XL" || (colour === "sky" && (size === "XS" || size === "XXL")),
  /** Three left of this one. */
  low: { colour: "forest", size: "M", quantity: 3 },
  /** The gallery: the first for every variant, the others for the colour they show. */
  media: [
    { seed: 0, ratio: "3:4", colour: undefined },
    { seed: 1, ratio: "3:4", colour: "black" },
    { seed: 2, ratio: "3:4", colour: "oatmeal" },
    { seed: 3, ratio: "3:4", colour: "forest" },
  ] as const satisfies readonly {
    seed: number;
    ratio: ImageRatio;
    colour: ColourKey | undefined;
  }[],
  /** Where it sits in the tree: Women, Clothing, Hoodies. */
  category: ["women", "clothing", "hoodies"] as const,
};

export type CategoryHandle =
  | "women"
  | "men"
  | "accessories"
  | "clothing"
  | "bags"
  | "headwear"
  | "socks"
  | "hoodies"
  | "t-shirts"
  | "knitwear"
  | "jackets"
  | "trousers"
  | "totes"
  | "backpacks"
  | "caps"
  | "beanies"
  | "ankle-socks"
  | "crew-socks";

export type CategoryNode = { id: string; handle: CategoryHandle; children: CategoryNode[] };

type Branch = readonly [CategoryHandle, readonly (Branch | CategoryHandle)[]];

const clothingLeaves: CategoryHandle[] = ["hoodies", "t-shirts", "knitwear", "jackets", "trousers"];

// Three roots, three levels each. A handle repeats across roots (both have "hoodies"); the path of
// handles is what makes a category's URL unique.
const tree: Branch[] = [
  ["women", [["clothing", clothingLeaves]]],
  ["men", [["clothing", clothingLeaves]]],
  [
    "accessories",
    [
      ["bags", ["totes", "backpacks"]],
      ["headwear", ["caps", "beanies"]],
      ["socks", ["ankle-socks", "crew-socks"]],
    ],
  ],
];

function toNode(entry: Branch | CategoryHandle, parentId: string): CategoryNode {
  const [handle, children] = typeof entry === "string" ? ([entry, []] as const) : entry;
  const id = `${parentId}_${handle}`;
  return { id, handle, children: children.map((child) => toNode(child, id)) };
}

export const categoryTree: CategoryNode[] = tree.map((branch) => toNode(branch, "cat"));

/** The six reviews of the Heritage Hoodie: what does not change with the language. */
export const reviewMeta = [
  { id: "rev_01", rating: 5, createdAt: "2026-09-12T14:20:00.000Z", verified: true },
  { id: "rev_02", rating: 4, createdAt: "2026-08-30T09:41:00.000Z", verified: true },
  { id: "rev_03", rating: 5, createdAt: "2026-08-02T17:05:00.000Z", verified: true },
  { id: "rev_04", rating: 3, createdAt: "2026-07-18T11:12:00.000Z", verified: false },
  { id: "rev_05", rating: 2, createdAt: "2026-06-27T19:48:00.000Z", verified: true },
  { id: "rev_06", rating: 5, createdAt: "2026-05-14T08:30:00.000Z", verified: false },
] as const;

/** Its 128 ratings: 94 + 22 + 8 + 2 + 2, which average 4.59, shown as 4.6. */
export const ratingDistribution = [94, 22, 8, 2, 2] as const;

/** The listing's filters: what each option counts, and which are chosen. */
export const facetData = {
  categories: [
    { handle: "hoodies", count: 4, selected: true },
    { handle: "t-shirts", count: 1, selected: false },
    { handle: "knitwear", count: 2, selected: false },
    { handle: "jackets", count: 1, selected: false },
    { handle: "trousers", count: 1, selected: false },
    { handle: "totes", count: 1, selected: false },
    { handle: "caps", count: 1, selected: false },
    { handle: "ankle-socks", count: 1, selected: false },
  ] satisfies { handle: CategoryHandle; count: number; selected: boolean }[],
  colours: [
    { key: "black", count: 8, selected: true },
    { key: "white", count: 3, selected: false },
    { key: "oatmeal", count: 6, selected: false },
    { key: "charcoal", count: 4, selected: false },
    { key: "navy", count: 5, selected: false },
    { key: "forest", count: 5, selected: true },
    { key: "olive", count: 4, selected: false },
    { key: "sky", count: 2, selected: false },
  ] satisfies { key: ColourKey; count: number; selected: boolean }[],
  sizes: [
    { size: "XS", count: 5, selected: false },
    { size: "S", count: 9, selected: false },
    { size: "M", count: 11, selected: true },
    { size: "L", count: 10, selected: false },
    { size: "XL", count: 6, selected: false },
    { size: "XXL", count: 4, selected: false },
  ],
  /** The listing's cheapest and dearest price, and the range the visitor chose. */
  price: {
    EUR: { min: 0, max: 150, selected: { min: 20, max: 100 } },
    USD: { min: 0, max: 165, selected: { min: 22, max: 110 } },
    CHF: { min: 0, max: 150, selected: { min: 20, max: 100 } },
  } satisfies Record<
    Currency,
    { min: number; max: number; selected: { min: number; max: number } }
  >,
  inStock: { count: 11, selected: true },
  onSale: { count: 1, selected: false },
};

export function productSpec(handle: ProductHandle): ProductSpec {
  const spec = productSpecs.find((candidate) => candidate.handle === handle);
  if (spec === undefined) throw new Error(`There is no product ${handle} in the fixtures`);
  return spec;
}
