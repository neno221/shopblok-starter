// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D44, D45, D49). The stories of
// BuyBox, MobileStickyATC and QuickViewDialog. Sample data is `commerceFixtures[ctx.locale].productPage`
// (the Heritage Hoodie's buy box with nothing chosen, the colour only, a full choice, three left and a
// sold-out variant; the three bars; the size guide), the copy is `catalogs[ctx.locale]`, and the locale
// every `Intl` call uses is the market's `<html lang>`. Every link is drawn with `prefetch={false}`:
// the shop's pages answer 404 until M3.
//
// A story renders on the server (RSC) and all three components are client components, so what they
// are given is plain data: the contract's values and the catalog's words, never a function. The
// stories therefore pass no `action` and no `onSelectionChange`. A buy box without an action sends
// nothing, so pressing "Add to cart" in a ready state does nothing, and the checks cannot post by
// accident. The choice is still the component's own: a visitor can choose in the live render and see
// the price, the stock and the button follow. The one prop that is not plain data is the buy box's
// `sizeGuide`, which is a React element (SizeGuideDialog's trigger), as a page passes it.
//
// Ids and landmarks are named apart. A page of states has many buy boxes, bars and dialogs, and
// the sticky bar joins the buy box's form and links to its options by id, so every state takes ids
// of its own (`boxIds`: the form, the options and the button, with the state's id in them), and an id
// is never twice on a page. The states' landmark names carry the state's label in brackets
// (`wordsFor`), as the headers' and the banners' do; the live renders keep the catalog's own names.
// The buy box's title is an `h4` in a state (under the state's own `h3`) and an `h3` in the live
// render (under the section's `h2`); one state draws it at level 2, as the quick view does.
//
// MobileStickyATC and the open quick view are drawn in an `OverlayBox` (D45). The bar is `position:
// fixed`, which an `OverlayBox` makes relative to itself, and it is drawn with `forceVisible`: the
// bar appears only after the buy box's button has scrolled out of the window, and a story has no
// buy box to scroll past (the scroll trigger, the reserved height and the server's empty markup are
// the component's own tests'). The bar is capped to its box (`cappedBar`: the window's `dvh` means
// nothing inside a box). The quick view is drawn open with its own way of starting open
// (`defaultOpen`, `modal={false}`, so several fit on one page and the rest of the frame stays
// usable), capped to the box (`cappedDialog`) and still (`duration-0`): no state is a picture of an
// animation. Its live render is the trigger alone, which the interaction checks press.
//
// The buy box's reviews link points at an id the design system's page does not have, so pressing it
// does nothing here; a shop's ReviewsSection has that id.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  BuyBox as BuyBoxContent,
  MobileStickyATC as MobileStickyATCContent,
  ProductOption,
} from "@shopblok/registry/contracts";
import { BuyBox, type BuyBoxCopy, type BuyBoxProps } from "@shopblok/ui/organisms/buy-box";
import {
  MobileStickyATC,
  type MobileStickyATCProps,
} from "@shopblok/ui/organisms/mobile-sticky-atc";
import {
  QuickViewDialog,
  type QuickViewDialogProps,
} from "@shopblok/ui/organisms/quick-view-dialog";
import { SizeGuideDialog } from "@shopblok/ui/organisms/size-guide-dialog";
import type { ReactNode } from "react";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const page = (ctx: DsContext) => fixtures(ctx).productPage;
const messages = (ctx: DsContext) => catalogs[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

// --- BuyBox ---

/** The buy box's words: the catalog's, with the notes' name carrying the state's label if given. */
function boxCopy(ctx: DsContext, state?: string): BuyBoxCopy {
  const { atoms, molecules, organisms } = messages(ctx);
  const words = organisms.buyBox;
  return {
    buyBox: state === undefined ? words : wordsFor(words, "notes", state),
    variantSelector: molecules.variantSelector,
    priceBlock: molecules.priceBlock,
    quantityStepper: atoms.quantityStepper,
    stock: atoms.stock,
    rating: atoms.rating,
  };
}

/** A catalog message with the state's label added to the name of a landmark, in brackets. */
function wordsFor<Words extends Record<string, string>>(
  words: Words,
  key: keyof Words,
  state: string,
): Words {
  return { ...words, [key]: `${words[key]} (${state})` } as Words;
}

/**
 * The ids a page gives one buy box, here made from the state's id so that no two are alike: the
 * form (the sticky bar's button joins it), the options (its link goes there) and the button.
 */
function boxIds(key: string) {
  return {
    formId: `buy-box-${key}-form`,
    optionsId: `buy-box-${key}-options`,
    buttonId: `buy-box-${key}-add`,
    reviewsHref: `#buy-box-${key}-reviews`,
  } satisfies Partial<BuyBoxProps>;
}

/** The fixture's buy box of a state of the choice. */
const boxOf = (ctx: DsContext, key: "empty" | "partial" | "ready" | "low" | "soldOut") =>
  page(ctx).buyBox[key];

/**
 * A buy box in a column as wide as a page gives it (28 rem at most): the states are drawn one under
 * another at the frame's width, and a buy box is never as wide as the window.
 */
function BoxColumn({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-md">{children}</div>;
}

/** One state of the buy box: a fixture, and what the state changes. */
function boxState(spec: {
  id: string;
  label: string;
  description: string;
  content: (ctx: DsContext) => BuyBoxContent;
  props?: (ctx: DsContext) => Partial<BuyBoxProps>;
}): DsState {
  const { id, label, description, content, props = () => ({}) } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <BoxColumn>
        <BuyBox
          {...content(ctx)}
          copy={boxCopy(ctx, label)}
          locale={lang(ctx)}
          headingLevel={4}
          {...boxIds(id)}
          {...props(ctx)}
        />
      </BoxColumn>
    ),
  };
}

/** The contract's content with the locale's longest strings in the places that take words. */
function longBox(ctx: DsContext): BuyBoxContent {
  const base = boxOf(ctx, "empty");
  const { long } = fixtures(ctx);
  const { chipLabel, fieldLabel, linkLabel, optionLabel, helpText, errorText } = ctx.fixture.long;
  const [colour, size] = base.product.options;
  const longer = (option: ProductOption, title: string, label: string): ProductOption => ({
    ...option,
    title,
    values: option.values.map((value, index) => (index === 0 ? { ...value, label } : value)),
  });
  return {
    ...base,
    product: {
      ...base.product,
      title: long.product.title,
      options: [
        longer(required(colour, "colour option"), optionLabel, chipLabel),
        longer(required(size, "size option"), fieldLabel, linkLabel),
      ],
    },
    notes: [helpText, errorText],
  };
}

const buyBoxStates: readonly DsState[] = [
  boxState({
    id: "empty",
    label: "Nothing chosen",
    description:
      "No option has a value: the price is the product's, the stock line is empty, and “Add to cart” is held (aria-disabled, never disabled, so it stays in the Tab order) with a line under it that names what to choose.",
    content: (ctx) => boxOf(ctx, "empty"),
  }),
  boxState({
    id: "partial",
    label: "Colour chosen",
    description:
      "The colour only: its name is in the group's label, the sizes that cannot be bought in that colour are struck through and still focusable, and the line under the button asks for the size alone.",
    content: (ctx) => boxOf(ctx, "partial"),
  }),
  boxState({
    id: "ready",
    label: "Ready to add",
    description:
      "Every option has a value and the variant can be bought: the price is the variant's, the stock line says “In stock”, and the button is live.",
    content: (ctx) => boxOf(ctx, "ready"),
  }),
  boxState({
    id: "low",
    label: "Three left",
    description:
      "A variant with three left: the stock line says so, and the quantity stepper stops at three.",
    content: (ctx) => boxOf(ctx, "low"),
  }),
  boxState({
    id: "sold-out",
    label: "Sold out",
    description:
      "A complete choice that cannot be bought: the stock line and the button both say so, the button is held, and the quantity is off.",
    content: (ctx) => boxOf(ctx, "soldOut"),
  }),
  boxState({
    id: "adding",
    label: "Adding to cart",
    description:
      "The request is on its way: the button shows a spinner and “Adding to cart…” and is held, so it cannot be sent twice. It stays in the Tab order.",
    content: (ctx) => boxOf(ctx, "ready"),
    props: () => ({ status: "adding" }),
  }),
  boxState({
    id: "added",
    label: "Added to cart",
    description:
      "The cart took it: a polite status under the button says so, with a check mark, and the button is live again for another.",
    content: (ctx) => boxOf(ctx, "ready"),
    props: () => ({ status: "added" }),
  }),
  boxState({
    id: "error",
    label: "Could not add",
    description:
      "The request failed: the status says so, in the error colour with an icon so colour is not the only sign, and the button is live to try again.",
    content: (ctx) => boxOf(ctx, "ready"),
    props: () => ({ status: "error" }),
  }),
  boxState({
    id: "size-guide",
    label: "With the size guide",
    description:
      "The page passes the size guide's button, and it sits at the end of the size option's label line, beside “Size” and outside the group's name. It opens a dialog of its own.",
    content: (ctx) => boxOf(ctx, "partial"),
    props: (ctx) => ({
      sizeGuide: (
        <SizeGuideDialog
          {...page(ctx).sizeGuide}
          copy={messages(ctx).organisms.sizeGuideDialog}
          locale={lang(ctx)}
        />
      ),
    }),
  }),
  boxState({
    id: "heading-2",
    label: "Heading level 2",
    description:
      "The title as an h2, the level the quick view uses under its dialog; the page's own is an h1, and the heading level is the only thing that changes.",
    content: (ctx) => boxOf(ctx, "ready"),
    props: () => ({ headingLevel: 2 }),
  }),
  boxState({
    id: "long",
    label: "Long labels",
    description:
      "The longest title the shop's copy allows, long option names and values and long notes: everything wraps inside the column, nothing is cut, and the line that names what to choose wraps too.",
    content: longBox,
  }),
];

// --- MobileStickyATC ---

// The heights were measured in Chromium (the storefront's stylesheet, no web font) in en, el, de
// and fr at 375, 768 and 1440 px: a bar is at most 125 px tall (French at 375 px), and one with the
// longest title the copy allows at most 375 px (German at 375 px).
// A box is the bar and a strip of the "page" above it, and the bar scrolls inside itself if a
// narrower font makes it taller than that.
/** The box a bar is drawn in: the tallest ordinary bar, and a strip of the page above it. */
const BAR_BOX = 200;
/** The long state's box: the tallest bar with the longest title, with room above it. */
const LONG_BAR_BOX = 460;

/** The bar in a state, capped to its box (the window's height means nothing inside it). */
const cappedBar = "max-h-[calc(100%-1rem)]";

/** The bar's words: the catalog's, with the region's name carrying the state's label if given. */
function barCopy(ctx: DsContext, state?: string): MobileStickyATCProps["copy"] {
  const { molecules, organisms } = messages(ctx);
  return {
    mobileStickyAtc:
      state === undefined
        ? organisms.mobileStickyAtc
        : wordsFor(organisms.mobileStickyAtc, "region", state),
    priceBlock: molecules.priceBlock,
  };
}

/** One bar, drawn in its box: forced into view, with the ids of the buy box it would belong to. */
function bar(
  ctx: DsContext,
  spec: { key: string; label?: string; height: number; content: MobileStickyATCContent },
) {
  const { key, label, height, content } = spec;
  const { formId, optionsId } = boxIds(key);
  return (
    <OverlayBox name={label ?? messages(ctx).organisms.mobileStickyAtc.region} height={height}>
      <MobileStickyATC
        {...content}
        copy={barCopy(ctx, label)}
        locale={lang(ctx)}
        watch={boxIds(key).buttonId}
        formId={formId}
        optionsHref={`#${optionsId}`}
        forceVisible
        className={cappedBar}
      />
    </OverlayBox>
  );
}

function barState(spec: {
  id: string;
  label: string;
  description: string;
  content: (ctx: DsContext) => MobileStickyATCContent;
  height?: number;
}): DsState {
  const { id, label, description, content, height = BAR_BOX } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => bar(ctx, { key: `sticky-${id}`, label, height, content: content(ctx) }),
  };
}

const mobileStickyStates: readonly DsState[] = [
  barState({
    id: "ready",
    label: "Ready",
    description:
      "A full choice that can be bought: the picture, the title, the price and “Black, M”, and “Add to cart”, a submit button that belongs to the buy box's form (form=…), so it adds exactly what the box holds.",
    content: (ctx) => page(ctx).sticky.ready,
  }),
  barState({
    id: "incomplete",
    label: "Choice incomplete",
    description:
      "An option is missing: the action is “Choose options”, a link (a plain in-page link, so it works without JavaScript) to the buy box's options, styled as a button.",
    content: (ctx) => page(ctx).sticky.incomplete,
  }),
  barState({
    id: "sold-out",
    label: "Sold out",
    description:
      "The chosen variant cannot be bought: the words “Sold out” stand where the button would, and nothing is left to press.",
    content: (ctx) => page(ctx).sticky.soldOut,
  }),
  barState({
    id: "long",
    label: "Long title",
    description:
      "The longest title the shop's copy allows and a long choice: they wrap and are never cut, the price stays beside them, and the action takes the whole width under them.",
    content: (ctx) => ({
      ...page(ctx).sticky.ready,
      title: fixtures(ctx).long.product.title,
      choice: [ctx.fixture.long.optionLabel, ctx.fixture.long.chipLabel],
    }),
    height: LONG_BAR_BOX,
  }),
];

// --- QuickViewDialog ---

/** The quick view's words: the catalog's, with the gallery's and the buy box's. */
function quickViewCopy(ctx: DsContext): QuickViewDialogProps["copy"] {
  const { atoms, molecules, organisms } = messages(ctx);
  return {
    buyBox: organisms.buyBox,
    variantSelector: molecules.variantSelector,
    priceBlock: molecules.priceBlock,
    quantityStepper: atoms.quantityStepper,
    stock: atoms.stock,
    rating: atoms.rating,
    quickViewDialog: organisms.quickViewDialog,
    productGallery: organisms.productGallery,
  };
}

/** The popup of an open state, capped to its box (the window's height means nothing inside it). */
const cappedDialog = "max-h-[calc(100%-2rem)] sm:max-h-[calc(100%-4rem)]";
/** The dialog's popup in a state: capped, and still. */
const stillDialog = `${cappedDialog} duration-0`;
/** The open dialog's box: tall enough for the picture and the top of the buy box, which scrolls. */
const DIALOG_BOX = 760;

/** The quick view drawn open in a box, with its trigger in the corner behind the popup. */
function quickViewOpen(ctx: DsContext, spec: { label: string; content: BuyBoxContent }) {
  const { label, content } = spec;
  return (
    <OverlayBox name={label} height={DIALOG_BOX}>
      <div className="p-4">
        <QuickViewDialog
          {...content}
          copy={quickViewCopy(ctx)}
          locale={lang(ctx)}
          prefetch={false}
          defaultOpen
          modal={false}
          popupClassName={stillDialog}
        />
      </div>
    </OverlayBox>
  );
}

const quickViewStates: readonly DsState[] = [
  {
    id: "trigger",
    label: "Trigger alone",
    description:
      "What a card holds: a 44 px button that says “Quick view” and is named “Quick view: Heritage Hoodie”, so that a card full of them has a name for each, and the visible words are in the name.",
    render: (ctx) => (
      <QuickViewDialog
        {...boxOf(ctx, "ready")}
        copy={quickViewCopy(ctx)}
        locale={lang(ctx)}
        prefetch={false}
      />
    ),
  },
  {
    id: "open-empty",
    label: "Open, nothing chosen",
    description:
      "The dialog drawn open: the product's pictures with the thumbnails below, the buy box beside them from 768 px, with “Add to cart” held and the line that names what to choose, and the link to the full page. The close button is in the corner and stays there when the body scrolls.",
    render: (ctx) =>
      quickViewOpen(ctx, { label: "Open, nothing chosen", content: boxOf(ctx, "empty") }),
  },
  {
    id: "open-chosen",
    label: "Open, a variant chosen",
    description:
      "A full choice: the picture is the chosen colour's, the price and the stock line are the variant's, and the button is live.",
    render: (ctx) =>
      quickViewOpen(ctx, { label: "Open, a variant chosen", content: boxOf(ctx, "ready") }),
  },
  {
    id: "open-long",
    label: "Open, long labels",
    description:
      "The longest title and option names the shop's copy allows: they wrap inside the dialog, which scrolls inside itself when it is taller than its box.",
    render: (ctx) => quickViewOpen(ctx, { label: "Open, long labels", content: longBox(ctx) }),
  },
];

export const buyBoxOrganismStories = {
  "organisms/buy-box": {
    summary:
      "The part of a product page where a shopper decides: the title, the rating, the price, the options, the stock, the quantity and the button that adds the choice to the cart, in one form.",
    a11y: [
      "It is one form. The title is its heading (an h1 on a product page, an h2 in the quick view), the rating is an image named “4.6 out of 5” beside a link to the reviews that is 44 px tall, and the options are radio groups, each named by a visible line that also says the choice (“Color: Black”), so a screen reader hears what is chosen and the sighted see it.",
      "“Add to cart” is held with aria-disabled and never with the disabled attribute, until every option has a value and the variant can be bought. A disabled button leaves the Tab order and says nothing, so a keyboard user would not find it and could not learn why. This one stays focusable and its description is a visible line, “Choose Color and Size to add it to the cart”. Pressing it, or Enter in the quantity field, sends nothing and moves focus to the first option that is missing.",
      "The same holds for a variant that cannot be bought, whose button says “Sold out”, and while a request is on its way, when the button says “Adding to cart…” and shows a spinner. The guard is on the form, not the button, so the bar at the foot of a phone, whose button belongs to this form, is held by it too. Before any script has run the form still posts the options and the quantity as they were drawn, and the server checks the choice again.",
      "The stock line is a polite live region that is always in the page and empty until a variant is chosen, so “Only 3 left” is announced when the last option is chosen. The status under the button is another, a role=status, and says “Added to cart” or the error in words and with an icon, never by colour alone.",
      "A value with no variant to buy for the current choice is struck through and says “Unavailable” in its name, and stays focusable and selectable, so a shopper may look at it and the page says why not. Arrow keys move between the values and select the one they land on, and Tab leaves the group.",
      "Every control is at least 44 px: the reviews link, each swatch and size, both stepper buttons and the field, and the button. Titles, names and notes wrap in every language and are never cut, and the column shrinks to its container rather than widen the page.",
    ],
    live: (ctx) => (
      <BoxColumn>
        <BuyBox
          {...boxOf(ctx, "empty")}
          copy={boxCopy(ctx)}
          locale={lang(ctx)}
          headingLevel={3}
          {...boxIds("live")}
        />
      </BoxColumn>
    ),
    states: buyBoxStates,
    statesLayout: "stack",
  },
  "organisms/mobile-sticky-atc": {
    summary:
      "A bar fixed to the foot of a phone's window, once the buy box's button has scrolled out of sight, that keeps the product, its price, the choice and the way to the cart in reach.",
    a11y: [
      "The bar is a region named “Buy this product”, a landmark of its own that a screen-reader user can find and skip. It is drawn only after the browser reports that the buy box's button has left the top of the window, and goes when the button comes back; it is not in the server's markup, so the page has no layout shift and no hydration mismatch, and without JavaScript the page has the buy box alone.",
      "It takes no focus when it appears. WCAG 2.4.11 (Focus Not Obscured): while it is drawn its height is reserved at the end of the page, as padding and as scroll padding on the root element, with the same function the cookie banner and the compare tray use, so a control the reader tabs to is scrolled clear of it and the page's last links can scroll above it. The design system draws the bars in boxes and forces them in, so they reserve nothing here.",
      "The action is what the choice allows. When ready it is a submit button that belongs to the buy box's form, so it adds what the box holds and the box's own guard applies. When an option is missing it is a link, styled as a button, to the buy box's options. When the variant is sold out there is no control, only the words.",
      "The picture is decoration with an empty alternative text, the title wraps and is never cut, the choice is read as a list (“Black, M”), and the button and the link are 44 px tall. The bar keeps clear of a phone's home indicator, scrolls inside itself rather than cover a short window, and is hidden from 768 px, where the buy box sits beside the gallery and is always in reach.",
    ],
    live: (ctx) =>
      bar(ctx, {
        key: "sticky-live",
        height: BAR_BOX,
        content: page(ctx).sticky.ready,
      }),
    states: mobileStickyStates,
    statesLayout: "stack",
  },
  "organisms/quick-view-dialog": {
    summary:
      "A product's pictures and buy box in a dialog, opened from a card, so a shopper can choose and add without leaving the listing.",
    a11y: [
      "The trigger is a 44 px button that says “Quick view” and is named “Quick view: Heritage Hoodie”: the visible words are at the start of the name (WCAG 2.5.3), and a card full of triggers has a name for each. It opens a modal dialog: the page behind is inert, focus moves inside, Tab and Shift+Tab go round the dialog without leaving it, and Escape, pressed once, closes it with focus back on the trigger.",
      "The dialog is named by the buy box's own heading, an h2, through aria-labelledby: one name, not a title above a heading with the same words. It holds the product's pictures (no zoom, since a dialog does not open another, and the thumbnails below the picture), the buy box with the rules of its own page, and a link to the full page. There is no size guide, for the same reason as the zoom.",
      "The choice is the dialog's: picking a colour shows that colour's picture and the box starts from it. It stays open after the product is added, so the shopper sees the confirmation and may close it or keep choosing.",
      "The popup does not scroll as a whole: a strip at its top holds the close button, which is the primitive's 44 px button in the corner, and the body under it scrolls when the dialog is taller than the window. The close button is therefore always in reach on a phone, where there is no Escape key, and the scrolling body holds focusable controls, so a keyboard user can scroll it.",
      "The open states are drawn in boxes and capped to them; a popup drawn open takes no focus until a reader opens it again. In a shop the dialog is capped at the window's height and nothing is cut.",
    ],
    live: (ctx) => (
      <QuickViewDialog
        {...boxOf(ctx, "empty")}
        copy={quickViewCopy(ctx)}
        locale={lang(ctx)}
        prefetch={false}
      />
    ),
    states: quickViewStates,
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
