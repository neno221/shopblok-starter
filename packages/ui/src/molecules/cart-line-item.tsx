// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). One line of the cart, for the
// cart page and the drawer: the picture, the product's title as its link, the chosen options
// ("Colour: Oat"), a stock warning, the quantity, a remove control, the unit price (with the
// compare-at price struck through on a sale) and the line total. Every option is shown: a cart
// that names only the product leaves a shopper unsure which size they have (SBP, cart.md). Two
// plain forms, each posting `lineId` to its own `action` (what a `<form action>` takes: M3's server
// actions, or a URL): the quantity form (`quantity` as well) and the remove form (a submit button
// named for the line). The forms are separate so that Enter in the quantity never removes the line.
// With JavaScript the stepper (CartLineQuantity, the one client part) sends its form by itself when
// the quantity changes; without it (`@media (scripting: none)`, Tailwind's `noscript:`) the stepper
// is hidden and a second form shows a native number field and an "Update" button, so a quantity can
// be changed before any script runs. `pending` is the line being updated: `aria-busy`, the stepper
// read-only and the remove button `aria-disabled` and `type="button"` (focusable and inert, as
// ProductCard's quick add), and "Updating…" with a spinner in an always-present polite status
// region, so nothing is sent twice and the change is announced. An out-of-stock line cannot change
// quantity (the stepper is disabled) and says so; a low-stock one says how many are left, and the
// stepper stops at `maxQuantity`. The controls are named for the line, with its options, because a
// cart can hold the same product twice. The picture is decoration (`alt=""`): the title beside it
// says what it is. Container queries, not viewport ones, set the layout, so the line is right in a
// drawer and in a page's column. A long title is clamped to two lines (`data-truncate`; its link's
// name is the whole title); options wrap, none is cut. A server component with the one small
// client part.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { CartLine } from "@shopblok/registry/contracts";
import { IconButton } from "@shopblok/ui/atoms/icon-button";
import { Image } from "@shopblok/ui/atoms/image";
import { Input } from "@shopblok/ui/atoms/input";
import { Link } from "@shopblok/ui/atoms/link";
import { Price } from "@shopblok/ui/atoms/price";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { StockIndicator } from "@shopblok/ui/atoms/stock-indicator";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { CartLineQuantity } from "@shopblok/ui/molecules/cart-line-quantity";
import { ImageOffIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type HeadingElement = "h2" | "h3" | "h4" | "h5" | "h6";

type FormAction = React.ComponentProps<"form">["action"];

type CartLineItemProps = Omit<React.ComponentProps<"article">, "children"> & {
  line: CartLine;
  /** The wording, from the catalog's `molecules.cartLineItem`. */
  copy: Messages["molecules"]["cartLineItem"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /**
   * What `<form action>` takes for the quantity form (M3's server action, or a URL, which is
   * posted): it receives `lineId` and `quantity`. Without one the form submits to the page.
   */
  updateAction?: FormAction;
  /** The same for the remove form: it receives `lineId`. */
  removeAction?: FormAction;
  /** The line is being updated: it cannot be changed or removed again until the cart answers. */
  pending?: boolean;
  /** The title's heading element: `h3` unless the page's outline wants another. */
  heading?: HeadingElement;
  /**
   * The title link's `prefetch` (next/link). Unset, Next prefetches the product page when the line
   * is in view; the design system passes `false`, because the product pages do not exist before M3.
   */
  prefetch?: boolean | null;
};

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The line's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

// A private-use character no message contains, standing in for the price while the message is
// formatted (as PriceBlock does for "From {price}"), so a language puts "each" where it needs it.
const PRICE_SLOT = "\uE000";

const lists = new Map<string, Intl.ListFormat>();

/** The options one after another in the locale's way (`Intl.ListFormat`, unit style). */
function joinOptions(items: string[], locale: string): string {
  let format = lists.get(locale);
  if (format === undefined) {
    format = new Intl.ListFormat(locale, { type: "unit", style: "short" });
    lists.set(locale, format);
  }
  return format.format(items);
}

function CartLineItem({
  line,
  copy,
  locale,
  updateAction,
  removeAction,
  pending = false,
  heading: Heading = "h3",
  prefetch,
  className,
  ...props
}: CartLineItemProps) {
  const titleId = useId();
  const optionTexts = line.options.map((option) => formatMessage(copy.option, option, locale));
  // What the line's controls are named after: the product, and which of it when it has options.
  const name =
    optionTexts.length === 0
      ? line.title
      : formatMessage(
          copy.named,
          { title: line.title, options: joinOptions(optionTexts, locale) },
          locale,
        );
  const [unitBefore = "", unitAfter = ""] = formatMessage(
    copy.unitPrice,
    { price: PRICE_SLOT },
    locale,
  ).split(PRICE_SLOT);
  // The words around the price are flex items, which draw their gap but carry no space for a
  // reader of the text, so a space is written beside each (a flex container draws none of it).
  const unitText = (text: string, before: boolean) =>
    text.trim() === "" ? null : (
      <>
        {before ? null : " "}
        <span data-slot="cart-line-item-unit-text">{text.trim()}</span>
        {before ? " " : null}
      </>
    );
  const { stock } = line;
  const soldOut = stock.status === "out";
  const stockText =
    stock.status === "out"
      ? copy.stock.out
      : stock.status === "low"
        ? stock.quantity === undefined
          ? copy.stock.lowNoCount
          : formatMessage(copy.stock.low, { count: stock.quantity }, locale)
        : undefined;
  // A URL is posted; a function is left to React, which posts it as a server action.
  const method = (action: FormAction) => (typeof action === "string" ? "post" : undefined);
  const quantityLabel = formatMessage(copy.quantity, { line: name }, locale);
  const { image } = line;
  return (
    <article
      data-slot="cart-line-item"
      data-stock={stock.status}
      data-pending={pending ? "" : undefined}
      aria-labelledby={titleId}
      aria-busy={pending ? true : undefined}
      className={cn("@container min-w-0", className)}
      {...props}
    >
      <div className="grid grid-cols-1 gap-3 @xs:grid-cols-[5rem_minmax(0,1fr)] @xs:gap-x-4 @lg:grid-cols-[6rem_minmax(0,1fr)]">
        <div data-slot="cart-line-item-media" className="w-20 @lg:w-24">
          {image === undefined ? (
            <div
              data-slot="cart-line-item-no-image"
              aria-hidden="true"
              className="flex aspect-[4/5] w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
              <ImageOffIcon className="size-6" />
            </div>
          ) : (
            <Image
              src={image.src}
              alt=""
              sizes="(min-width: 32rem) 96px, 80px"
              ratio="portrait"
              radius="md"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Heading
            id={titleId}
            data-slot="cart-line-item-title"
            className="-my-1.5 min-w-0 text-sm leading-snug font-medium text-foreground"
          >
            <Link
              href={line.href as LinkHref}
              prefetch={prefetch}
              className="flex min-h-11 items-center text-foreground no-underline hover:underline"
            >
              <span data-truncate="" className="line-clamp-2 min-w-0 wrap-anywhere">
                {line.title}
              </span>
            </Link>
          </Heading>
          {optionTexts.length > 0 ? (
            <ul
              role="list"
              data-slot="cart-line-item-options"
              className="flex min-w-0 flex-col gap-0.5 text-sm leading-snug text-muted-foreground"
            >
              {optionTexts.map((text, index) => (
                <li key={`${line.options[index]?.option ?? ""}-${index}`} className="wrap-anywhere">
                  {text}
                </li>
              ))}
            </ul>
          ) : null}
          {stockText === undefined ? null : (
            <StockIndicator status={stock.status} text={stockText} className="items-start" />
          )}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
              <form
                data-slot="cart-line-item-update"
                action={updateAction}
                method={method(updateAction)}
                className="min-w-0 noscript:hidden"
              >
                <input type="hidden" name="lineId" value={line.id} />
                <CartLineQuantity
                  name="quantity"
                  quantity={line.quantity}
                  max={line.maxQuantity}
                  disabled={soldOut}
                  pending={pending}
                  locale={locale}
                  label={quantityLabel}
                  decrementLabel={formatMessage(copy.decrease, { line: name }, locale)}
                  incrementLabel={formatMessage(copy.increase, { line: name }, locale)}
                />
              </form>
              {/* Without a script the stepper cannot work, so a native number field and a button
                  stand in for it; with one, this form is not drawn. */}
              <form
                data-slot="cart-line-item-update-fallback"
                action={updateAction}
                method={method(updateAction)}
                className="hidden items-center gap-2 noscript:flex"
              >
                <input type="hidden" name="lineId" value={line.id} />
                <Input
                  type="number"
                  name="quantity"
                  inputMode="numeric"
                  min={1}
                  max={line.maxQuantity}
                  step={1}
                  defaultValue={line.quantity}
                  required
                  disabled={soldOut}
                  aria-label={quantityLabel}
                  className="w-20"
                />
                <Button
                  type={pending ? "button" : "submit"}
                  variant="outline"
                  disabled={soldOut || pending}
                  focusableWhenDisabled={pending && !soldOut}
                  aria-label={formatMessage(copy.updateLabel, { line: name }, locale)}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  {copy.update}
                </Button>
              </form>
              <form
                data-slot="cart-line-item-remove"
                action={removeAction}
                method={method(removeAction)}
              >
                <input type="hidden" name="lineId" value={line.id} />
                <IconButton
                  type={pending ? "button" : "submit"}
                  variant="ghost"
                  label={formatMessage(copy.remove, { line: name }, locale)}
                  disabled={pending}
                  focusableWhenDisabled={pending}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  <Trash2Icon />
                </IconButton>
              </form>
            </div>
            <div
              data-slot="cart-line-item-prices"
              className="ms-auto flex min-w-0 flex-col items-end gap-0.5 text-end"
            >
              <p data-slot="cart-line-item-total" className="font-medium">
                <VisuallyHidden>{copy.lineTotalLabel} </VisuallyHidden>
                <Price
                  amount={line.total.amount}
                  currency={line.total.currencyCode}
                  locale={locale}
                />
              </p>
              <p
                data-slot="cart-line-item-unit"
                className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-sm text-muted-foreground"
              >
                <VisuallyHidden>{copy.unitPriceLabel} </VisuallyHidden>
                {unitText(unitBefore, true)}
                {line.compareAtUnitPrice === undefined ? (
                  <Price
                    size="sm"
                    amount={line.unitPrice.amount}
                    currency={line.unitPrice.currencyCode}
                    locale={locale}
                  />
                ) : (
                  <Price
                    size="sm"
                    amount={line.unitPrice.amount}
                    original={line.compareAtUnitPrice.amount}
                    currency={line.unitPrice.currencyCode}
                    locale={locale}
                    saleLabel={copy.sale}
                    originalLabel={copy.original}
                  />
                )}
                {unitText(unitAfter, false)}
              </p>
            </div>
          </div>
          <div role="status" aria-live="polite" data-slot="cart-line-item-status">
            {pending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner aria-hidden="true" label={copy.updating} />
                <span>{copy.updating}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export { CartLineItem };
export type { CartLineItemProps };
