import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import type { EntryId } from "@shopblok/registry";
import { PriceBlock, type PriceBlockProps } from "@shopblok/ui/molecules/price-block";
import { ProductCardBordered } from "@shopblok/ui/molecules/product-card/bordered";
import { ProductCardCompact } from "@shopblok/ui/molecules/product-card/compact";
import { ProductCardEditorial } from "@shopblok/ui/molecules/product-card/editorial";
import { ProductCardHorizontal } from "@shopblok/ui/molecules/product-card/horizontal";
import { ProductCardImageSwap } from "@shopblok/ui/molecules/product-card/image-swap";
import { ProductCardMinimal } from "@shopblok/ui/molecules/product-card/minimal";
import { ProductCardOverlay } from "@shopblok/ui/molecules/product-card/overlay";
import type { ProductCardProps } from "@shopblok/ui/molecules/product-card/parts";
import { ProductCardQuickAdd } from "@shopblok/ui/molecules/product-card/quick-add";
import { ProductCardStandard } from "@shopblok/ui/molecules/product-card/standard";
import { ProductCardSwatches } from "@shopblok/ui/molecules/product-card/swatches";
import type { ReactNode } from "react";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of PriceBlock and ProductCard's ten variants (T32, SETUP.md "Product molecules
// (T32)"). Sample data is `commerceFixtures[ctx.locale]`, copy is `catalogs[ctx.locale].molecules`,
// and the locale of every format is the market's `<html lang>`. A card is drawn in a box of a grid
// column's width, with the `sizes` that column would have; the live render is a row of four cards in
// the grid a shop would put them in (two columns on a phone, four from 768 px).

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;
const messages = (ctx: DsContext) => catalogs[ctx.locale].molecules;

/** The fixture product with this handle. */
function product(ctx: DsContext, handle: string): ProductCard {
  const found = fixtures(ctx).products.find((candidate) => candidate.handle === handle);
  if (found === undefined) throw new Error(`The ${ctx.locale} fixtures have no product ${handle}`);
  return found;
}

// --- PriceBlock ------------------------------------------------------------------------------

const priceBlock = (
  ctx: DsContext,
  price: ProductCard["price"],
  props: Pick<PriceBlockProps, "size" | "tax"> = {},
): ReactNode => (
  <PriceBlock price={price} copy={messages(ctx).priceBlock} locale={lang(ctx)} {...props} />
);

const priceBlockStory = {
  summary:
    "A product's price: the sale price with the original struck through, a starting price, and a tax note.",
  a11y: [
    "A sale is the sale price and the struck-through original, each with a visually hidden label (WCAG 1.4.1): colour and a line alone do not say which is which.",
    '"From {price}" is an ICU message with the formatted price as its argument, so a language can put the word after the price; the word is visible text, not only a hidden label.',
    "The tax note is a line of text under the price (`included` or `excluded`), not a colour or an icon.",
    "Amounts are in major units, formatted by formatMoney (Intl) for the market; the price tokens are each at least 4.5:1 on the background (D35).",
  ],
  live: (ctx) => (
    <div className="flex flex-col items-start gap-4">
      {priceBlock(ctx, product(ctx, "heritage-hoodie").price, { tax: "included" })}
      {priceBlock(ctx, product(ctx, "brushed-fleece-hoodie").price, { tax: "included" })}
      {priceBlock(ctx, product(ctx, "canvas-tote-bag").price, { tax: "included" })}
    </div>
  ),
  states: [
    {
      id: "regular",
      label: "Regular",
      render: (ctx) => priceBlock(ctx, product(ctx, "heritage-hoodie").price),
    },
    {
      id: "sale",
      label: "Sale",
      description: "The sale price, then the original struck through; each has a hidden label.",
      render: (ctx) => priceBlock(ctx, product(ctx, "brushed-fleece-hoodie").price),
    },
    {
      id: "from",
      label: "From",
      description: "The variants' prices differ: the lowest, after the word.",
      render: (ctx) => priceBlock(ctx, product(ctx, "canvas-tote-bag").price),
    },
    {
      id: "from-sale",
      label: "From, on sale",
      render: (ctx) =>
        priceBlock(ctx, {
          ...product(ctx, "brushed-fleece-hoodie").price,
          varies: true,
        }),
    },
    {
      id: "tax-included",
      label: "Tax included",
      render: (ctx) => priceBlock(ctx, product(ctx, "heritage-hoodie").price, { tax: "included" }),
    },
    {
      id: "tax-excluded",
      label: "Tax excluded",
      render: (ctx) => priceBlock(ctx, product(ctx, "heritage-hoodie").price, { tax: "excluded" }),
    },
    {
      id: "sizes",
      label: "Sizes",
      description: "Small, default and large, on sale.",
      render: (ctx) => (
        <div className="flex flex-col items-start gap-3">
          {(["sm", "default", "lg"] as const).map((size) => (
            <div key={size}>
              {priceBlock(ctx, product(ctx, "brushed-fleece-hoodie").price, { size })}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "long",
      label: "Long",
      description: "A starting price on sale, in the locale's longest words, large, with a note.",
      render: (ctx) =>
        priceBlock(ctx, fixtures(ctx).long.product.price, { size: "lg", tax: "excluded" }),
    },
  ],
} satisfies DsStory;

// --- ProductCard -----------------------------------------------------------------------------

type CardEnv = Pick<ProductCardProps, "product" | "copy" | "locale" | "sizes" | "prefetch">;

// `prefetch: false`: the product pages come in M3, so a prefetch of one would answer 404 and fail
// the cell's console check.
const env = (ctx: DsContext, card: ProductCard, sizes: string): CardEnv => ({
  product: card,
  copy: { card: messages(ctx).productCard, priceBlock: messages(ctx).priceBlock },
  locale: lang(ctx),
  sizes,
  prefetch: false,
});

/** What differs between the ten variants; the rest of a story is the same. */
type Variant = {
  summary: string;
  a11y: readonly string[];
  /** One card in `ctx`'s locale, with the `sizes` of the box it is drawn in. */
  card: (ctx: DsContext, product: ProductCard, sizes: string) => ReactNode;
  /** The box of a single state: a column of the grid the card is made for. */
  box: string;
  /** The `sizes` of that box. */
  sizes: string;
  /** The live render's grid, and the `sizes` of its columns. */
  grid: { className: string; sizes: string };
  /** The handles of the live render's cards. */
  live?: readonly string[];
  /** States only this variant has. */
  own?: () => readonly DsState[];
};

const liveHandles = [
  "heritage-hoodie",
  "brushed-fleece-hoodie",
  "essential-tee",
  "garment-dyed-hoodie",
] as const;

const phoneAndUp = "(min-width: 768px) 25vw, 50vw";

/** The states every card has, then the variant's own. */
function states(variant: Variant): DsState[] {
  const draw = (ctx: DsContext, card: ProductCard) => (
    <div className={variant.box}>{variant.card(ctx, card, variant.sizes)}</div>
  );
  const common: DsState[] = [
    {
      id: "default",
      label: "Default",
      description: "A new product with a rating.",
      render: (ctx) => draw(ctx, product(ctx, "heritage-hoodie")),
    },
    {
      id: "sale",
      label: "Sale",
      description: "The sale badge, the sale price and the struck-through original.",
      render: (ctx) => draw(ctx, product(ctx, "brushed-fleece-hoodie")),
    },
    {
      id: "sold-out",
      label: "Sold out",
      description: "The sold-out mark first, and the picture dimmed.",
      render: (ctx) => draw(ctx, product(ctx, "garment-dyed-hoodie")),
    },
    {
      id: "no-rating",
      label: "No rating",
      description: "A product with no reviews yet, and a badge of the merchant's own.",
      render: (ctx) => draw(ctx, product(ctx, "organic-cotton-cap")),
    },
    {
      id: "long-title",
      label: "Long title",
      description:
        "The locale's longest title, clamped by data-truncate; the link's name is the whole title.",
      render: (ctx) => draw(ctx, fixtures(ctx).long.product),
    },
  ];
  return [...common, ...(variant.own?.() ?? [])];
}

/** The live render: four cards in the grid a shop would put them in. */
function live(variant: Variant, ctx: DsContext): ReactNode {
  return (
    <div className={variant.grid.className}>
      {(variant.live ?? liveHandles).map((handle) => (
        <div key={handle} className="min-w-0">
          {variant.card(ctx, product(ctx, handle), variant.grid.sizes)}
        </div>
      ))}
    </div>
  );
}

function story(variant: Variant): DsStory {
  return {
    summary: variant.summary,
    a11y: variant.a11y,
    live: (ctx) => live(variant, ctx),
    states: states(variant),
  };
}

const gridOfFour = "grid grid-cols-2 gap-4 md:grid-cols-4";
const oneLink =
  "The card is one link: the title's, stretched over the whole card with a pseudo-element, so there is exactly one link per card and its name is the full title. Nothing interactive is nested in it (axe: nested-interactive).";
const clamp =
  "A long title is clamped to two lines on an element marked data-truncate (the only place the design-system job allows clipping); the full title stays the link's name, and the link is at least 44 px high (D32).";
const focus =
  "Tab reaches the link and Enter follows it. The focus ring is drawn around the whole card, at full strength (D35).";

const standard: Variant = {
  summary: "The everyday product card: a picture with badges, the title, the price and the rating.",
  a11y: [
    oneLink,
    clamp,
    focus,
    'Badges are text (sold out first, then sale, new, bestseller or the merchant\'s own; two at most), never colour alone. The rating is one image named "4.6 out of 5, 128 reviews".',
  ],
  card: (ctx, card, sizes) => <ProductCardStandard {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
  own: () => [
    {
      id: "from",
      label: "Starting price",
      description: 'The variants\' prices differ: "From" and the lowest.',
      render: (ctx) => (
        <div className="w-full max-w-xs">
          <ProductCardStandard {...env(ctx, product(ctx, "canvas-tote-bag"), "320px")} />
        </div>
      ),
    },
    {
      id: "heading",
      label: "Heading level",
      description: "The title as an h2, for a card outside a section's h2.",
      render: (ctx) => (
        <div className="w-full max-w-xs">
          <ProductCardStandard
            {...env(ctx, product(ctx, "heritage-hoodie"), "320px")}
            heading="h2"
          />
        </div>
      ),
    },
  ],
};

const swatches: Variant = {
  summary: "The standard card with the product's colours as small discs under the price.",
  a11y: [
    oneLink,
    clamp,
    focus,
    'The colours are a list named "Colors" (in the page\'s language), each disc with its name read out; a colour that is sold out says so after its name and is struck through. The discs are display only: a colour you can press belongs to the product page.',
    'More than five colours show four and "+6": the count is text, and a hidden "6 more colors" says what it means.',
  ],
  card: (ctx, card, sizes) => <ProductCardSwatches {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
  own: () => [
    {
      id: "ten-colours",
      label: "Ten colours",
      description: "Four discs and +6; one of the ten is sold out.",
      render: (ctx) => (
        <div className="w-full max-w-xs">
          <ProductCardSwatches {...env(ctx, product(ctx, "essential-tee"), "320px")} />
        </div>
      ),
    },
    {
      id: "unavailable-colour",
      label: "A colour sold out",
      description: "The third disc is struck through and its name says unavailable.",
      render: (ctx) => {
        const hoodie = product(ctx, "heritage-hoodie");
        const marked = {
          ...hoodie,
          swatches: hoodie.swatches.map((swatch, index) =>
            index === 2 ? { ...swatch, available: false } : swatch,
          ),
        };
        return (
          <div className="w-full max-w-xs">
            <ProductCardSwatches {...env(ctx, marked, "320px")} />
          </div>
        );
      },
    },
  ],
};

const quickAdd: Variant = {
  summary:
    "The standard card with an add-to-cart form below it: the product's id and a button whose action is a prop.",
  a11y: [
    oneLink,
    "The button is outside the link and above its stretched area, so it is its own control and nothing is nested. Tab reaches the link, then the button; Enter on either does its own thing.",
    'The visible text is "Add to cart", or "Choose options" when the product has more than one variant; the name adds the product\'s title after it, so the visible text stays inside the name (WCAG 2.5.3) and a list of buttons can be told apart.',
    'A sold-out product\'s button is disabled and says so. While adding, the button is aria-disabled with a spinner and submits nothing; "added" and the error are announced by a polite live region (WCAG 4.1.3).',
    "The button is 44 px high and as wide as the card (D32).",
  ],
  card: (ctx, card, sizes) => <ProductCardQuickAdd {...env(ctx, card, sizes)} action={card.href} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
  own: () => {
    const one = (ctx: DsContext) => ({
      ...product(ctx, "heritage-hoodie"),
      variantCount: 1,
      variantId: "var_heritage_hoodie_oatmeal_m",
    });
    const status = (
      id: string,
      label: string,
      description: string,
      value: "idle" | "adding" | "added" | "error",
    ): DsState => ({
      id,
      label,
      description,
      render: (ctx) => (
        <div className="w-full max-w-xs">
          <ProductCardQuickAdd
            {...env(ctx, one(ctx), "320px")}
            action={one(ctx).href}
            status={value}
          />
        </div>
      ),
    });
    return [
      status("add-to-cart", "One variant", "Add to cart: the product has one variant.", "idle"),
      status(
        "adding",
        "Adding",
        "A spinner; aria-disabled, and a plain button that submits nothing.",
        "adding",
      ),
      status(
        "added",
        "Added",
        'A check on the button, and "Added to cart" announced politely.',
        "added",
      ),
      status(
        "error",
        "Error",
        "The error is shown and announced; the button tries again.",
        "error",
      ),
    ];
  },
};

const overlay: Variant = {
  summary:
    "The title and the price over the bottom of a tall picture, on a panel of the page's background.",
  a11y: [
    oneLink,
    clamp,
    focus,
    "The panel is opaque (bg-background), so the picture cannot lower the contrast of the title (19.9:1) or the price tokens (6.4:1 or more).",
    "The picture and the panel share one grid cell, so the panel needs no position: a positioned panel would become the box the link is stretched over.",
  ],
  card: (ctx, card, sizes) => <ProductCardOverlay {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
};

const minimal: Variant = {
  summary:
    "A square picture, the title and the price, centred: nothing else but the sold-out mark.",
  a11y: [
    oneLink,
    clamp,
    focus,
    "A product that cannot be bought says so in every variant, so the sold-out mark stays here; the other badges and the rating are left out.",
  ],
  card: (ctx, card, sizes) => <ProductCardMinimal {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
};

const horizontal: Variant = {
  summary: "A narrow picture at the inline start and the text beside it, for a list one card wide.",
  a11y: [
    oneLink,
    clamp,
    focus,
    "The picture is a fixed 96 px so the text keeps the rest of the width; the badges go in the text column, where a long label can wrap.",
  ],
  card: (ctx, card, sizes) => <ProductCardHorizontal {...env(ctx, card, sizes)} />,
  box: "w-full max-w-sm",
  sizes: "96px",
  grid: { className: "flex max-w-md flex-col gap-4", sizes: "96px" },
  live: liveHandles.slice(0, 3),
};

const compact: Variant = {
  summary:
    "A small picture, a one-line title and a small price on a row: for suggestions and mini lists.",
  a11y: [
    oneLink,
    "The title is clamped to one line on an element marked data-truncate; the link's name is the whole title, and the link is 44 px high and covers the row.",
    focus,
    "Only the sold-out mark is kept of the badges, next to the price.",
  ],
  card: (ctx, card, sizes) => <ProductCardCompact {...env(ctx, card, sizes)} />,
  box: "w-full max-w-sm",
  sizes: "64px",
  grid: { className: "flex max-w-sm flex-col gap-3", sizes: "64px" },
};

const editorial: Variant = {
  summary: "A tall 2:3 picture and larger type, under a rule: for a lookbook or a featured row.",
  a11y: [
    oneLink,
    clamp,
    focus,
    "The title is 20 px semibold and the price large; both are tokens' sizes, and they wrap like any text at 200% zoom (WCAG 1.4.4).",
  ],
  card: (ctx, card, sizes) => <ProductCardEditorial {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: {
    className: "grid grid-cols-1 gap-6 md:grid-cols-3",
    sizes: "(min-width: 768px) 33vw, 100vw",
  },
  live: liveHandles.slice(0, 3),
};

const bordered: Variant = {
  summary: "The standard card inside a bordered, padded box on the card tokens.",
  a11y: [
    oneLink,
    clamp,
    focus,
    "The border is the card's own and the focus ring is drawn around the box, not around the title's text.",
  ],
  card: (ctx, card, sizes) => <ProductCardBordered {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
};

const imageSwap: Variant = {
  summary:
    "The standard card whose picture changes to the second image on hover and on keyboard focus.",
  a11y: [
    oneLink,
    clamp,
    "The swap is CSS only (group-hover and group-focus-within), so it needs no script; focus inside the card shows it for keyboard users. Under reduced motion the second picture is not drawn, and a touch screen, which has no hover, never shows it.",
    "The second picture is decoration (empty alt, hidden from assistive technology): the first one is the product's.",
    focus,
  ],
  card: (ctx, card, sizes) => <ProductCardImageSwap {...env(ctx, card, sizes)} />,
  box: "w-full max-w-xs",
  sizes: "320px",
  grid: { className: gridOfFour, sizes: phoneAndUp },
  own: () => [
    {
      id: "second-image",
      label: "Second image",
      description: "The second picture drawn as on hover (the page cannot hold a hover still).",
      render: (ctx) => (
        <div className="w-full max-w-xs">
          <ProductCardImageSwap {...env(ctx, product(ctx, "heritage-hoodie"), "320px")} swapped />
        </div>
      ),
    },
    {
      id: "one-image",
      label: "One image",
      description: "A product with one picture just shows it; there is nothing to swap to.",
      render: (ctx) => (
        <div className="w-full max-w-xs">
          <ProductCardImageSwap {...env(ctx, product(ctx, "merino-ankle-socks"), "320px")} />
        </div>
      ),
    },
  ],
};

export const productCardStories = {
  "molecules/price-block": priceBlockStory,
  "molecules/product-card-standard": story(standard),
  "molecules/product-card-swatches": story(swatches),
  "molecules/product-card-quick-add": story(quickAdd),
  "molecules/product-card-overlay": story(overlay),
  "molecules/product-card-minimal": story(minimal),
  "molecules/product-card-horizontal": story(horizontal),
  "molecules/product-card-compact": story(compact),
  "molecules/product-card-editorial": story(editorial),
  "molecules/product-card-bordered": story(bordered),
  "molecules/product-card-image-swap": story(imageSwap),
} satisfies Partial<Record<EntryId, DsStory>>;
