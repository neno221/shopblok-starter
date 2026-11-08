import { entries, type RegistryEntry } from "@shopblok/registry";

// T91 (M5's done-when, D110 item 5): one page's layout with every block variant the registry has,
// as Payload stores it (ids, not documents), for `variants.spec.ts`. Each block's content is
// written once, with every field one of its variants needs (the hero's second picture and
// collections, the product collection's picture, the promotion's end), and each variant is that
// content with its `variant` and its heading marked. The members come from the registry, so a
// variant added later is on the page by itself, and a block with no content here fails, named.

/** The documents the blocks point at: the seed's and the spec's upload. */
export type BlockIds = {
  picture: number;
  newsletter: number;
  contact: number;
  basics: number;
  summer: number;
  accessories: number;
  products: Record<"tee" | "hoodie" | "cap" | "mug", number>;
};

/** Every Sections entry that is a block's variant, in the registry's order (60 at M5's end). */
export const BLOCK_MEMBERS: readonly RegistryEntry[] = entries.filter(
  (entry) => entry.group === "sections" && entry.block !== undefined && entry.variant !== undefined,
);

const DAY = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const lexical = (text: string) => ({
  root: {
    type: "root",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: [
          { type: "text", version: 1, text, format: 0, detail: 0, mode: "normal", style: "" },
        ],
      },
    ],
  },
});

type Content = (variant: string, ids: BlockIds) => Record<string, unknown>;

/** Each block's content, for any of its variants. */
const CONTENT: Record<string, Content> = {
  richText: (variant) => ({ content: lexical(`Made to be worn for years · ${variant}.`) }),
  mediaWithText: (variant, ids) => ({
    media: ids.picture,
    imageSide: "start",
    heading: `The Heritage collection · ${variant}`,
    content: lexical("Heavyweight jersey and a lined hood."),
    links: [{ link: { type: "custom", url: "/store", label: `Shop the collection · ${variant}` } }],
  }),
  uspBar: () => ({
    items: [
      { icon: "delivery", title: "Free delivery", text: "On orders over $75" },
      { icon: "returns", title: "30-day returns" },
      { icon: "secure", title: "Secure checkout" },
    ],
  }),
  logoCloud: (variant, ids) => ({
    heading: `As seen in · ${variant}`,
    logos: [
      { name: "Northwind Weekly", image: ids.picture, url: "https://north.example" },
      { name: "Southside Daily", image: ids.picture },
    ],
  }),
  faq: (variant) => ({
    heading: `Questions · ${variant}`,
    items: [
      { question: `How long does delivery take (${variant})?`, answer: "Two to four days." },
      { question: `Can I return an item (${variant})?`, answer: "Yes, within 30 days." },
    ],
  }),
  testimonials: (variant) => ({
    heading: `What our customers say · ${variant}`,
    quotes: [
      { quote: "Soft and sturdy.", author: "Jordan P.", role: "Verified buyer", rating: 5 },
      { quote: "The best tee I own.", author: "Sam K.", rating: 4 },
      { quote: "Arrived in two days and fits as described.", author: "Alex M.", rating: 5 },
    ],
  }),
  // An embed: nothing is asked of YouTube before the play button is pressed (T63).
  video: (variant) => ({
    title: `How the hoodie is made · ${variant}`,
    source: "embed",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    caption: "Two minutes in the mill.",
  }),
  spacer: () => ({ size: "medium", divider: true }),
  hero: (variant, ids) => ({
    eyebrow: "New season",
    heading: `Autumn is here · ${variant}`,
    subheading: "Warm layers for cooler days.",
    media: ids.picture,
    secondMedia: ids.picture,
    collections: [
      { collection: ids.basics, media: ids.picture },
      { collection: ids.summer, media: ids.picture },
    ],
    links: [{ link: { type: "custom", url: "/store", label: `Shop now · ${variant}` } }],
    productSource: {
      mode: "handpicked",
      products: [ids.products.hoodie, ids.products.tee, ids.products.cap, ids.products.mug],
    },
  }),
  categoryShowcase: (variant) => ({
    heading: `Shop by category · ${variant}`,
    categorySource: { mode: "topLevel", limit: 6 },
  }),
  productCollection: (variant, ids) => ({
    heading: `New in · ${variant}`,
    display: "grid",
    productSource: { mode: "newest", limit: 5 },
    media: ids.picture,
    ...(variant === "tabs"
      ? {
          tabs: [
            { label: "Basics", productSource: { mode: "collection", collection: ids.basics } },
            { label: "Summer", productSource: { mode: "collection", collection: ids.summer } },
            {
              label: "Accessories",
              productSource: { mode: "category", category: ids.accessories },
            },
          ],
        }
      : {}),
  }),
  featuredProduct: (variant, ids) => ({
    heading: `Product of the month · ${variant}`,
    product: ids.products.hoodie,
    text: "Heavyweight jersey and a lined hood.",
  }),
  bundle: (variant, ids) => ({
    heading: `Better together · ${variant}`,
    products: [ids.products.tee, ids.products.cap, ids.products.mug],
  }),
  promoBanner: (variant, ids) => ({
    heading: `Ten percent off · ${variant}`,
    text: "On your first order.",
    code: "WELCOME10",
    terms: "One use per order.",
    endsAt: inDays(3),
    media: ids.picture,
  }),
  comparison: (variant, ids) => ({
    heading: `Compare · ${variant}`,
    products: [ids.products.tee, ids.products.hoodie],
    showOptions: true,
    pick: ids.products.hoodie,
  }),
  collectionSpotlight: (_, ids) => ({ collection: ids.summer, limit: 2, sort: "newest" }),
  recentlyViewed: (variant) => ({ heading: `You looked at · ${variant}` }),
  newsletter: (variant, ids) => ({
    heading: `Letters from the mill · ${variant}`,
    text: "One e-mail a month.",
    media: ids.picture,
    form: ids.newsletter,
    privacy: { type: "custom", url: "/privacy" },
  }),
  formBlock: (variant, ids) => ({
    heading: `Write to us · ${variant}`,
    intro: "We answer within a day.",
    form: ids.contact,
  }),
  // The seed's two posts at least (`seed-content`).
  editorialList: (variant) => ({
    heading: `From the journal · ${variant}`,
    source: "newest",
    limit: 3,
  }),
};

/** The layout: one block per member of `BLOCK_MEMBERS`, in its order. */
export function everyBlockLayout(ids: BlockIds): Record<string, unknown>[] {
  return BLOCK_MEMBERS.map((entry) => {
    const block = entry.block ?? "";
    const content = CONTENT[block];
    if (content === undefined)
      throw new Error(`every-block.ts has no content for the block "${block}" (${entry.id})`);
    return { blockType: block, variant: entry.variant, ...content(entry.variant ?? "", ids) };
  });
}
