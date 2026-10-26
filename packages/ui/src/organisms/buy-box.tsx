// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D44, D49). The part of a
// product page where a shopper decides: the title, the rating with a link to the reviews, the
// price, the options, the stock, the quantity and the button that adds the choice to the cart, in
// one `<form>`. A client component as a whole, as CookieConsent is: it keeps the choice and the
// quantity in state and takes functions (`onSelectionChange`, a server action as `action`).
// - The choice starts from `selection` and follows that prop when it changes (the URL's back and
//   forward; `useChosenSelection`), and every change the shopper makes calls `onSelectionChange`
//   with the whole choice, so M3 writes it into the URL. VariantSelector is controlled, and given
//   `name`, so its radio inputs post as `options.{option id}` without JavaScript; with a full
//   choice the hidden `variantId` input carries the variant, and the quantity field is named
//   `quantity`. Before any script has run the form therefore still posts the options and the
//   quantity as the page was rendered, and the server (M3) checks the choice again: nothing here is
//   the only line of defence.
// - Add to cart is disabled until every option has a value (SPEC §8.4), and it is `aria-disabled`,
//   never `disabled`. A real `disabled` attribute takes the button out of the Tab order, so a
//   keyboard shopper would not find it, and it hides the reason. The button stays focusable and
//   says why in a visible line ("Choose Colour and Size to add it to the cart", the missing
//   options' titles joined by `formatList`) that `aria-describedby` points at. Pressing it, or Enter
//   in the quantity field, does not submit: the form's `onSubmit` cancels the submission and moves
//   focus to the first missing option's radio group, so a shopper who pressed it is taken to what
//   is missing. The same holds for a variant that cannot be bought (`available: false`, or a
//   combination the product does not make): the button says "Sold out" and sends nothing. Because
//   the guard is on the form and not on the button, the sticky bar's button (MobileStickyATC,
//   `form={formId}`) is covered too, and so is a press while a request is already `adding`.
// - `status` is where adding stands, and it is M3's: `adding` puts "Adding to cart…" and a spinner
//   on the button (still `aria-disabled`, so it cannot be sent twice), and `added` and `error` say
//   their words in one polite `role="status"` region that is always in the page, so a screen reader
//   hears the change (WCAG 4.1.3). `idle` leaves it empty. The stock line is a polite live region
//   too: it appears when the last option is chosen, and "Only 3 left" is news.
// - A buy box without an `action` sends nothing (the design system's stories pass none, and a page
//   that reloaded itself with the choice in its query string would be no use to anyone). A shop
//   always passes one.
// - The size guide (SizeGuideDialog, the page's to pass) goes on the size option's label line, at
//   its end (VariantSelector's `labelEnd`); a product with no size option gets it under the options.
//   The quick view never passes one, because a dialog does not open another.
// - Ids: the form, the options' wrapper and the button take the ids a page gives them, so the
//   sticky bar can submit this form (`formId`), link to its options (`optionsId`) and watch its
//   button (`buttonId`); any other falls back to ids made from `useId`, which are unique on a page
//   with several boxes (the design system's states). `titleId` names the heading, so the quick
//   view's dialog can be named by it: one name, not two.
// - Layout: a column that never grows wider than its container (`min-w-0`), with titles and labels
//   that wrap in any language (`wrap-anywhere`) and never truncate. Every control is 44 px: the
//   reviews link, the options (Swatch and SizePill), the stepper and the button.
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatList, formatMessage, formatNumber } from "@shopblok/i18n/format";
import type {
  BuyBox as BuyBoxContent,
  ProductOption,
  VariantSelection,
} from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { QuantityStepper } from "@shopblok/ui/atoms/quantity-stepper";
import { Rating } from "@shopblok/ui/atoms/rating";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { StockIndicator } from "@shopblok/ui/atoms/stock-indicator";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { VariantSelector } from "@shopblok/ui/molecules/variant-selector";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import type * as React from "react";
import { missingOptions, priceFor, stockFor, variantFor } from "./buy-box-choice";
import { useChosenSelection } from "./use-chosen-selection";

/** The wording a buy box draws: its own and its molecules' and atoms'. */
type BuyBoxCopy = {
  buyBox: Messages["organisms"]["buyBox"];
  variantSelector: Messages["molecules"]["variantSelector"];
  priceBlock: Messages["molecules"]["priceBlock"];
  quantityStepper: Messages["atoms"]["quantityStepper"];
  stock: Messages["atoms"]["stock"];
  rating: Messages["atoms"]["rating"];
};

/** Where adding to the cart stands: the button draws it and the box announces it. */
type AddStatus = "idle" | "adding" | "added" | "error";

type BuyBoxProps = BuyBoxContent & {
  copy: BuyBoxCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The form's action: M3's server action, which gets `variantId` and `quantity`. */
  action?: string | ((formData: FormData) => void | Promise<void>);
  /** Called with the whole choice when the visitor changes it (M3 writes it into the URL, SPEC §8.4). */
  onSelectionChange?: (selection: VariantSelection) => void;
  /** Where adding stands (M3's): `adding` while it is sent, then `added` or `error`. */
  status?: AddStatus;
  /** The size guide's trigger (SizeGuideDialog), drawn beside the size option. */
  sizeGuide?: React.ReactNode;
  /**
   * The title's level: 1 on the product page, 2 in the quick view (whose dialog has the title). The
   * design system's states sit under headings of their own, so 3 and 4 are there for it.
   */
  headingLevel?: 1 | 2 | 3 | 4;
  /** Where the rating's link goes: the reviews section's id ("#reviews"). Without it, no link. */
  reviewsHref?: string;
  /** The form's id: MobileStickyATC's button submits this form (`form`). */
  formId?: string;
  /** The id of the options' wrapper: the sticky bar's "Choose options" link goes there. */
  optionsId?: string;
  /** The id of the add-to-cart button: the sticky bar shows once it leaves the window. */
  buttonId?: string;
  /** The id of the title: the quick view's dialog is named by it. */
  titleId?: string;
  className?: string;
};

/** The scale of the rating, as the contract has it. */
const MAX_STARS = 5;

const HEADINGS = ["h1", "h2", "h3", "h4"] as const;

// The classes of a link in a line of its own: the Link atom's, for a plain `<a>` (the reviews link
// is an in-page `#` link, so next/link has nothing to do), at 44 px.
const LINK =
  "inline-flex min-h-11 items-center rounded-xs text-sm text-primary underline underline-offset-4 outline-none hover:decoration-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring";

function BuyBox({
  product,
  selection,
  quantity,
  maxQuantity,
  notes,
  copy,
  locale,
  action,
  onSelectionChange,
  status = "idle",
  sizeGuide,
  headingLevel = 1,
  reviewsHref,
  formId,
  optionsId,
  buttonId,
  titleId,
  className,
}: BuyBoxProps) {
  const base = useId();
  const ids = {
    form: formId ?? `${base}-form`,
    options: optionsId ?? `${base}-options`,
    button: buttonId ?? `${base}-add`,
    title: titleId ?? `${base}-title`,
    choose: `${base}-choose`,
    quantity: `${base}-quantity`,
  };
  const optionsRef = useRef<HTMLDivElement>(null);
  const [chosen, setChosen] = useChosenSelection(selection);
  // The quantity follows its prop as the choice does: compared during render, not in an effect.
  const [amount, setAmount] = useState<number | null>(quantity);
  const [followedQuantity, setFollowedQuantity] = useState(quantity);
  if (followedQuantity !== quantity) {
    setFollowedQuantity(quantity);
    setAmount(quantity);
  }

  const missing = missingOptions(product, chosen);
  const variant = variantFor(product, chosen);
  const purchasable = variant?.available === true;
  const soldOut = missing.length === 0 && !purchasable;
  const adding = status === "adding";
  // The button works only for a variant that can be bought, and only once at a time.
  const blocked = !purchasable || adding;
  // What the stepper shows: the shopper's number, held to what a line takes now (a variant with
  // three left caps a ten chosen on another one).
  const shownQuantity = amount === null ? null : Math.min(amount, maxQuantity);
  // "Added to cart" and the error answer the choice and the quantity that were sent. M3's status
  // stays on its last answer until the next submit, so the answer is drawn only while the shopper
  // has changed neither (compared during render, as the choice is).
  const asked = JSON.stringify([chosen, shownQuantity]);
  const [answered, setAnswered] = useState<{ status: AddStatus; asked: string }>({ status, asked });
  if (answered.status !== status) setAnswered({ status, asked });
  const answerShown = answered.status === status && answered.asked === asked;

  const Heading = HEADINGS[headingLevel - 1] ?? "h1";
  const { rating } = product;
  // The size guide goes on the size option's label line; a product with no size option has none to
  // go on, and gets it under the options.
  const sizeOption = product.options.find((option) => option.kind === "size");
  const guideOnLabel =
    sizeGuide !== undefined && sizeOption !== undefined
      ? { [sizeOption.id]: sizeGuide }
      : undefined;

  function choose(next: VariantSelection) {
    setChosen(next);
    onSelectionChange?.(next);
  }

  /** Moves focus into the group of an option: its chosen radio, or its first. */
  function focusOption(option: ProductOption) {
    const index = product.options.findIndex((candidate) => candidate.id === option.id);
    const group = optionsRef.current?.querySelectorAll<HTMLElement>(
      '[data-slot="variant-selector-option"]',
    )[index];
    const radio =
      group?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
      group?.querySelector<HTMLElement>('[role="radio"]');
    radio?.focus();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (action !== undefined && !blocked) return;
    event.preventDefault();
    const first = missing[0];
    if (first !== undefined && !adding) focusOption(first);
  }

  return (
    <form
      id={ids.form}
      action={action}
      method={typeof action === "string" ? "post" : undefined}
      onSubmit={submit}
      data-slot="buy-box"
      data-status={status}
      className={cn("flex min-w-0 flex-col gap-5", className)}
    >
      <Heading
        id={ids.title}
        data-slot="buy-box-title"
        className="min-w-0 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere md:text-3xl"
      >
        {product.title}
      </Heading>
      {rating === undefined || rating.count === 0 ? null : (
        <div
          data-slot="buy-box-rating"
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
        >
          <Rating
            value={rating.average}
            max={MAX_STARS}
            label={formatMessage(
              copy.rating.label,
              {
                value: formatNumber(rating.average, locale, { maximumFractionDigits: 1 }),
                max: formatNumber(MAX_STARS, locale),
              },
              locale,
            )}
            valueText={formatNumber(rating.average, locale, { maximumFractionDigits: 1 })}
          />
          {reviewsHref === undefined ? (
            <span data-slot="buy-box-reviews" className="text-sm text-muted-foreground">
              {formatMessage(copy.buyBox.reviews, { count: rating.count }, locale)}
            </span>
          ) : (
            <a href={reviewsHref} data-slot="buy-box-reviews" className={LINK}>
              {formatMessage(copy.buyBox.reviews, { count: rating.count }, locale)}
            </a>
          )}
        </div>
      )}
      <PriceBlock
        price={priceFor(product, variant)}
        copy={copy.priceBlock}
        locale={locale}
        size="lg"
      />
      <div
        id={ids.options}
        ref={optionsRef}
        data-slot="buy-box-options"
        className="flex min-w-0 scroll-mt-24 flex-col"
      >
        <VariantSelector
          options={product.options}
          variants={product.variants}
          value={chosen}
          onValueChange={choose}
          copy={copy.variantSelector}
          locale={locale}
          name="options"
          labelEnd={guideOnLabel}
        />
        {sizeGuide !== undefined && guideOnLabel === undefined ? (
          <div data-slot="buy-box-size-guide" className="mt-4 flex">
            {sizeGuide}
          </div>
        ) : null}
        <div aria-live="polite" data-slot="buy-box-stock">
          {variant === undefined ? null : (
            <StockIndicator {...stockFor(variant, copy.stock, locale)} className="mt-4" />
          )}
        </div>
      </div>
      <div data-slot="buy-box-quantity" className="flex min-w-0 flex-col gap-2">
        <label htmlFor={ids.quantity} className="text-sm font-medium">
          {copy.quantityStepper.label}
        </label>
        <QuantityStepper
          id={ids.quantity}
          name="quantity"
          value={shownQuantity}
          onValueChange={setAmount}
          // An emptied field is not a quantity: leaving it puts the starting number back.
          onValueCommitted={(next) => {
            if (next === null) setAmount(Math.min(quantity, maxQuantity));
          }}
          min={1}
          max={maxQuantity}
          locale={locale}
          disabled={soldOut}
          label={copy.quantityStepper.label}
          decrementLabel={copy.quantityStepper.decrease}
          incrementLabel={copy.quantityStepper.increase}
        />
      </div>
      <input type="hidden" name="variantId" value={variant?.id ?? ""} />
      <div className="flex min-w-0 flex-col">
        <Button
          id={ids.button}
          type="submit"
          size="lg"
          data-slot="buy-box-add"
          aria-disabled={blocked ? true : undefined}
          aria-describedby={missing.length > 0 ? ids.choose : undefined}
          aria-busy={adding ? true : undefined}
          className="w-full max-w-full wrap-anywhere aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-primary"
        >
          {adding ? <Spinner aria-hidden="true" label={copy.buyBox.adding} /> : null}
          <span data-slot="buy-box-add-label">
            {adding ? copy.buyBox.adding : soldOut ? copy.buyBox.soldOut : copy.buyBox.add}
          </span>
        </Button>
        {missing.length === 0 ? null : (
          <p
            id={ids.choose}
            data-slot="buy-box-choose"
            className="mt-2 text-sm text-muted-foreground"
          >
            {formatMessage(
              copy.buyBox.choose,
              {
                options: formatList(
                  missing.map((option) => option.title),
                  locale,
                ),
              },
              locale,
            )}
          </p>
        )}
        <div role="status" data-slot="buy-box-status">
          {status === "added" && answerShown ? (
            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-success">
              <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="wrap-anywhere">{copy.buyBox.added}</span>
            </p>
          ) : null}
          {status === "error" && answerShown ? (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
              <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="wrap-anywhere">{copy.buyBox.error}</span>
            </p>
          ) : null}
        </div>
      </div>
      {notes.length === 0 ? null : (
        <ul
          role="list"
          aria-label={copy.buyBox.notes}
          data-slot="buy-box-notes"
          className="flex min-w-0 flex-col gap-1.5 border-t pt-4 text-sm text-muted-foreground"
        >
          {notes.map((note, index) => (
            <li key={`${index}-${note}`} className="flex items-start gap-2">
              <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 wrap-anywhere">{note}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export { BuyBox };
export type { AddStatus, BuyBoxCopy, BuyBoxProps };
