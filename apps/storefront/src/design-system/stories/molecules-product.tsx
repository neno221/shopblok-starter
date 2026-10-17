import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  RatingSummary as RatingSummaryData,
  VariantChoice,
} from "@shopblok/registry/contracts";
import { MediaFigure } from "@shopblok/ui/molecules/media-figure";
import { RatingSummary } from "@shopblok/ui/molecules/rating-summary";
import { ReviewItem } from "@shopblok/ui/molecules/review-item";
import { VariantSelector } from "@shopblok/ui/molecules/variant-selector";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of VariantSelector, RatingSummary, ReviewItem and MediaFigure (T32, SETUP.md "Product
// molecules (T32)"). Sample data is `commerceFixtures[ctx.locale]`, copy is
// `catalogs[ctx.locale].molecules`, and the locale every `Intl` call uses is the market's
// `<html lang>`.
//
// A story renders on the server (RSC), so VariantSelector, a client component, gets props that
// serialize: the choice it starts with is `defaultValue`, never a function. Its hidden radio inputs
// are named per part of the page (`name`), because radios of one name outside a form belong to one
// group in the browser, whatever component drew them.

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

// --- VariantSelector ---

/** The Heritage Hoodie's options and variants: XL is sold out in every colour, and sky blue also in XS and XXL. */
function hoodie(ctx: DsContext): VariantChoice {
  const { options, variants } = fixtures(ctx).product;
  return { options, variants };
}

/**
 * The hoodie with a long option name and a long value in each option (the long cart line's), each
 * one bought in every combination.
 */
function longHoodie(ctx: DsContext): VariantChoice {
  const { product, long } = fixtures(ctx);
  const [colourLine, sizeLine] = long.cartLine.options;
  const colour = required(product.options[0], "colour option");
  const size = required(product.options[1], "size option");
  const base = required(
    product.variants.find((variant) => variant.available),
    "variant that can be bought",
  );
  const longColour = {
    id: "colour-long",
    label: required(colourLine, "long colour").value,
    hex: "#a4452c",
  };
  const longSize = { id: "size-long", label: required(sizeLine, "long size").value };
  const options = [
    {
      ...colour,
      title: required(colourLine, "long colour").option,
      values: [...colour.values, longColour],
    },
    { ...size, title: required(sizeLine, "long size").option, values: [...size.values, longSize] },
  ];
  const extra = [
    ...colour.values.map((each) => ({ colour: each.id, size: longSize.id })),
    ...size.values.map((each) => ({ colour: longColour.id, size: each.id })),
    { colour: longColour.id, size: longSize.id },
  ].map((combination) => ({
    ...base,
    id: `var_${combination.colour}_${combination.size}`,
    title: `${combination.colour} / ${combination.size}`,
    options: combination,
    available: true,
    stock: { status: "in-stock" as const },
  }));
  return { options, variants: [...product.variants, ...extra] };
}

/** The hoodie in black with its sizes alone: a product with one option. */
function sizesOnly(ctx: DsContext): VariantChoice {
  const { options, variants } = hoodie(ctx);
  return {
    options: [
      required(
        options.find((option) => option.id === "size"),
        "size option",
      ),
    ],
    variants: variants
      .filter((variant) => variant.options.colour === "colour-black")
      .map((variant) => ({
        ...variant,
        options: { size: required(variant.options.size, "size") },
      })),
  };
}

function selector(
  ctx: DsContext,
  name: string,
  choice: VariantChoice,
  defaultValue?: Record<string, string>,
) {
  return (
    <VariantSelector
      {...choice}
      defaultValue={defaultValue}
      copy={copy(ctx).variantSelector}
      locale={lang(ctx)}
      name={name}
    />
  );
}

const variantSelectorStates: readonly DsState[] = [
  {
    id: "default",
    label: "Default",
    description:
      "Nothing chosen: each group is named by its option, and a value that no variant has is already unavailable (XL).",
    render: (ctx) => selector(ctx, "ds-default", hoodie(ctx)),
  },
  {
    id: "chosen",
    label: "Value chosen",
    description: "The group's name says the choice (“Color: Oatmeal”).",
    render: (ctx) =>
      selector(ctx, "ds-chosen", hoodie(ctx), { colour: "colour-oatmeal", size: "size-m" }),
  },
  {
    id: "unavailable-chosen",
    label: "Unavailable value chosen",
    description:
      "Sky blue in XXL is sold out: XXL stays chosen, struck through and announced as unavailable, and so do XS and XL.",
    render: (ctx) =>
      selector(ctx, "ds-unavailable-chosen", hoodie(ctx), {
        colour: "colour-sky",
        size: "size-xxl",
      }),
  },
  {
    id: "none-available",
    label: "Every value unavailable",
    description:
      "XL is sold out in every colour, so with XL chosen all four colours are struck through.",
    render: (ctx) => selector(ctx, "ds-none-available", hoodie(ctx), { size: "size-xl" }),
  },
  {
    id: "long-label",
    label: "Long label",
    description: "A long option name and a long value wrap; the pill stays inside its column.",
    render: (ctx) =>
      selector(ctx, "ds-long-label", longHoodie(ctx), {
        colour: "colour-long",
        size: "size-long",
      }),
  },
  {
    id: "one-option",
    label: "One option only",
    render: (ctx) => selector(ctx, "ds-one-option", sizesOnly(ctx), { size: "size-l" }),
  },
];

// --- RatingSummary ---

/** A summary whose five rows (5 stars first) are `counts`, with the average they give. */
function summaryOf(counts: [number, number, number, number, number]): RatingSummaryData {
  const count = counts.reduce((sum, each) => sum + each, 0);
  const points = counts.reduce((sum, each, index) => sum + each * (5 - index), 0);
  return {
    average: count === 0 ? 0 : Math.round((points / count) * 10) / 10,
    count,
    distribution: counts.map((each, index) => ({ stars: 5 - index, count: each })),
  };
}

function ratingSummary(ctx: DsContext, summary: RatingSummaryData) {
  return (
    <RatingSummary
      summary={summary}
      copy={copy(ctx).ratingSummary}
      locale={lang(ctx)}
      className="max-w-sm"
    />
  );
}

const ratingSummaryStates: readonly DsState[] = [
  {
    id: "reviews",
    label: "With reviews",
    description: "128 ratings, mostly five stars.",
    render: (ctx) => ratingSummary(ctx, fixtures(ctx).ratingSummary),
  },
  {
    id: "one-review",
    label: "One review",
    description: "The count and the row use the singular.",
    render: (ctx) => ratingSummary(ctx, summaryOf([0, 0, 0, 1, 0])),
  },
  {
    id: "none",
    label: "No reviews",
    description: "The message alone: no stars and no empty bars.",
    render: (ctx) => ratingSummary(ctx, summaryOf([0, 0, 0, 0, 0])),
  },
  {
    id: "long",
    label: "Long",
    description:
      "Counts in the millions: the numbers' column widens and all the bars still share their columns.",
    render: (ctx) =>
      ratingSummary(ctx, summaryOf([9_400_000, 2_200_000, 800_000, 200_000, 200_000])),
  },
];

// --- ReviewItem ---

function review(ctx: DsContext, item: (typeof commerceFixtures)["en"]["reviews"][number]) {
  return (
    <ReviewItem review={item} copy={copy(ctx).reviewItem} locale={lang(ctx)} headingLevel={4} />
  );
}

const reviewItemStates: readonly DsState[] = [
  {
    id: "title-verified",
    label: "Title, verified",
    render: (ctx) => review(ctx, required(fixtures(ctx).reviews[0], "review")),
  },
  {
    id: "title-unverified",
    label: "Title, not verified",
    description: "No mark, and nothing in its place.",
    render: (ctx) => review(ctx, required(fixtures(ctx).reviews[5], "review")),
  },
  {
    id: "no-title-unverified",
    label: "No title",
    description: "The author is the heading, and the byline does not repeat the name.",
    render: (ctx) => review(ctx, required(fixtures(ctx).reviews[3], "review")),
  },
  {
    id: "no-title-verified",
    label: "No title, verified",
    render: (ctx) => {
      const { title: _title, ...untitled } = required(fixtures(ctx).reviews[1], "review");
      return review(ctx, untitled);
    },
  },
  {
    id: "low-rating",
    label: "Two stars",
    render: (ctx) => review(ctx, required(fixtures(ctx).reviews[4], "review")),
  },
  {
    id: "long",
    label: "Long",
    description: "A long title and five paragraphs: the review wraps and keeps its paragraphs.",
    render: (ctx) => review(ctx, fixtures(ctx).long.review),
  },
];

// --- MediaFigure ---

const figureSizes = "(min-width: 768px) 400px, 100vw";

function mediaFigure(ctx: DsContext, figure: (typeof commerceFixtures)["en"]["figure"]) {
  return (
    <MediaFigure
      figure={figure}
      copy={copy(ctx).mediaFigure}
      locale={lang(ctx)}
      sizes={figureSizes}
      className="max-w-lg"
    />
  );
}

const mediaFigureStates: readonly DsState[] = [
  {
    id: "caption-credit",
    label: "Caption and credit",
    render: (ctx) => mediaFigure(ctx, fixtures(ctx).figure),
  },
  {
    id: "caption",
    label: "Caption only",
    render: (ctx) => {
      const { credit: _credit, ...figure } = fixtures(ctx).figure;
      return mediaFigure(ctx, figure);
    },
  },
  {
    id: "credit",
    label: "Credit only",
    render: (ctx) => {
      const { caption: _caption, ...figure } = fixtures(ctx).figure;
      return mediaFigure(ctx, figure);
    },
  },
  {
    id: "none",
    label: "No caption, no credit",
    description: "A figure with its picture alone: no <figcaption>.",
    render: (ctx) => mediaFigure(ctx, { image: fixtures(ctx).figure.image }),
  },
  {
    id: "long",
    label: "Long",
    description: "A long caption and a long credit wrap under the picture.",
    render: (ctx) =>
      mediaFigure(ctx, {
        image: fixtures(ctx).figure.image,
        caption: ctx.fixture.long.productDescription,
        credit: ctx.fixture.long.personName,
      }),
  },
];

export const productMoleculeStories = {
  "molecules/variant-selector": {
    summary:
      "A product's options as radio groups: swatches for colours, pills for sizes, with the values no variant can be bought with marked unavailable.",
    a11y: [
      "Each option is a radio group (Base UI): Tab enters it at the chosen value, or the first, the arrow keys move and select, Space selects and Tab leaves it.",
      "The group is named by the line above it, which also says the choice (“Color: Oatmeal”, an ICU message of the copy), so the name is read once.",
      "A value with no available variant for the other options' choice is unavailable: struck through and “…, Unavailable” in its name, so colour and a line are not the only sign (WCAG 1.4.1). It stays focusable and selectable.",
      "Swatches and pills are at least 44 × 44 px (D32) and draw the ring at full strength. `name` makes the hidden radio inputs submit as `{name}.{option id}` without JavaScript.",
    ],
    live: (ctx) => (
      <div className="max-w-md">
        {selector(ctx, "ds-live", hoodie(ctx), { colour: "colour-oatmeal" })}
      </div>
    ),
    states: variantSelectorStates,
  },
  "molecules/rating-summary": {
    summary:
      "The average with the Rating atom, how many reviews it rests on, and a bar for each star with its numbers as text.",
    a11y: [
      "The average is the Rating atom's name (“4.6 out of 5”); the large number beside it is hidden from assistive technology so it is not read twice.",
      "Each bar's row is a list item that reads “5 stars, 94 reviews”: the bars repeat what the text says and are not the only carrier of the number (WCAG 1.4.1).",
      "The count follows the language's plural (“Based on 1 review”, “Based on 128 reviews”). With no reviews the message stands alone, with no stars and no bars.",
    ],
    live: (ctx) => ratingSummary(ctx, fixtures(ctx).ratingSummary),
    states: ratingSummaryStates,
  },
  "molecules/review-item": {
    summary:
      "One review: its rating, title, author, date, a verified mark and the text, as an article.",
    a11y: [
      "An <article> whose heading is the review's title, or the author when it has none; `headingLevel` (default h3) puts it in the page's outline.",
      "The rating is named “Rated 4 out of 5”; the date is a <time> in the market's format; the verified mark is an icon and the words “Verified purchase”.",
      "The body keeps its paragraphs, and long words wrap instead of widening the page.",
    ],
    live: (ctx) => (
      <div className="flex max-w-2xl flex-col divide-y">
        {fixtures(ctx)
          .reviews.slice(0, 3)
          .map((item) => (
            <ReviewItem
              key={item.id}
              review={item}
              copy={copy(ctx).reviewItem}
              locale={lang(ctx)}
              className="py-5 first:pt-0 last:pb-0"
            />
          ))}
      </div>
    ),
    states: reviewItemStates,
  },
  "molecules/media-figure": {
    summary: "A picture with a caption and a credit under it, as a figure; either may be missing.",
    a11y: [
      "A <figure> with a <figcaption>: the caption names the figure, and the picture keeps its own alternative text.",
      "The credit is written by the copy (“Photo: Shopblok Studio”), so its wording follows the language.",
      "Without a caption and a credit there is no <figcaption>; `sizes` is required, as the Image atom's is.",
    ],
    live: (ctx) => mediaFigure(ctx, fixtures(ctx).figure),
    states: mediaFigureStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
