// Ours (T37, SETUP.md "Listing organisms (T37)"; D41, D44, D45, D46). The stories of ProductGrid,
// ProductCarousel and CompareTray. Sample data is `commerceFixtures[ctx.locale].listing` (the twelve
// cards in a grid, the carousel's eight, the three trays and the empty listing), the copy is
// `catalogs[ctx.locale]`, and the locale every `Intl` call uses is the market's `<html lang>`. Every
// link is drawn with `prefetch={false}`: the shop's pages answer 404 until M3.
//
// The grid and the carousel are server components and are drawn as a shop would draw them. Their
// headings sit one level under the page's: the live render is under the section's `h2`, so its
// titles are `h3` (the carousel's own heading and the grid's cards), and a state is under its own
// `h3` label, so its titles are one level deeper.
//
// Landmarks are named apart. A carousel's region is named by its heading and a grid's list by the
// catalog, and a page of states would have several named alike, which confuses a screen-reader
// user, so each state's name carries its label in brackets (`wordsFor` for the grid and the tray, the
// carousel's title for the carousel), as the headers' and the banners' do. The live render keeps the
// catalog's own name.
//
// CompareTray is `position: fixed`, so every tray is drawn in an `OverlayBox` (D45), which is a
// containing block for fixed boxes and clips what spills out. The states are pictures: they give
// the tray its products and no handlers, so a click does nothing. The live render is the real
// thing, with its products in state (`CompareTrayDemo`): the remove buttons and "Remove all" work,
// the tray goes with the last product, and a button brings them back. In a shop the tray is per
// visitor (D44) and is drawn after hydration from the visitor store (M5); the DS draws it with its
// products from the first render. The reservation of the tray's height at the end of the page
// (WCAG 2.4.11) is the organism's own and runs here as it does in a shop, so this page ends with
// the height of its tallest tray in blank space.
//
// Each box is taller than the tray at 375 px in the longest language (the heights are measured, see
// the constants below), so nothing is cut.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { CompareTray as CompareTrayContent } from "@shopblok/registry/contracts";
import { CompareTray, type CompareTrayProps } from "@shopblok/ui/organisms/compare-tray";
import {
  ProductCarousel,
  type ProductCarouselProps,
} from "@shopblok/ui/organisms/product-carousel";
import { ProductGrid, type ProductGridProps } from "@shopblok/ui/organisms/product-grid";
import { CompareTrayDemo } from "../components/compare-tray-demo";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const messages = (ctx: DsContext) => catalogs[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

// --- ProductGrid ---

/** The grid's words and the cards': the catalog's, with the list's name for one state if given. */
function gridCopy(ctx: DsContext, state?: string): ProductGridProps["copy"] {
  const { molecules, organisms } = messages(ctx);
  const label = organisms.productGrid.label;
  return {
    card: molecules.productCard,
    priceBlock: molecules.priceBlock,
    grid: { label: state === undefined ? label : `${label} (${state})` },
  };
}

/** The twelve cards of the listing's fixture. */
const gridFixture = (ctx: DsContext) => fixtures(ctx).listing.grid;

/** The first few products, as a state shows them. */
const first = (ctx: DsContext, count: number) => gridFixture(ctx).products.products.slice(0, count);

/** One state of the grid: the fixture's grid with what the state changes. */
function gridState(spec: {
  id: string;
  label: string;
  description: string;
  /** What the state changes: the products, the variant, the layout, the quick-add form. */
  props: (ctx: DsContext) => Partial<ProductGridProps>;
}): DsState {
  const { id, label, description, props } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <ProductGrid
        {...gridFixture(ctx).products}
        copy={gridCopy(ctx, label)}
        locale={lang(ctx)}
        heading="h4"
        emptyHeading={4}
        prefetch={false}
        {...props(ctx)}
      />
    ),
  };
}

const productGridStates: readonly DsState[] = [
  gridState({
    id: "grid",
    label: "Grid, eight products",
    description:
      "Two columns under 768 px, three from 768 px and four from 1024 px, the columns of the loading skeleton, so nothing moves when the cards arrive. The cards are the standard variant.",
    props: (ctx) => ({ products: first(ctx, 8) }),
  }),
  gridState({
    id: "list",
    label: "List layout",
    description:
      "One card to a row, drawn as the horizontal card whatever the variant is: a narrow picture with the text beside it, and a rule between the rows.",
    props: (ctx) => ({ products: first(ctx, 5), layout: "list" }),
  }),
  gridState({
    id: "swatches",
    label: "Swatches variant",
    description:
      "The shop picked the swatches card: each card shows its colours as discs under the picture.",
    props: (ctx) => ({ products: first(ctx, 4), variant: "swatches" }),
  }),
  gridState({
    id: "quick-add",
    label: "Quick add variant, with statuses",
    description:
      "An add-to-cart form under each card. The first is idle, the second is adding, the third has been added and the fourth failed; the grid passes the form's action once and the status by product.",
    props: (ctx) => {
      const [, adding, added, failed] = first(ctx, 4);
      return {
        products: first(ctx, 4),
        variant: "quick-add",
        quickAdd: {
          action: fixtures(ctx).listing.filters.action,
          status: {
            [adding?.id ?? ""]: "adding",
            [added?.id ?? ""]: "added",
            [failed?.id ?? ""]: "error",
          },
        },
      };
    },
  }),
  gridState({
    id: "editorial",
    label: "Editorial variant",
    description: "The taller, editorial card: the picture is the main thing and the words are few.",
    props: (ctx) => ({ products: first(ctx, 4), variant: "editorial" }),
  }),
  gridState({
    id: "few",
    label: "Few products",
    description:
      "Three products: the last row is not filled, and every card is the same size as in a full grid.",
    props: (ctx) => ({ products: first(ctx, 3) }),
  }),
  gridState({
    id: "long-titles",
    label: "Long titles",
    description:
      "A product whose title is the longest the shop's copy allows, among three others: the card's own two-line title clamp is the one place text is cut, and the full title is the link's name and its tooltip.",
    props: (ctx) => ({ products: [fixtures(ctx).long.product, ...first(ctx, 3)] }),
  }),
  gridState({
    id: "empty",
    label: "No products",
    description:
      "The empty state with the contract's title, text and the way out. No list is drawn, since an empty list is a list of nothing.",
    props: (ctx) => ({ ...gridFixture(ctx).empty }),
  }),
];

// --- ProductCarousel ---

/** The carousel's words and the cards': the catalog's. */
function carouselCopy(ctx: DsContext): ProductCarouselProps["copy"] {
  const { molecules, organisms } = messages(ctx);
  return {
    card: molecules.productCard,
    priceBlock: molecules.priceBlock,
    carousel: organisms.productCarousel,
  };
}

/** One state of the carousel; its title carries the state's label so that its region is named apart. */
function carouselState(spec: {
  id: string;
  label: string;
  description: string;
  /** What the state changes: the products, the variant, the link to the listing. */
  props?: (ctx: DsContext) => Partial<ProductCarouselProps>;
}): DsState {
  const { id, label, description, props = () => ({}) } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => {
      const content = { ...fixtures(ctx).listing.carousel, ...props(ctx) };
      return (
        <ProductCarousel
          {...content}
          title={`${content.title} (${label})`}
          copy={carouselCopy(ctx)}
          locale={lang(ctx)}
          headingLevel={4}
          prefetch={false}
        />
      );
    },
  };
}

const productCarouselStates: readonly DsState[] = [
  carouselState({
    id: "standard",
    label: "Standard",
    description:
      "Eight cards with the link to the whole listing and the two buttons in the heading row. Two cards and a part of the third under 768 px, three from 768 px and four from 1024 px; Previous is off at the start.",
  }),
  carouselState({
    id: "no-view-all",
    label: "No link to the listing",
    description: "The heading and the two buttons alone, for a row that has no page of its own.",
    props: () => ({ viewAll: undefined }),
  }),
  carouselState({
    id: "few",
    label: "Few products",
    description:
      "Three products: from 1024 px they all fit, so both buttons are off and the row does not move. Under 768 px it still scrolls.",
    props: (ctx) => ({ products: first(ctx, 3) }),
  }),
  carouselState({
    id: "long-titles",
    label: "Long titles",
    description:
      "A heading and a first card with the longest titles the shop's copy allows: the heading wraps and the buttons keep their size, and the card's two-line clamp is the one place text is cut.",
    props: (ctx) => ({
      title: fixtures(ctx).long.product.title,
      products: [fixtures(ctx).long.product, ...first(ctx, 5)],
    }),
  }),
  carouselState({
    id: "quick-add",
    label: "Quick add variant",
    description:
      "The cards with an add-to-cart form under each. The second is adding and the third has been added.",
    props: (ctx) => {
      const [, adding, added] = first(ctx, 3);
      return {
        variant: "quick-add",
        quickAdd: {
          action: fixtures(ctx).listing.filters.action,
          status: { [adding?.id ?? ""]: "adding", [added?.id ?? ""]: "added" },
        },
      };
    },
  }),
];

// --- CompareTray ---

// The heights were measured in Chromium (Inter, the storefront's stylesheet) in en, el, de and fr at
// 375, 768 and 1440 px: a tray of one to four products is at most 396 px tall (Greek at 375 px), and
// one whose first title is the longest the copy allows is at most 610 px tall (German at 375 px,
// where the cells are 5 rem wide). A box is the tray and a strip of the "page" above it.
/** The box a state's tray is drawn in: the tallest ordinary tray and a strip of 64 px. */
const TRAY_BOX = 460;
/** The box of the long-titles state: the tallest tray, with room above it. */
const LONG_TRAY_BOX = 660;
/** The live render's box: as tall as an ordinary state's, with the page's strip and its button above the tray. */
const LIVE_BOX = 460;

/**
 * The tray's own cap is 60 % of the window's height (`dvh`), which means nothing inside a box: the
 * cap here is the box's, less 2 rem, so a tray never spills out of its box and, taller than that,
 * scrolls inside itself as it does in a short window.
 */
const cappedTray = "max-h-[calc(100%-2rem)]";

/** The tray's words: the catalog's. */
const trayCopy = (ctx: DsContext): CompareTrayProps["copy"] => messages(ctx).organisms.compareTray;

/** The tray's words with its region named for one state, in brackets. */
function wordsFor(ctx: DsContext, state: string): CompareTrayProps["copy"] {
  const words = trayCopy(ctx);
  return { ...words, region: `${words.region} (${state})` };
}

/** One state of the tray: a picture in a box of its own, with no handlers. */
function trayState(spec: {
  id: string;
  label: string;
  description: string;
  tray: (ctx: DsContext) => CompareTrayContent;
  /** The box's height. */
  height?: number;
}): DsState {
  const { id, label, description, tray, height = TRAY_BOX } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <OverlayBox name={label} height={height}>
        <CompareTray
          {...tray(ctx)}
          copy={wordsFor(ctx, label)}
          locale={lang(ctx)}
          prefetch={false}
          className={cappedTray}
        />
      </OverlayBox>
    ),
  };
}

const compareTrayStates: readonly DsState[] = [
  trayState({
    id: "one",
    label: "One product",
    description:
      "One product chosen: three empty places, the count, and a line that says one more is needed in place of the compare link.",
    tray: (ctx) => fixtures(ctx).listing.compare.one,
  }),
  trayState({
    id: "three",
    label: "Three products",
    description:
      "Three of four places taken: one empty place, the count and the compare link, which is the primary button.",
    tray: (ctx) => fixtures(ctx).listing.compare.three,
  }),
  trayState({
    id: "full",
    label: "Four products, full",
    description:
      "Every place taken: no empty slot. The fifth product cannot be added until one is removed.",
    tray: (ctx) => fixtures(ctx).listing.compare.full,
  }),
  trayState({
    id: "long-titles",
    label: "Long titles",
    description:
      "Three products, the first with the longest title the shop's copy allows: titles wrap at any width and are never cut, and the remove button's name carries the whole title.",
    tray: (ctx) => {
      const three = fixtures(ctx).listing.compare.three;
      const [head, ...rest] = three.items;
      return {
        ...three,
        items:
          head === undefined
            ? rest
            : [{ ...head, title: fixtures(ctx).long.product.title }, ...rest],
      };
    },
    height: LONG_TRAY_BOX,
  }),
];

export const productListOrganismStories = {
  "organisms/product-grid": {
    summary:
      "A listing's products as a list of cards, in a grid or one to a row, in the look the shop picked, or the empty state when there are none.",
    a11y: [
      "The products are a list named “Products”, with one item for each card, so a screen reader says how many there are and a crawler finds a list. The cards are articles with one link each, and their titles are headings: h3 unless the page says otherwise, so a listing under an h2 has no gap in its outline.",
      "Each card keeps the rules of the product card: one link whose name is the product's title, a picture that is decoration, and a price that says whether it is a sale. A quick-add form is outside the link and above its stretched area, so nothing is nested, and a status such as “Added to cart” is announced politely by the card.",
      "The grid is two columns under 768 px, three from 768 px and four from 1024 px, the loading skeleton's columns, so the skeleton and the cards line up and the layout does not shift when they arrive.",
      "The list layout is one card to a row, the horizontal card whatever the variant is: its 96 px picture and the text beside it read as a row, with a rule between the rows. Every link is at least 44 px high.",
      "With no products the list is not drawn: the empty state has a heading that says what happened, a sentence that says what to do, and a link that does it, and the icon is decoration. A screen reader hears that there is nothing to list and not a list of zero.",
      "Long titles wrap in every language, and the card's own two-line clamp is the one place text is cut: the clamped title keeps its full text as the link's name and as a tooltip, and is marked so the design system's check knows the cut is on purpose. Nothing scrolls sideways at 375 px.",
    ],
    live: (ctx) => (
      <ProductGrid
        {...gridFixture(ctx).products}
        copy={gridCopy(ctx)}
        locale={lang(ctx)}
        heading="h3"
        prefetch={false}
      />
    ),
    states: productGridStates,
    statesLayout: "stack",
  },
  "organisms/product-carousel": {
    summary:
      "A row of product cards under a heading that moves sideways, with a link to the whole listing and previous and next buttons; it never moves by itself.",
    a11y: [
      "The carousel is one region named by its heading and called a “carousel” by a screen reader, as the WAI-ARIA pattern has it, and each card is a slide named by its place, such as “3 of 8”. Every slide stays in the reading order, in view or not, so a screen-reader user can read the whole row and Tab reaches every link.",
      "It never moves on its own, in any setting: there is no autoplay and so no pause button to look for (WCAG 2.2.2). The row moves when the visitor presses a button, uses the left and right arrow keys inside the carousel, swipes or drags, or tabs into a card that is out of view, which brings it into view.",
      "The buttons are 44 px, sit in the heading row inside the carousel's box and are named “Previous products” and “Next products”. At the end of the row the button that cannot move is dimmed and marked aria-disabled but stays focusable, so a keyboard user who pressed Next to the end does not lose their place.",
      "After the visitor moves the row, a polite live region says which products are in view, such as “Showing 5 to 8 of 8”, once the movement has settled and always the last position when the visitor presses more than once. It says nothing when the page loads, so a page with several carousels does not talk over itself.",
      "Under reduced motion the buttons and keys jump to the next cards instead of gliding, and the only things that move are the ones the visitor started: a swipe still glides to a stop on a card, with the momentum the visitor gave it.",
      "About two cards are in view under 768 px, with a part of the third showing to say the row scrolls, three from 768 px and four from 1024 px. The row scrolls sideways inside its own box and the page never does, and a card's focus ring is never cut by the edge of the box.",
    ],
    live: (ctx) => (
      <ProductCarousel
        {...fixtures(ctx).listing.carousel}
        copy={carouselCopy(ctx)}
        locale={lang(ctx)}
        headingLevel={3}
        prefetch={false}
      />
    ),
    states: productCarouselStates,
    statesLayout: "stack",
  },
  "organisms/compare-tray": {
    summary:
      "The products a visitor has chosen to compare, in a tray fixed to the bottom of the window: each with a picture, a link and a remove button, the places left, and the link to the comparison once two are chosen.",
    a11y: [
      "The tray is a region named “Compare products” and not a dialog on purpose: it appears under the reader's hands, so it takes no focus, it does not hide the page behind it and it traps nothing. It is per visitor (D44), so a prerendered page cannot hold it: the browser draws it once it has the visitor's products, and with none nothing is drawn.",
      "Each product is one link, its picture (decoration, since the title is beside it) and its title, and a separate remove button named “Remove” with the product's title, so four buttons are four things and no control sits inside the link. The empty places are decoration and are hidden from assistive technology.",
      "How many are chosen, and how many more are needed, are one polite live region, so a removal or an addition is said (WCAG 4.1.3). The compare link is there from two products on; before that a line says how many more to choose, as text, in its place, rather than a link that goes nowhere.",
      "After a removal focus goes to the next product's remove button, or the previous one's when the last product went, and when it was the only one, or “Remove all” was pressed, to the control that follows the tray, where the next Tab would have gone. Focus is never dropped on the page's start.",
      "WCAG 2.4.11 (Focus Not Obscured): the tray is fixed to the bottom of the window, so while it is shown its height is reserved at the end of the page, as padding and as scroll padding on the root element, and measured again whenever the tray changes size. A control the reader tabs to is scrolled clear of the tray, and the page's last links can scroll above it. Here the trays sit in boxes, but the reservation is the real one, so this page ends with some blank space.",
      "Every button and link is at least 44 px. The titles wrap in every language and are never cut, and the cells shrink to fit rather than widen the page: four products fit in a row at 375 px. A tray taller than 60 % of the window scrolls inside itself rather than cover a short window or a page zoomed to 400 %, and it keeps clear of a phone's home indicator.",
    ],
    live: (ctx) => (
      <OverlayBox name={trayCopy(ctx).region} height={LIVE_BOX}>
        <CompareTrayDemo
          chosen={fixtures(ctx).listing.compare.three.items}
          max={fixtures(ctx).listing.compare.three.max}
          compareHref={fixtures(ctx).listing.compare.three.compareHref}
          copy={trayCopy(ctx)}
          locale={lang(ctx)}
          prefetch={false}
          className={cappedTray}
          resetLabel="Choose the three products again"
          note="The page behind the tray stays usable. Remove a product, or all of them, and the tray follows; this button brings them back."
        />
      </OverlayBox>
    ),
    states: compareTrayStates,
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
