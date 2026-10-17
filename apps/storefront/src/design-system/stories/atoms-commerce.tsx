import { designSystemFixtures, sampleImage } from "@shopblok/fixtures";
import {
  catalogs,
  countryName as intlCountryName,
  formatMessage,
  formatNumber,
  type Locale,
} from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import { Chip } from "@shopblok/ui/atoms/chip";
import { Flag } from "@shopblok/ui/atoms/flag";
import { isFlagCode } from "@shopblok/ui/atoms/flag-code";
import { Icon } from "@shopblok/ui/atoms/icon";
import { IconButton } from "@shopblok/ui/atoms/icon-button";
import { Image } from "@shopblok/ui/atoms/image";
import { Link } from "@shopblok/ui/atoms/link";
import { Logo } from "@shopblok/ui/atoms/logo";
import { PaymentIcon, paymentBrands } from "@shopblok/ui/atoms/payment-icon";
import { Price } from "@shopblok/ui/atoms/price";
import { QuantityStepper } from "@shopblok/ui/atoms/quantity-stepper";
import { Rating } from "@shopblok/ui/atoms/rating";
import { Skeleton } from "@shopblok/ui/atoms/skeleton";
import { SizePill } from "@shopblok/ui/atoms/size-pill";
import { StockIndicator, type StockStatus } from "@shopblok/ui/atoms/stock-indicator";
import { Swatch } from "@shopblok/ui/atoms/swatch";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { HeartIcon, StarIcon } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { RemovableChip } from "../components/removable-chip";
import type { DsContext, DsStory } from "../types";
import { FOCUS } from "./atoms";

// The stories of the 15 atoms T23 adds (SETUP.md, "Atoms (T23)"); the registry lists them after the
// 17 shadcn atoms of `atoms.tsx`. The same rules: every sample string is from `ctx.fixture`, the
// atoms' own copy from `catalogs[locale].atoms`, and each page renders the live render and every
// state, so an `id` or a `name` that could repeat carries the state it is in.
//
// An atom whose accessible name is not drawn (an icon button, a swatch, a rating) is shown with that
// name as a caption (`Named`), so the page shows what a screen reader says. Hover and keyboard focus
// cannot be held still on a static page, so those states draw the classes `:hover` and
// `:focus-visible` add; the description says so.

const row = "flex flex-wrap items-center gap-3";

/** A control with its accessible name written under it. */
function Named({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex max-w-full min-w-0 flex-col items-start gap-2">
      {children}
      <p className="text-muted-foreground max-w-full text-xs wrap-anywhere">{name}</p>
    </div>
  );
}

const copy = (ctx: DsContext) => catalogs[ctx.locale].atoms;

/** The value drawn beside the stars: always one decimal ("4.0"). */
const ratingValue = (ctx: DsContext, value: number) =>
  formatNumber(value, ctx.fixture.market.htmlLang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/** The spoken value: no padded zero ("3 out of 5", not "3.0"), `max` in the same format. */
const ratingLabel = (ctx: DsContext, value: number) => {
  const lang = ctx.fixture.market.htmlLang;
  const options = { maximumFractionDigits: 1 };
  return formatMessage(
    copy(ctx).rating.label,
    {
      value: formatNumber(value, lang, options),
      max: formatNumber(ctx.fixture.rating.max, lang, options),
    },
    lang,
  );
};

/** What the stock count says: out at zero, low at the threshold or under, in stock above it. */
function stockStatus(ctx: DsContext, count: number): StockStatus {
  if (count <= 0) return "out";
  return count <= ctx.fixture.stock.lowThreshold ? "low" : "in-stock";
}

function stockText(ctx: DsContext, count: number): string {
  const status = stockStatus(ctx, count);
  const text = copy(ctx).stock;
  if (status === "out") return text.outOfStock;
  return status === "low"
    ? formatMessage(text.low, { count }, ctx.fixture.market.htmlLang)
    : text.inStock;
}

/** The country's name in the locale, from `Intl` (never a literal). */
const countryName = (ctx: DsContext, code: string) =>
  intlCountryName(code, ctx.fixture.market.htmlLang);

/** The four markets of the DS (D33), as ISO codes. */
const marketCodes = (Object.keys(designSystemFixtures) as Locale[]).map(
  (locale) => designSystemFixtures[locale].market.country,
);

/** The first of the fixture's sizes that is sold out. */
const soldOutSize = (ctx: DsContext) => ctx.fixture.sizes.find((size) => !size.available);

const sampleMark = (
  <svg viewBox="0 0 120 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="currentColor" />
    <rect x="44" y="6" width="76" height="6" rx="3" fill="currentColor" />
    <rect x="44" y="20" width="48" height="6" rx="3" fill="currentColor" />
  </svg>
);

export const commerceAtomStories = {
  "atoms/icon-button": {
    summary: "A button that is only an icon: Button's icon size, named by a required label.",
    a11y: [
      "`label` is required by the type and is the accessible name; the icon inside is aria-hidden.",
      "44 × 44 px (48 in the large size), D32. Enter and Space press it.",
      "The focus ring is the ring token at full strength (D35).",
    ],
    live: (ctx) => (
      <div className={row}>
        {(["default", "outline", "secondary", "ghost", "destructive"] as const).map((variant) => (
          <IconButton key={variant} variant={variant} label={ctx.fixture.ordinary.hint}>
            <HeartIcon />
          </IconButton>
        ))}
      </div>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => (
          <Named name={ctx.fixture.ordinary.hint}>
            <IconButton label={ctx.fixture.ordinary.hint}>
              <HeartIcon />
            </IconButton>
          </Named>
        ),
      },
      {
        id: "hover",
        label: "Hover",
        description: "The fill `:hover` gives the default variant.",
        render: (ctx) => (
          <IconButton label={ctx.fixture.ordinary.hint} className="bg-primary/80">
            <HeartIcon />
          </IconButton>
        ),
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => (
          <IconButton label={ctx.fixture.ordinary.hint} className={FOCUS}>
            <HeartIcon />
          </IconButton>
        ),
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => (
          <IconButton label={ctx.fixture.ordinary.hint} disabled>
            <HeartIcon />
          </IconButton>
        ),
      },
      {
        id: "large",
        label: "Large",
        render: (ctx) => (
          <IconButton label={ctx.fixture.ordinary.hint} size="lg" variant="outline">
            <HeartIcon />
          </IconButton>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The name is long and is not drawn; the button stays 44 px.",
        render: (ctx) => (
          <Named name={ctx.fixture.long.hint}>
            <IconButton label={ctx.fixture.long.hint} variant="outline">
              <HeartIcon />
            </IconButton>
          </Named>
        ),
      },
    ],
  },
  "atoms/link": {
    summary: "next/link with the link styles: inline in text, or standalone as a 44 px target.",
    a11y: [
      "A real anchor: Enter follows it. The underline marks it as a link, so colour is not the only sign (WCAG 1.4.1).",
      "target=_blank adds rel=noopener noreferrer, and `newTabLabel` tells screen readers it opens a new tab.",
      "`aria-current` passes through and is drawn bold. A link inside a sentence is exempt from 44 px (WCAG 2.5.8); the standalone variant is 44 px (D32).",
    ],
    live: (ctx) => (
      <p className="max-w-prose text-sm leading-relaxed">
        {ctx.fixture.ordinary.helpText}{" "}
        <Link href={`/design-system/${ctx.locale}/atoms/link` as Route}>
          {ctx.fixture.ordinary.linkLabel}
        </Link>
      </p>
    ),
    states: [
      {
        id: "inline",
        label: "Inline",
        render: (ctx) => (
          <p className="text-sm leading-relaxed">
            {ctx.fixture.ordinary.helpText}{" "}
            <Link href={`/design-system/${ctx.locale}/atoms/link` as Route}>
              {ctx.fixture.ordinary.linkLabel}
            </Link>
          </p>
        ),
      },
      {
        id: "standalone",
        label: "Standalone",
        description: "At least 44 px tall (D32).",
        render: (ctx) => (
          <Link href={`/design-system/${ctx.locale}/atoms/link` as Route} variant="standalone">
            {ctx.fixture.ordinary.linkLabel}
          </Link>
        ),
      },
      {
        id: "hover",
        label: "Hover",
        description: "The thicker underline `:hover` draws.",
        render: (ctx) => (
          <Link
            href={`/design-system/${ctx.locale}/atoms/link` as Route}
            variant="standalone"
            className="decoration-2"
          >
            {ctx.fixture.ordinary.linkLabel}
          </Link>
        ),
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => (
          <Link
            href={`/design-system/${ctx.locale}/atoms/link` as Route}
            variant="standalone"
            className={FOCUS}
          >
            {ctx.fixture.ordinary.linkLabel}
          </Link>
        ),
      },
      {
        id: "current",
        label: "Current page",
        description: "`aria-current=page`.",
        render: (ctx) => (
          <Link
            href={`/design-system/${ctx.locale}/atoms/link` as Route}
            variant="standalone"
            aria-current="page"
          >
            {ctx.fixture.ordinary.linkLabel}
          </Link>
        ),
      },
      {
        id: "new-tab",
        label: "New tab",
        description: "rel=noopener noreferrer, and a hidden note for screen readers.",
        render: (ctx) => (
          <Link
            href="https://example.com"
            target="_blank"
            variant="standalone"
            newTabLabel={copy(ctx).link.newTab}
          >
            {ctx.fixture.ordinary.linkLabel}
          </Link>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "Wraps; the link grows taller.",
        render: (ctx) => (
          <Link href={`/design-system/${ctx.locale}/atoms/link` as Route} variant="standalone">
            {ctx.fixture.long.linkLabel}
          </Link>
        ),
      },
    ],
  },
  "atoms/chip": {
    summary: "A short tag, such as an applied filter, with an optional remove button.",
    a11y: [
      "The remove button is named by `removeLabel` (required with `onRemove`); the cross is aria-hidden.",
      "The remove button is 44 × 44 px (D32) while the chip stays 32 px tall, so a row of chips is compact and still easy to hit.",
      "Long text wraps inside the chip instead of being cut.",
    ],
    live: (ctx) => (
      <div className={row}>
        <Chip>{ctx.fixture.ordinary.chipLabel}</Chip>
        <Chip variant="outline">{ctx.fixture.ordinary.chipLabel}</Chip>
        <RemovableChip removeLabel={copy(ctx).chip.remove}>
          {ctx.fixture.ordinary.chipLabel}
        </RemovableChip>
      </div>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => <Chip>{ctx.fixture.ordinary.chipLabel}</Chip>,
      },
      {
        id: "outline",
        label: "Outline",
        render: (ctx) => <Chip variant="outline">{ctx.fixture.ordinary.chipLabel}</Chip>,
      },
      {
        id: "removable",
        label: "Removable",
        render: (ctx) => (
          <RemovableChip removeLabel={copy(ctx).chip.remove}>
            {ctx.fixture.ordinary.chipLabel}
          </RemovableChip>
        ),
      },
      {
        id: "hover",
        label: "Remove hovered",
        description: "The fill `:hover` gives the remove button.",
        render: (ctx) => (
          <RemovableChip
            removeLabel={copy(ctx).chip.remove}
            className="[&_[data-slot=chip-remove]]:bg-muted"
          >
            {ctx.fixture.ordinary.chipLabel}
          </RemovableChip>
        ),
      },
      {
        id: "focus",
        label: "Remove focused",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => (
          <RemovableChip
            removeLabel={copy(ctx).chip.remove}
            className="[&_[data-slot=chip-remove]]:border-ring [&_[data-slot=chip-remove]]:ring-3 [&_[data-slot=chip-remove]]:ring-ring"
          >
            {ctx.fixture.ordinary.chipLabel}
          </RemovableChip>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "Wraps; the chip grows taller.",
        render: (ctx) => (
          <RemovableChip removeLabel={copy(ctx).chip.remove}>
            {ctx.fixture.long.chipLabel}
          </RemovableChip>
        ),
      },
    ],
  },
  "atoms/price": {
    summary:
      "An amount in the market's currency and the page's locale; a sale shows the original struck through.",
    a11y: [
      "Amounts are in major units and formatted by formatMoney (Intl): the symbol's side, the grouping and the decimal mark follow the locale.",
      "On sale, the sale price and the struck-through original each have a visually hidden label, because colour and a line alone do not say which is which (WCAG 1.4.1).",
      "Colours are the price, price-sale and price-original tokens, each at least 4.5:1 on the background (D35).",
    ],
    live: (ctx) => (
      <div className={row}>
        <Price
          amount={ctx.fixture.prices.regular}
          currency={ctx.fixture.market.currency}
          locale={ctx.fixture.market.htmlLang}
        />
        <Price
          amount={ctx.fixture.prices.sale.amount}
          original={ctx.fixture.prices.sale.original}
          saleLabel={copy(ctx).price.sale}
          originalLabel={copy(ctx).price.original}
          currency={ctx.fixture.market.currency}
          locale={ctx.fixture.market.htmlLang}
        />
      </div>
    ),
    states: [
      {
        id: "regular",
        label: "Regular",
        render: (ctx) => (
          <Price
            amount={ctx.fixture.prices.regular}
            currency={ctx.fixture.market.currency}
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "sale",
        label: "Sale",
        description: "The sale price, then the original struck through; each has a hidden label.",
        render: (ctx) => (
          <Price
            amount={ctx.fixture.prices.sale.amount}
            original={ctx.fixture.prices.sale.original}
            saleLabel={copy(ctx).price.sale}
            originalLabel={copy(ctx).price.original}
            currency={ctx.fixture.market.currency}
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "high",
        label: "Four digits",
        description: "Shows the locale's grouping and decimal marks.",
        render: (ctx) => (
          <Price
            amount={ctx.fixture.prices.high}
            currency={ctx.fixture.market.currency}
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "sizes",
        label: "Sizes",
        render: (ctx) => (
          <div className="flex flex-col items-start gap-2">
            {(["sm", "default", "lg"] as const).map((size) => (
              <Price
                key={size}
                size={size}
                amount={ctx.fixture.prices.sale.amount}
                original={ctx.fixture.prices.sale.original}
                saleLabel={copy(ctx).price.sale}
                originalLabel={copy(ctx).price.original}
                currency={ctx.fixture.market.currency}
                locale={ctx.fixture.market.htmlLang}
              />
            ))}
          </div>
        ),
      },
      {
        id: "labels",
        label: "Hidden labels",
        description:
          "The two labels are not drawn, so this state shows them: a screen reader says each before its price.",
        render: (ctx) => (
          <Named name={`${copy(ctx).price.sale}, ${copy(ctx).price.original}`}>
            <Price
              size="lg"
              amount={ctx.fixture.prices.high}
              original={ctx.fixture.prices.high * 1.2}
              saleLabel={copy(ctx).price.sale}
              originalLabel={copy(ctx).price.original}
              currency={ctx.fixture.market.currency}
              locale={ctx.fixture.market.htmlLang}
            />
          </Named>
        ),
      },
    ],
  },
  "atoms/rating": {
    summary: "A read-only rating out of five, halves included (ReUI).",
    a11y: [
      'One image named by `label` ("4,5 out of 5", in the page\'s language); the stars are hidden from assistive technology.',
      "The value is shown to the nearest half star and also as text when `valueText` is given, so it is never colour alone (WCAG 1.4.1).",
      "Read-only: it takes no focus. Entering a rating is a different control (M4).",
    ],
    live: (ctx) => (
      <Rating
        value={ctx.fixture.rating.value}
        max={ctx.fixture.rating.max}
        label={ratingLabel(ctx, ctx.fixture.rating.value)}
        valueText={ratingValue(ctx, ctx.fixture.rating.value)}
      />
    ),
    states: [
      ...([4.5, 3, 0] as const).map((value) => ({
        id: `value-${String(value).replace(".", "-")}`,
        label: `Value ${value}`,
        render: (ctx: DsContext) => (
          <Named name={ratingLabel(ctx, value)}>
            <Rating
              value={value}
              max={ctx.fixture.rating.max}
              label={ratingLabel(ctx, value)}
              valueText={ratingValue(ctx, value)}
            />
          </Named>
        ),
      })),
      {
        id: "fixture",
        label: "The fixture's value",
        description: "Rounded to the nearest half star.",
        render: (ctx) => (
          <Named name={ratingLabel(ctx, ctx.fixture.rating.value)}>
            <Rating
              value={ctx.fixture.rating.value}
              max={ctx.fixture.rating.max}
              label={ratingLabel(ctx, ctx.fixture.rating.value)}
            />
          </Named>
        ),
      },
      {
        id: "sizes",
        label: "Sizes",
        render: (ctx) => (
          <div className="flex flex-col items-start gap-2">
            {(["sm", "default", "lg"] as const).map((size) => (
              <Rating
                key={size}
                size={size}
                value={ctx.fixture.rating.value}
                max={ctx.fixture.rating.max}
                label={ratingLabel(ctx, ctx.fixture.rating.value)}
                valueText={ratingValue(ctx, ctx.fixture.rating.value)}
              />
            ))}
          </div>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The name is long and is not drawn.",
        render: (ctx) => (
          <Named name={ctx.fixture.long.helpText}>
            <Rating
              value={ctx.fixture.rating.value}
              max={ctx.fixture.rating.max}
              label={ctx.fixture.long.helpText}
            />
          </Named>
        ),
      },
    ],
  },
  "atoms/swatch": {
    summary: "One colour (or image) of a product's colour option, as a 44 px button.",
    a11y: [
      "A button with aria-pressed, named by `label`. M2's VariantSelector adds radio semantics around a group of them.",
      "44 × 44 px (D32) around a 32 px disc. Selected is a thicker edge as well as a colour (WCAG 1.4.1).",
      "Unavailable is struck through and adds `unavailableLabel` to the name; it stays reachable so a reader can be told. Disabled cannot be used.",
    ],
    live: (ctx) => (
      <div className={row}>
        {ctx.fixture.colours.map((colour, index) => (
          <Swatch
            key={colour.hex}
            label={colour.name}
            colour={colour.hex}
            selected={index === 0}
            unavailable={index === ctx.fixture.colours.length - 1}
            unavailableLabel={copy(ctx).variant.unavailable}
          />
        ))}
      </div>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => {
          const [colour] = ctx.fixture.colours;
          return colour ? (
            <Named name={colour.name}>
              <Swatch label={colour.name} colour={colour.hex} />
            </Named>
          ) : null;
        },
      },
      {
        id: "selected",
        label: "Selected",
        render: (ctx) => {
          const colour = ctx.fixture.colours[1];
          return colour ? (
            <Named name={colour.name}>
              <Swatch label={colour.name} colour={colour.hex} selected />
            </Named>
          ) : null;
        },
      },
      {
        id: "hover",
        label: "Hover",
        description: "The edge `:hover` draws.",
        render: (ctx) => {
          const colour = ctx.fixture.colours[2];
          return colour ? (
            <Swatch label={colour.name} colour={colour.hex} className="border-border" />
          ) : null;
        },
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => {
          const colour = ctx.fixture.colours[2];
          return colour ? (
            <Swatch label={colour.name} colour={colour.hex} className={FOCUS} />
          ) : null;
        },
      },
      {
        id: "unavailable",
        label: "Unavailable",
        description: "Struck through; the name says so.",
        render: (ctx) => {
          const colour = ctx.fixture.colours[4];
          return colour ? (
            <Named name={`${colour.name}, ${copy(ctx).variant.unavailable}`}>
              <Swatch
                label={colour.name}
                colour={colour.hex}
                unavailable
                unavailableLabel={copy(ctx).variant.unavailable}
              />
            </Named>
          ) : null;
        },
      },
      {
        id: "selected-unavailable",
        label: "Selected and unavailable",
        description: "A sold-out colour that has been picked: the thicker edge and the line.",
        render: (ctx) => {
          const colour = ctx.fixture.colours[4];
          return colour ? (
            <Named name={`${colour.name}, ${copy(ctx).variant.unavailable}`}>
              <Swatch
                label={colour.name}
                colour={colour.hex}
                selected
                unavailable
                unavailableLabel={copy(ctx).variant.unavailable}
              />
            </Named>
          ) : null;
        },
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => {
          const colour = ctx.fixture.colours[3];
          return colour ? <Swatch label={colour.name} colour={colour.hex} disabled /> : null;
        },
      },
      {
        id: "image",
        label: "Image",
        render: (ctx) => (
          <Named name={ctx.fixture.ordinary.imageAlt}>
            <Swatch label={ctx.fixture.ordinary.imageAlt} image={sampleImage.src} />
          </Named>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The name is long and is not drawn.",
        render: (ctx) => (
          <Named name={ctx.fixture.long.imageAlt}>
            <Swatch label={ctx.fixture.long.imageAlt} image={sampleImage.src} selected />
          </Named>
        ),
      },
    ],
  },
  "atoms/size-pill": {
    summary: "One size option as a pill, at least 44 × 44 px.",
    a11y: [
      "A button with aria-pressed. M2's VariantSelector adds radio semantics around a group of them.",
      "Selected is a solid fill, unavailable is struck through and adds `unavailableLabel` to the name (WCAG 1.4.1). Unavailable stays reachable; disabled cannot be used.",
      "At least 44 × 44 px (D32); a long label wraps.",
    ],
    live: (ctx) => (
      <div className={row}>
        {ctx.fixture.sizes.map((size, index) => (
          <SizePill
            key={size.label}
            selected={index === 1}
            unavailable={!size.available}
            unavailableLabel={copy(ctx).variant.unavailable}
          >
            {size.label}
          </SizePill>
        ))}
      </div>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => <SizePill>{ctx.fixture.sizes[2]?.label}</SizePill>,
      },
      {
        id: "selected",
        label: "Selected",
        render: (ctx) => <SizePill selected>{ctx.fixture.sizes[2]?.label}</SizePill>,
      },
      {
        id: "hover",
        label: "Hover",
        description: "The fill `:hover` draws.",
        render: (ctx) => <SizePill className="bg-muted">{ctx.fixture.sizes[2]?.label}</SizePill>,
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => <SizePill className={FOCUS}>{ctx.fixture.sizes[2]?.label}</SizePill>,
      },
      {
        id: "unavailable",
        label: "Unavailable",
        description: "Struck through; the name says so.",
        render: (ctx) => (
          <SizePill unavailable unavailableLabel={copy(ctx).variant.unavailable}>
            {soldOutSize(ctx)?.label}
          </SizePill>
        ),
      },
      {
        id: "selected-unavailable",
        label: "Selected and unavailable",
        description:
          "A sold-out size that has been picked: the fill's own text colour, struck through.",
        render: (ctx) => (
          <SizePill selected unavailable unavailableLabel={copy(ctx).variant.unavailable}>
            {soldOutSize(ctx)?.label}
          </SizePill>
        ),
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => <SizePill disabled>{ctx.fixture.sizes[2]?.label}</SizePill>,
      },
      {
        id: "long-label",
        label: "Long label",
        description: "Wraps; the pill grows taller.",
        render: (ctx) => <SizePill>{ctx.fixture.long.optionLabel}</SizePill>,
      },
    ],
  },
  "atoms/quantity-stepper": {
    summary: "A number field with minus and plus buttons (ReUI's number-field on Base UI).",
    a11y: [
      "The input is named by `label`, the buttons by `decrementLabel` and `incrementLabel` (D30).",
      "Tab reaches the input; ArrowUp and ArrowDown (Shift for 10) change the value, and what is typed is clamped to the minimum and maximum. The buttons are for pointers and take no Tab stop, as Base UI's number field has it.",
      "Both buttons are 44 × 44 px and the input is 44 px tall (D32). At the minimum or maximum the button is disabled.",
    ],
    live: (ctx) => (
      <QuantityStepper
        label={copy(ctx).quantityStepper.label}
        decrementLabel={copy(ctx).quantityStepper.decrease}
        incrementLabel={copy(ctx).quantityStepper.increase}
        defaultValue={2}
        min={1}
        max={10}
        locale={ctx.fixture.market.htmlLang}
      />
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => (
          <QuantityStepper
            label={copy(ctx).quantityStepper.label}
            decrementLabel={copy(ctx).quantityStepper.decrease}
            incrementLabel={copy(ctx).quantityStepper.increase}
            defaultValue={2}
            max={10}
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "minimum",
        label: "At the minimum",
        description: "The minus button is disabled.",
        render: (ctx) => (
          <QuantityStepper
            label={copy(ctx).quantityStepper.label}
            decrementLabel={copy(ctx).quantityStepper.decrease}
            incrementLabel={copy(ctx).quantityStepper.increase}
            defaultValue={1}
            min={1}
            max={10}
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "maximum",
        label: "At the maximum",
        description: "The plus button is disabled.",
        render: (ctx) => (
          <QuantityStepper
            label={copy(ctx).quantityStepper.label}
            decrementLabel={copy(ctx).quantityStepper.decrease}
            incrementLabel={copy(ctx).quantityStepper.increase}
            defaultValue={ctx.fixture.stock.lowStock}
            min={1}
            max={ctx.fixture.stock.lowStock}
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "focus",
        label: "Focus",
        description:
          "The ring `:focus-visible` draws round the whole field, at full strength (D35).",
        render: (ctx) => (
          <QuantityStepper
            label={copy(ctx).quantityStepper.label}
            decrementLabel={copy(ctx).quantityStepper.decrease}
            incrementLabel={copy(ctx).quantityStepper.increase}
            defaultValue={2}
            max={10}
            locale={ctx.fixture.market.htmlLang}
            className="[&_[data-slot=quantity-stepper-group]]:border-ring [&_[data-slot=quantity-stepper-group]]:ring-3 [&_[data-slot=quantity-stepper-group]]:ring-ring"
          />
        ),
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => (
          <QuantityStepper
            label={copy(ctx).quantityStepper.label}
            decrementLabel={copy(ctx).quantityStepper.decrease}
            incrementLabel={copy(ctx).quantityStepper.increase}
            defaultValue={2}
            disabled
            locale={ctx.fixture.market.htmlLang}
          />
        ),
      },
      {
        id: "long-label",
        label: "Long labels",
        description: "The names are long and are not drawn.",
        render: (ctx) => (
          <Named
            name={`${ctx.fixture.long.fieldLabel} / ${ctx.fixture.long.hint} / ${ctx.fixture.long.optionLabel}`}
          >
            <QuantityStepper
              label={ctx.fixture.long.fieldLabel}
              decrementLabel={ctx.fixture.long.hint}
              incrementLabel={ctx.fixture.long.optionLabel}
              defaultValue={2}
              max={10}
              locale={ctx.fixture.market.htmlLang}
            />
          </Named>
        ),
      },
    ],
  },
  "atoms/stock-indicator": {
    summary: "Whether a product can be bought: in stock, low, or out, in words and colour.",
    a11y: [
      "The state is written as text and drawn as an icon of its own shape, as well as in colour (WCAG 1.4.1).",
      "The colours are the stock-in, stock-low and stock-out tokens, each at least 4.5:1 on the background (D35).",
      "Plain text: no live region. A page that changes the stock after a choice says so where the choice is made.",
    ],
    live: (ctx) => (
      <div className="flex flex-col items-start gap-2">
        {[ctx.fixture.stock.inStock, ctx.fixture.stock.lowStock, ctx.fixture.stock.outOfStock].map(
          (count) => (
            <StockIndicator
              key={count}
              status={stockStatus(ctx, count)}
              text={stockText(ctx, count)}
            />
          ),
        )}
      </div>
    ),
    states: [
      {
        id: "in-stock",
        label: "In stock",
        render: (ctx) => (
          <StockIndicator
            status={stockStatus(ctx, ctx.fixture.stock.inStock)}
            text={stockText(ctx, ctx.fixture.stock.inStock)}
          />
        ),
      },
      {
        id: "low",
        label: "Low",
        description: "At or under the threshold, with the count.",
        render: (ctx) => (
          <StockIndicator
            status={stockStatus(ctx, ctx.fixture.stock.lowStock)}
            text={stockText(ctx, ctx.fixture.stock.lowStock)}
          />
        ),
      },
      {
        id: "out",
        label: "Out of stock",
        render: (ctx) => (
          <StockIndicator
            status={stockStatus(ctx, ctx.fixture.stock.outOfStock)}
            text={stockText(ctx, ctx.fixture.stock.outOfStock)}
          />
        ),
      },
      {
        id: "long-label",
        label: "Long text",
        description: "Wraps beside its icon.",
        render: (ctx) => <StockIndicator status="low" text={ctx.fixture.long.errorText} />,
      },
    ],
  },
  "atoms/visually-hidden": {
    summary: "Text for screen readers only: in the reading order, not drawn.",
    a11y: [
      "Uses Tailwind's sr-only: 1 px, clipped, not display:none, so it is read out.",
      'For a label a sighted reader gets from context (the total\'s "including VAT", a sale price\'s "Sale price"). Do not use it to hide what should be visible.',
      "Not focusable: never put a link or button inside it.",
    ],
    live: (ctx) => (
      <p className="text-sm">
        {ctx.fixture.ordinary.badge} <VisuallyHidden>{ctx.fixture.ordinary.hint}</VisuallyHidden>
      </p>
    ),
    states: [
      {
        id: "hidden",
        label: "As drawn",
        description: "Nothing shows after the visible text; a screen reader reads both.",
        render: (ctx) => (
          <p className="text-sm">
            {ctx.fixture.ordinary.badge}{" "}
            <VisuallyHidden>{ctx.fixture.ordinary.hint}</VisuallyHidden>
          </p>
        ),
      },
      {
        id: "revealed",
        label: "As read out",
        description: "The same text with the hidden part shown.",
        render: (ctx) => (
          <p className="text-sm">
            {ctx.fixture.ordinary.badge}{" "}
            <span className="rounded-xs bg-muted px-1">{ctx.fixture.ordinary.hint}</span>
          </p>
        ),
      },
      {
        id: "long-label",
        label: "Long text",
        render: (ctx) => (
          <p className="text-sm">
            {ctx.fixture.long.badge} <VisuallyHidden>{ctx.fixture.long.hint}</VisuallyHidden>
          </p>
        ),
      },
    ],
  },
  "atoms/image": {
    summary:
      "next/image in a frame with an aspect ratio and a radius token, over a skeleton until it loads.",
    a11y: [
      "`alt` is required by the type; an empty string has to be written on purpose, for a picture next to text that says the same.",
      "The frame keeps its ratio before the picture arrives, so nothing shifts (CLS).",
      "The skeleton is aria-hidden and stops pulsing for readers who ask for reduced motion.",
    ],
    live: (ctx) => (
      <div className="grid max-w-xs grid-cols-[minmax(0,1fr)]">
        <Image
          src={sampleImage.src}
          alt={ctx.fixture.ordinary.imageAlt}
          ratio="portrait"
          sizes="320px"
        />
      </div>
    ),
    states: [
      ...(["square", "portrait", "landscape", "video"] as const).map((ratio) => ({
        id: ratio,
        label: `Ratio ${ratio}`,
        render: (ctx: DsContext) => (
          <div className="grid max-w-48 grid-cols-[minmax(0,1fr)]">
            <Image
              src={sampleImage.src}
              alt={ctx.fixture.ordinary.imageAlt}
              ratio={ratio}
              sizes="192px"
            />
          </div>
        ),
      })),
      {
        id: "radius",
        label: "Radius",
        description: "`none`, `lg`, `full`: the radius tokens.",
        render: (ctx) => (
          <div className="flex flex-wrap items-center gap-3">
            {(["none", "lg", "full"] as const).map((radius) => (
              <Image
                key={radius}
                src={sampleImage.src}
                alt={ctx.fixture.ordinary.imageAlt}
                radius={radius}
                className="w-16"
                sizes="64px"
              />
            ))}
          </div>
        ),
      },
      {
        id: "placeholder",
        label: "Loading",
        description: "The skeleton the frame shows until the picture has loaded.",
        render: () => (
          <div className="relative aspect-[4/5] w-full max-w-48 overflow-hidden rounded-md bg-muted">
            <Skeleton className="absolute inset-0 rounded-none" />
          </div>
        ),
      },
      {
        id: "decorative",
        label: "Decorative",
        description: "An empty alt, written on purpose.",
        render: () => (
          <div className="grid max-w-48 grid-cols-[minmax(0,1fr)]">
            <Image src={sampleImage.src} alt="" ratio="square" sizes="192px" />
          </div>
        ),
      },
      {
        id: "long-label",
        label: "Long alt",
        description: "The alternative text is long and is not drawn.",
        render: (ctx) => (
          <Named name={ctx.fixture.long.imageAlt}>
            <div className="grid w-48 max-w-full grid-cols-[minmax(0,1fr)]">
              <Image
                src={sampleImage.src}
                alt={ctx.fixture.long.imageAlt}
                ratio="landscape"
                sizes="192px"
              />
            </div>
          </Named>
        ),
      },
    ],
  },
  "atoms/icon": {
    summary: "A Lucide icon at the size tokens: decoration unless it has a label.",
    a11y: [
      "Without `label` the icon is aria-hidden: it sits beside text, or inside a button that has its own name.",
      "With `label` it is an image (role=img) with that name, for an icon that says something alone.",
      "It draws in the text's colour (currentColor), so it follows the surface's contrast.",
    ],
    live: (ctx) => (
      <div className={row}>
        {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
          <Icon key={size} icon={HeartIcon} size={size} />
        ))}
        <Icon icon={StarIcon} size="lg" label={ctx.fixture.ordinary.hint} />
      </div>
    ),
    states: [
      {
        id: "decorative",
        label: "Decorative",
        description: "aria-hidden: next to text that says the same.",
        render: (ctx) => (
          <p className="flex items-center gap-2 text-sm">
            <Icon icon={HeartIcon} />
            {ctx.fixture.ordinary.hint}
          </p>
        ),
      },
      {
        id: "labelled",
        label: "Labelled",
        description: "role=img with a name.",
        render: (ctx) => (
          <Named name={ctx.fixture.ordinary.hint}>
            <Icon icon={StarIcon} size="lg" label={ctx.fixture.ordinary.hint} />
          </Named>
        ),
      },
      {
        id: "sizes",
        label: "Sizes",
        description: "`xs` 12, `sm` 16, `md` 20, `lg` 24, `xl` 32 px.",
        render: () => (
          <div className={row}>
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
              <Icon key={size} icon={HeartIcon} size={size} />
            ))}
          </div>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The name is long and is not drawn.",
        render: (ctx) => (
          <Named name={ctx.fixture.long.hint}>
            <Icon icon={StarIcon} size="lg" label={ctx.fixture.long.hint} />
          </Named>
        ),
      },
    ],
  },
  "atoms/logo": {
    summary: "A slot for the store's logo as an SVG, named by the store's name.",
    a11y: [
      "With an SVG in the slot the logo is an image (role=img) whose name is `name`, the store's name.",
      "Without one it shows the name as text, so a store with no logo yet still has a header.",
      "The SVG draws in currentColor, so a brand recolours it with a token, not a file.",
    ],
    live: (ctx) => <Logo name={ctx.fixture.ordinary.storeName}>{sampleMark}</Logo>,
    states: [
      {
        id: "svg",
        label: "With an SVG",
        render: (ctx) => (
          <Named name={ctx.fixture.ordinary.storeName}>
            <Logo name={ctx.fixture.ordinary.storeName}>{sampleMark}</Logo>
          </Named>
        ),
      },
      {
        id: "text",
        label: "Name only",
        description: "No SVG: the name is the logo.",
        render: (ctx) => <Logo name={ctx.fixture.ordinary.storeName} />,
      },
      {
        id: "long-label",
        label: "Long name",
        description: "The name wraps as text; as an SVG's name it is not drawn.",
        render: (ctx) => (
          <div className="flex flex-col items-start gap-3">
            <Logo name={ctx.fixture.long.storeName} />
            <Named name={ctx.fixture.long.storeName}>
              <Logo name={ctx.fixture.long.storeName}>{sampleMark}</Logo>
            </Named>
          </div>
        ),
      },
    ],
  },
  "atoms/payment-icon": {
    summary:
      "The mark of a payment method, in one colour (simple-icons, CC0; each mark remains its owner's trademark).",
    a11y: [
      "An image (role=img) named by `label`, the method's name: the marks carry no text a screen reader could read.",
      "One path in currentColor, so it follows the text's colour; the brands' own colours are not used (monochrome baseline).",
      "A provider that requires its own artwork on a payment page (Apple Pay's guidelines, for one) gets it with that integration (M6).",
    ],
    live: (ctx) => (
      <div className={row}>
        {paymentBrands.map((brand) => (
          <PaymentIcon key={brand} brand={brand} label={copy(ctx).payment[brand]} />
        ))}
      </div>
    ),
    states: [
      {
        id: "all",
        label: "All eight",
        render: (ctx) => (
          <ul className="flex flex-wrap gap-4">
            {paymentBrands.map((brand) => (
              <li key={brand} className="flex flex-col items-center gap-1">
                <PaymentIcon brand={brand} label={copy(ctx).payment[brand]} size="lg" />
                <span className="text-muted-foreground text-xs">{copy(ctx).payment[brand]}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: "sizes",
        label: "Sizes",
        render: (ctx) => (
          <div className={row}>
            {(["sm", "md", "lg"] as const).map((size) => (
              <PaymentIcon key={size} brand="visa" size={size} label={copy(ctx).payment.visa} />
            ))}
          </div>
        ),
      },
      {
        id: "muted",
        label: "In another colour",
        description: "The text colour: here muted-foreground.",
        render: (ctx) => (
          <div className={row + " text-muted-foreground"}>
            {paymentBrands.map((brand) => (
              <PaymentIcon key={brand} brand={brand} label={copy(ctx).payment[brand]} />
            ))}
          </div>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The name is long and is not drawn.",
        render: (ctx) => (
          <Named name={ctx.fixture.long.hint}>
            <PaymentIcon brand="mastercard" label={ctx.fixture.long.hint} />
          </Named>
        ),
      },
    ],
  },
  "atoms/flag": {
    summary:
      "A country's flag by its ISO code (country-flag-icons, SVG, 3:2), rendered on the server.",
    a11y: [
      "An image (role=img) named by `label`, the country's name in the page's language: here from Intl.DisplayNames.",
      "A server component: the flags are HTML, with no client JavaScript. M2's MarketSwitcher has to keep it that way.",
      "A flag is never the only sign of a market: the country's name stays next to it.",
    ],
    live: (ctx) => {
      const code = ctx.fixture.market.country;
      return isFlagCode(code) ? (
        <div className={row}>
          <Flag code={code} label={countryName(ctx, code)} />
          <span className="text-sm">{countryName(ctx, code)}</span>
        </div>
      ) : null;
    },
    states: [
      {
        id: "markets",
        label: "The four markets",
        render: (ctx) => (
          <ul className="flex flex-col gap-2">
            {marketCodes.filter(isFlagCode).map((code) => (
              <li key={code} className="flex items-center gap-2 text-sm">
                <Flag code={code} label={countryName(ctx, code)} />
                <span>{countryName(ctx, code)}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: "sizes",
        label: "Sizes",
        description: "Set by height; the width follows at 3:2.",
        render: (ctx) => {
          const code = ctx.fixture.market.country;
          return isFlagCode(code) ? (
            <div className={row}>
              <Flag code={code} label={countryName(ctx, code)} className="h-4" />
              <Flag code={code} label={countryName(ctx, code)} />
              <Flag code={code} label={countryName(ctx, code)} className="h-8" />
              <Flag code={code} label={countryName(ctx, code)} className="h-12" />
            </div>
          ) : null;
        },
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The name is long and is not drawn.",
        render: (ctx) => {
          const code = ctx.fixture.market.country;
          return isFlagCode(code) ? (
            <Named name={ctx.fixture.long.hint}>
              <Flag code={code} label={ctx.fixture.long.hint} />
            </Named>
          ) : null;
        },
      },
    ],
  },
} satisfies Partial<Record<EntryId, DsStory>>;
