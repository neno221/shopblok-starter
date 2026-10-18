// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D45, D46). The stories of
// ProductGallery, ProductInfoAccordions, ReviewsSection and SizeGuideDialog. Sample data is
// `commerceFixtures[ctx.locale].productPage` (the Heritage Hoodie's gallery with nothing chosen, with
// a colour chosen and with one picture; its information; its first page of 128 reviews and none; its
// size guide), the copy is `catalogs[ctx.locale]`, and the locale every `Intl` call uses is the
// market's `<html lang>`. Every link is drawn with `prefetch={false}`: the shop's pages answer 404
// until M3.
//
// The live renders are what a product page draws: the gallery with its enlarge button, the
// information, the reviews and the size guide's button. The page's `h2` is the section's, so the
// information's titles and the reviews' title are `h3` there, and a state sits under its own `h3`
// label, so its headings are one level deeper (`h4`), as the listing stories' are.
//
// The gallery and the information are drawn in a column as wide as a product page's (`max-w-xl`
// and `max-w-2xl`), not as wide as the window: at 1440 px a gallery that filled the frame would be
// a picture taller than the window. The reviews take the frame, since they have two columns from
// `lg`. The states are laid out one under another because of that.
//
// The enlarge dialog and the size guide are modal, so the live renders are the closed components:
// the enlarge button over the picture and the size guide's button, which the interaction checks
// press. The open states are drawn inside an `OverlayBox` (D45) with the component's own way of
// starting open (`defaultZoomOpen` and `defaultOpen`, with `modal={false}`, so several fit on one
// page and the rest of the frame stays usable). A popup drawn open takes no focus until a reader
// opens it again. The popup is capped to its box (the window's `100dvh` means nothing inside a box),
// so a size guide taller than the box scrolls inside itself, as it does in a short window, and
// nothing is cut. The animations are switched off (`duration-0`): no state is a picture of an
// animation. A story renders on the server (RSC): the client components are given plain data (the
// contract's values and the catalog's words, never a function). The reviews, a server component,
// are the one that takes a function, `hrefFor`, as its contract says.
//
// Landmarks are named apart. A page of states has several galleries, accordions, review sections
// and dialogs, and two named alike confuse a screen-reader user, so a state's name carries its
// label in brackets (`wordsFor`), as the headers' and the listing's do. The live renders keep the
// catalog's own names. Every `id` is per state: the reviews take one from the state (the buy box's
// rating links to the live render's, `reviews`), and Base UI makes the rest.
//
// The boxes are taller than what their popups hold in the longest language at the widest popup, or
// they hold it with the popup scrolling; the heights are generous rather than measured, since a
// popup taller than its box scrolls inside itself.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  ProductGallery as ProductGalleryContent,
  ProductInfo,
  ReviewsSection as ReviewsSectionContent,
  SizeGuide,
} from "@shopblok/registry/contracts";
import { ProductGallery, type ProductGalleryProps } from "@shopblok/ui/organisms/product-gallery";
import {
  ProductInfoAccordions,
  type ProductInfoAccordionsProps,
} from "@shopblok/ui/organisms/product-info-accordions";
import { ReviewsSection, type ReviewsSectionProps } from "@shopblok/ui/organisms/reviews-section";
import {
  SizeGuideDialog,
  type SizeGuideDialogProps,
} from "@shopblok/ui/organisms/size-guide-dialog";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const page = (ctx: DsContext) => fixtures(ctx).productPage;
const messages = (ctx: DsContext) => catalogs[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The popup of an open state, capped to its box (the window's height means nothing inside it). */
const cappedDialog = "max-h-[calc(100%-2rem)] sm:max-h-[calc(100%-4rem)]";
/** The dialog's popup in a state: capped, and still. */
const stillDialog = `${cappedDialog} duration-0`;

// --- ProductGallery ---

/** A product page's column for the gallery: half the window from md, here a readable width. */
const GALLERY_COLUMN = "w-full max-w-xl";

/** The box of the enlarged-picture state: the gallery behind the popup, and a popup 2 rem shorter. */
const ZOOM_BOX = 640;

/**
 * The enlarge dialog's popup in a state: as tall as its box less 2 rem (the window's height means
 * nothing inside a box), as wide as the box less 2 rem, and still.
 */
const stillZoom =
  "h-[calc(100%-2rem)] max-h-[calc(100%-2rem)] sm:max-w-[calc(100%-2rem)] duration-0";

/**
 * The gallery's words: the catalog's, with the carousel's name for one state if given. The label is
 * an ICU message ("Images of {title}"), so a state's label must not hold an apostrophe or a brace.
 */
function galleryCopy(ctx: DsContext, state?: string): ProductGalleryProps["copy"] {
  const words = messages(ctx).organisms.productGallery;
  return state === undefined ? words : { ...words, label: `${words.label} (${state})` };
}

/** One state of the gallery, in a column of a product page's width. */
function galleryState(spec: {
  id: string;
  label: string;
  description: string;
  /** What the gallery shows: the fixture's pictures, by default all four with nothing chosen. */
  content?: (ctx: DsContext) => ProductGalleryContent;
  /** What the state changes: where the thumbnails stand, the zoom button, the labels. */
  props?: Partial<ProductGalleryProps>;
}): DsState {
  const { id, label, description, content = (ctx) => page(ctx).gallery.all, props } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <div className={GALLERY_COLUMN}>
        <ProductGallery
          {...content(ctx)}
          copy={galleryCopy(ctx, label)}
          locale={lang(ctx)}
          {...props}
        />
      </div>
    ),
  };
}

/** The gallery with the longest name and picture descriptions the copy allows. */
function longGallery(ctx: DsContext): ProductGalleryContent {
  const { productName, imageAlt } = ctx.fixture.long;
  const all = page(ctx).gallery.all;
  return {
    ...all,
    title: productName,
    media: all.media.map((item) => ({ ...item, alt: imageAlt })),
  };
}

/** Twelve pictures: the fixture's four three times over, each described by its own number. */
function manyGallery(ctx: DsContext): ProductGalleryContent {
  const all = page(ctx).gallery.all;
  return {
    ...all,
    media: [0, 1, 2].flatMap((round) =>
      all.media.map((item, index) => ({
        ...item,
        alt: `${item.alt} (${round * all.media.length + index + 1})`,
      })),
    ),
  };
}

const productGalleryStates: readonly DsState[] = [
  galleryState({
    id: "thumbnails-side",
    label: "Thumbnails beside the picture",
    description:
      "Nothing chosen: the first picture, with the thumbnails in a column at its start side from 768 px, as tall as the picture and scrolling inside it when there are more than fit. Under 768 px they are not drawn, and the swipe, the buttons and the position are all there is.",
  }),
  galleryState({
    id: "many-pictures",
    label: "Twelve pictures",
    description:
      "More thumbnails than the picture is tall: from 768 px the column is as tall as the picture and scrolls inside itself, with a thumbnail still at least 44 px tall and a scrollbar that takes its share of the column and not of the page. Each picture is described by its number.",
    content: manyGallery,
  }),
  galleryState({
    id: "thumbnails-below",
    label: "Thumbnails below the picture",
    description:
      "The form the quick view uses: from 768 px the thumbnails wrap in a row under the picture, so nothing scrolls sideways.",
    props: { thumbnails: "below" },
  }),
  galleryState({
    id: "colour-chosen",
    label: "A colour chosen",
    description:
      "Forest green is chosen, so the carousel starts on that colour's picture, the last of four: Next is dimmed, its thumbnail is marked and the position says it. The server writes the starting place into the markup, so the picture does not jump when the page wakes up.",
    content: (ctx) => page(ctx).gallery.chosen,
  }),
  galleryState({
    id: "single",
    label: "One picture",
    description:
      "A product with one picture: no buttons, no position, no thumbnails and nothing that drags. The enlarge button is still there.",
    content: (ctx) => page(ctx).gallery.single,
  }),
  galleryState({
    id: "no-zoom",
    label: "No enlarge button",
    description:
      "The gallery without its enlarge button and dialog, as the quick view draws it, since that is a dialog already.",
    props: { zoom: false, thumbnails: "below" },
  }),
  {
    id: "zoom-open",
    label: "Enlarged picture",
    description:
      "The enlarge dialog drawn open in a box, over the gallery it belongs to: the product's name, the close button, the picture whole, Previous (dimmed at the first picture), the position and Next. It takes no focus until a reader opens it again, and the gallery behind it stays usable.",
    render: (ctx) => (
      <OverlayBox name="Enlarged picture" height={ZOOM_BOX}>
        <div className="max-w-md p-4">
          <ProductGallery
            {...page(ctx).gallery.all}
            copy={galleryCopy(ctx, "Enlarged picture")}
            locale={lang(ctx)}
            defaultZoomOpen
            modal={false}
            zoomPopupClassName={stillZoom}
          />
        </div>
      </OverlayBox>
    ),
  },
  galleryState({
    id: "long-labels",
    label: "Long names",
    description:
      "The longest product name and picture descriptions the shop's copy allows: they are the carousel's, the slides' and the thumbnails' names, read in full by a screen reader, and the page shows only the position, so nothing is cut or widened.",
    content: longGallery,
  }),
];

// --- ProductInfoAccordions ---

/** A product page's column for the information: the right column, here a readable width. */
const INFO_COLUMN = "w-full max-w-2xl";

/** The information's words: the catalog's, with the region's name for one state if given. */
function infoCopy(ctx: DsContext, state?: string): ProductInfoAccordionsProps["copy"] {
  const words = messages(ctx).organisms.productInfoAccordions;
  return state === undefined ? words : { ...words, label: `${words.label} (${state})` };
}

/** One state of the information, its headings one level under the state's label. */
function infoState(spec: {
  id: string;
  label: string;
  description: string;
  /** The sections, by default the fixture's four. */
  content?: (ctx: DsContext) => ProductInfo;
  /** The sections open at first, by id, from the state's own sections. */
  open?: (info: ProductInfo) => string[];
}): DsState {
  const { id, label, description, content = (ctx) => page(ctx).info, open } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => {
      const info = content(ctx);
      return (
        <div className={INFO_COLUMN}>
          <ProductInfoAccordions
            {...info}
            copy={infoCopy(ctx, label)}
            locale={lang(ctx)}
            headingLevel={4}
            prefetch={false}
            {...(open === undefined ? {} : { defaultOpen: open(info) })}
          />
        </div>
      );
    },
  };
}

/**
 * The information with a first section whose title and words are as long as the locale writes
 * them: a paragraph, a fact, a list and a link, open at first, above the other three sections.
 */
function longInfo(ctx: DsContext): ProductInfo {
  const long = ctx.fixture.long;
  const { sections } = page(ctx).info;
  return {
    sections: [
      {
        id: "long",
        title: long.productName,
        blocks: [
          { kind: "text", paragraphs: [long.productDescription] },
          { kind: "facts", rows: [{ label: long.fieldLabel, value: long.imageAlt }] },
          { kind: "list", items: [long.helpText, long.hint] },
          {
            kind: "link",
            link: { label: long.linkLabel, href: `${fixtures(ctx).prefix}/returns` },
          },
        ],
      },
      ...sections.slice(1),
    ],
  };
}

const productInfoStates: readonly DsState[] = [
  infoState({
    id: "first-open",
    label: "First section open",
    description:
      "How a product page starts: the description is open and the other three sections are shut, with their text in the page all the same.",
  }),
  infoState({
    id: "all-open",
    label: "All sections open",
    description:
      "Every section open at once, which the accordion allows: paragraphs, the facts as a list of labels and values, the care list and the link to the returns page.",
    open: (info) => info.sections.map((section) => section.id),
  }),
  infoState({
    id: "all-closed",
    label: "All sections closed",
    description:
      "Four titles and nothing else. A section that is open can be shut, so the reader can fold the page down to its outline.",
    open: () => [],
  }),
  infoState({
    id: "long-title",
    label: "Long title and words",
    description:
      "A first section whose title, paragraph, fact, list and link are the longest the shop's copy allows: the title wraps beside its arrow and keeps the 44 px row, and every word wraps in its column.",
    content: longInfo,
    open: () => ["long"],
  }),
];

// --- ReviewsSection ---

/** The address of a page of the product's reviews, the section's own anchor on the product page. */
const reviewsHref = (ctx: DsContext) => (reviewsPage: number) =>
  `${fixtures(ctx).prefix}/products/${fixtures(ctx).product.handle}?page=${reviewsPage}#reviews`;

/** The reviews' words and the molecules': the catalog's, with the landmarks' names for one state. */
function reviewsCopy(ctx: DsContext, state?: string): ReviewsSectionProps["copy"] {
  const { organisms, molecules, atoms } = messages(ctx);
  const words = organisms.reviewsSection;
  return {
    reviewsSection: state === undefined ? words : { ...words, title: `${words.title} (${state})` },
    ratingSummary: molecules.ratingSummary,
    reviewItem: molecules.reviewItem,
    pagination:
      state === undefined
        ? molecules.pagination
        : { ...molecules.pagination, label: `${molecules.pagination.label} (${state})` },
    rating: atoms.rating,
  };
}

/** One state of the reviews: the fixture's first page with what the state changes. */
function reviewsState(spec: {
  id: string;
  label: string;
  description: string;
  /** What the state changes: the reviews, the page, the write link. */
  content?: (ctx: DsContext) => ReviewsSectionContent;
}): DsState {
  const { id, label, description, content = (ctx) => page(ctx).reviews.first } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <ReviewsSection
        {...content(ctx)}
        copy={reviewsCopy(ctx, label)}
        locale={lang(ctx)}
        hrefFor={reviewsHref(ctx)}
        id={`reviews-${id}`}
        headingLevel={4}
        prefetch={false}
      />
    ),
  };
}

const reviewsSectionStates: readonly DsState[] = [
  reviewsState({
    id: "first-page",
    label: "First page",
    description:
      "The ratings and the link that writes a review in a column at the start from 1024 px, the first six of 128 reviews beside them, the line that says which ones these are, and the pager. Under 1024 px the ratings come first and the list under them.",
  }),
  reviewsState({
    id: "later-page",
    label: "A later page",
    description:
      "Page 8 of 22: the line reads 43 to 48 of 128 and the pager shows the pages around the current one, with Previous and Next, and the first and last pages at its ends.",
    content: (ctx) => ({ ...page(ctx).reviews.first, page: { page: 8, pageCount: 22 } }),
  }),
  reviewsState({
    id: "last-page",
    label: "Last page",
    description:
      "The last page holds the two reviews left over, and the line ends at the count: 127 to 128 of 128. There is no Next.",
    content: (ctx) => ({
      ...page(ctx).reviews.first,
      reviews: page(ctx).reviews.first.reviews.slice(0, 2),
      page: { page: 22, pageCount: 22 },
    }),
  }),
  reviewsState({
    id: "none",
    label: "No reviews",
    description:
      "A product nobody has reviewed: the heading, a sentence that says so, a hint, and the link that writes the first review. No row of empty stars, no list and no pager, since a rating of none is not a rating.",
    content: (ctx) => page(ctx).reviews.none,
  }),
  reviewsState({
    id: "no-write-link",
    label: "No link to write a review",
    description:
      "A page that has nowhere to send a reviewer: the ratings and the reviews alone, with no write link.",
    content: (ctx) => ({ ...page(ctx).reviews.first, writeHref: undefined }),
  }),
  reviewsState({
    id: "long-review",
    label: "Long review",
    description:
      "The first review has the longest title, author and text the shop's copy allows: they wrap in the column and are never cut, and the other five are as they were.",
    content: (ctx) => {
      const first = page(ctx).reviews.first;
      return { ...first, reviews: [fixtures(ctx).long.review, ...first.reviews.slice(1)] };
    },
  }),
];

// --- SizeGuideDialog ---

/** The box of a size-guide state: a popup taller than it scrolls inside itself, as in a short window. */
const GUIDE_BOX = 760;

/** The size guide's words: the catalog's, with the dialog's name for one state if given. */
function guideCopy(ctx: DsContext, state?: string): SizeGuideDialogProps["copy"] {
  const words = messages(ctx).organisms.sizeGuideDialog;
  return state === undefined ? words : { ...words, title: `${words.title} (${state})` };
}

/** The guide with every label as long as the locale writes it, in centimetres. */
function longGuide(ctx: DsContext): SizeGuide {
  const { productName, fieldLabel, optionLabel, chipLabel, badge, helpText } = ctx.fixture.long;
  const guide = page(ctx).sizeGuide;
  const labels = [fieldLabel, optionLabel, chipLabel, badge];
  return {
    ...guide,
    title: productName,
    rows: guide.rows.map((row, index) => ({ ...row, label: labels[index] ?? row.label })),
    unit: "cm",
    note: helpText,
  };
}

/** The size guide drawn open in a box, with its button in the corner behind the popup. */
function guideOpen(spec: {
  id: string;
  label: string;
  description: string;
  content: (ctx: DsContext) => SizeGuide;
}): DsState {
  const { id, label, description, content } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <OverlayBox name={label} height={GUIDE_BOX}>
        <div className="p-4">
          <SizeGuideDialog
            {...content(ctx)}
            copy={guideCopy(ctx, label)}
            locale={lang(ctx)}
            defaultOpen
            modal={false}
            popupClassName={stillDialog}
          />
        </div>
      </OverlayBox>
    ),
  };
}

const sizeGuideStates: readonly DsState[] = [
  {
    id: "button",
    label: "The button alone",
    description:
      "The link-styled button that sits beside the size option in the buy box, 44 px tall. Pressing it opens the dialog below.",
    render: (ctx) => (
      <SizeGuideDialog
        {...page(ctx).sizeGuide}
        copy={guideCopy(ctx, "The button alone")}
        locale={lang(ctx)}
      />
    ),
  },
  guideOpen({
    id: "open-cm",
    label: "Open, centimetres",
    description:
      "The dialog drawn open with the toggle on centimetres: a row for each size and a column for each measurement, ranges and single values, the caption that says the unit and the note on how to measure.",
    content: (ctx) => ({ ...page(ctx).sizeGuide, unit: "cm" }),
  }),
  guideOpen({
    id: "open-in",
    label: "Open, inches",
    description:
      "The same table in inches, to one decimal and in the locale's own form: the US market starts here, and Greek writes 31,5. The toggle keeps one unit chosen at all times.",
    content: (ctx) => ({ ...page(ctx).sizeGuide, unit: "in" }),
  }),
  guideOpen({
    id: "open-long",
    label: "Open, long labels",
    description:
      "A title, four measurements and a note as long as the locale writes them: the headers wrap in their columns and the table scrolls sideways in its own box when it must, a box the keyboard can reach.",
    content: longGuide,
  }),
];

export const productPageOrganismStories = {
  "organisms/product-gallery": {
    summary:
      "A product's pictures: one large picture that swipes and has previous and next buttons, thumbnails beside or under it from 768 px, and a button that opens the picture enlarged in a dialog.",
    a11y: [
      "The pictures are one carousel, a region named “Images of” with the product's name and called a “carousel” by a screen reader, and each picture is a slide named by its place, such as “Image 2 of 4”. The pictures out of view are hidden from assistive technology, as the WAI-ARIA pattern has it, so a screen reader reads the one in view.",
      "The position is also written under the picture, in a polite status that speaks after each move and not when the page loads. The buttons are 44 px and sit inside the picture's corners; at either end the button that cannot move is dimmed and marked aria-disabled but stays focusable, so a keyboard user who pressed Next to the end does not lose their place.",
      "The carousel never moves on its own, in any setting, so there is no autoplay and no pause button to look for (WCAG 2.2.2). It moves when the visitor presses a button or a thumbnail, uses the left and right arrow keys, or swipes; under reduced motion a button, a thumbnail and a change of colour jump to the picture instead of gliding.",
      "From 768 px the thumbnails are buttons named by their picture's description, or by its place when it has none. The current one has aria-current and a heavier border as well as full opacity, so it is not marked by colour alone. Under 768 px they are not drawn at all, which takes them out of the tab order and the page's accessibility tree, and no picture is loaded twice.",
      "When the shopper chooses a colour, the carousel goes to that colour's first picture. A page opened with a colour in its address starts there with no jump, because the server writes the starting place into the markup. Every picture stays in the carousel and the thumbnails.",
      "The “Enlarge image” button is 44 px and opens a modal dialog named by the product, with the picture as large as the window allows, whole and never cut. The dialog has its own previous and next buttons, the arrow keys and the position; Tab stays inside it, one Escape or the close button closes it, focus goes back to the button, and the carousel is left on the picture the dialog ended on.",
      "A single picture has no buttons, no position, no thumbnails and nothing that drags. Every picture keeps its own aspect ratio from its width and height, so nothing shifts while the pictures load, and the page passes the width they are drawn at, so no one downloads a larger picture than the column needs.",
    ],
    live: (ctx) => (
      <div className={GALLERY_COLUMN}>
        <ProductGallery {...page(ctx).gallery.all} copy={galleryCopy(ctx)} locale={lang(ctx)} />
      </div>
    ),
    states: productGalleryStates,
    statesLayout: "stack",
  },
  "organisms/product-info-accordions": {
    summary:
      "A product's description, details, delivery and returns in sections that open and close, with the text of every section in the page.",
    a11y: [
      "The whole is a region named “Product information”, and each section's title is a button inside a heading (an h2 on the product page), so a screen-reader user can move by heading to a section and find it in the page's outline. The button says whether the section is open and names the panel it controls.",
      "Accordions are used at every width on purpose. Tabs would show one section and hide the rest from find-in-page and from a reader who skims, and the product page's right column is too narrow for a row of tab labels. Several sections can be open at once, and any of them can be shut.",
      "The text of a closed section is still in the page, hidden from view and from assistive technology until it opens, so a search engine reads all of it. The first section is open at first, and a section that starts open is open without JavaScript. Find-in-page does not open a closed section by itself, which is the price of not using hidden=until-found, whose hidden content the design system's clipping check reports.",
      "The titles are at least 44 px tall and fill the row, and a long title wraps beside its arrow. A link in a section is a line of its own at least 44 px tall and not a link inside a sentence, and the facts are a list of labels and values, two columns from 640 px and one label above its value below that.",
      "Tab reaches each title in turn, and Enter or Space opens and closes the section. Every word wraps in every language and is never cut, and the column can shrink, so a long word never widens the page.",
    ],
    live: (ctx) => (
      <div className={INFO_COLUMN}>
        <ProductInfoAccordions
          {...page(ctx).info}
          copy={infoCopy(ctx)}
          locale={lang(ctx)}
          headingLevel={3}
          prefetch={false}
        />
      </div>
    ),
    states: productInfoStates,
    statesLayout: "stack",
  },
  "organisms/reviews-section": {
    summary:
      "A product's reviews: the ratings, the link that writes a review, one page of the reviews, which ones those are, and the pager to the others.",
    a11y: [
      "The section is a region named by its own heading, an h2 on the product page, and each review's heading is one level deeper. It carries the id that the buy box's rating links to, so that link lands on the heading.",
      "The ratings come first and the reviews after them, in the markup and on the page: under 1024 px they are one column, and from 1024 px the ratings and the write link are a column at the start with the reviews beside it, so the reading order, the tab order and the eye agree.",
      "A rating is text as well as a picture: the average and the count, and a list of bars whose items read “5 stars, 94 reviews”. The stars and the bars are hidden from assistive technology so nothing is read twice, and a bar is never the only carrier of a number (WCAG 1.4.1).",
      "The reviews are a list named “Reviews” with an article for each, and a line says which ones this page holds, such as “Showing 1 to 6 of 128 reviews”. The pager is plain links, with every page's address in the markup, so a crawler and a reader without JavaScript can follow them; the current page is marked and named with how many pages there are.",
      "With no reviews the section says so and offers the link that writes the first one, and it draws no row of empty stars (a rating of none), no list and no pager. The write link is a link and at least 44 px tall, and it is left out when the page has nowhere to send a reviewer.",
      "Long names and long words wrap in every language and are never cut. The columns are allowed to shrink, so a long word never widens the page, and the reviews' text is kept to a readable measure.",
    ],
    live: (ctx) => (
      <ReviewsSection
        {...page(ctx).reviews.first}
        copy={reviewsCopy(ctx)}
        locale={lang(ctx)}
        hrefFor={reviewsHref(ctx)}
        headingLevel={3}
        prefetch={false}
      />
    ),
    states: reviewsSectionStates,
    statesLayout: "stack",
  },
  "organisms/size-guide-dialog": {
    summary:
      "A link-styled button beside the size option that opens a dialog with the shop's size table, in centimetres or in inches.",
    a11y: [
      "The button is 44 px tall and says “Size guide”. It opens a modal dialog named “Size guide” and described by what the table measures. Focus moves into the dialog, Tab and Shift+Tab stay inside it, one Escape or the close button closes it, and focus goes back to the button.",
      "The table has a row for each size and a column for each measurement, because a shopper looks up their size and reads across. The sizes are row headers and the measurements are column headers, both with their scope, and the caption says the unit, such as “Measurements in inches”, so the unit is text whichever one is shown.",
      "The unit toggle is a group named “Units” with “Centimeters” and “Inches” as full words, so the visible label is the accessible name (WCAG 2.5.3). One unit is always chosen: pressing the chosen one again does nothing, because a size guide with no unit is not a guide. The market chooses the first (inches in the US) and the reader's choice is kept while the page is open.",
      "Numbers follow the locale, so Greek writes 31,5, and a range is written with the locale's own dash. Inches are the centimetres divided by 2.54, to one decimal, and a range whose two ends round to the same number is written as that number.",
      "At 375 px the table can be wider than the dialog, and then its box scrolls sideways. The box is a region named by the caption, it can be focused with Tab and shows a focus ring, so a keyboard user can scroll it with the arrow keys, which is what axe's scrollable-region-focusable asks.",
      "A dialog taller than the window scrolls inside itself, the long labels wrap in every language and are never cut, and the entry animation stops under reduced motion.",
    ],
    live: (ctx) => (
      <SizeGuideDialog {...page(ctx).sizeGuide} copy={guideCopy(ctx)} locale={lang(ctx)} />
    ),
    states: sizeGuideStates,
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
