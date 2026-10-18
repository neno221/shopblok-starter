// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4, D44, D49). What SearchOverlay's list
// shows under the field: the visitor's recent queries while the field is empty; for a query, the
// products first (a picture, the title, the price), then the matching categories and the
// suggestions; for a query that finds nothing, a sentence and a hint; and, while the next answer is
// on its way, the last one kept on screen with a spinner. A client component, because Base UI's
// Autocomplete parts are, and it takes every word as the catalog has it and formats only what
// carries a value (a count, a price, the query), with `@shopblok/i18n/format`, never the index
// that holds the four catalogs (D49: a test reads this file's imports).
// - The list is always rendered, even when it has no item. The field is a combobox that is
//   permanently expanded (the list is inline in the dialog), so it owns a listbox by `aria-controls`,
//   and an expanded combobox with nothing to control fails axe's `aria-required-attr`. An empty
//   listbox is only "needs review" there. The sentence for "no results" sits beside the list, not in
//   it, because a listbox holds options and groups of options.
// - The listbox itself is what scrolls, not a box around it. Its options take no Tab stop (below),
//   so a box that scrolls them must be one the field's arrow keys scroll: a combobox's own listbox
//   is (Base UI scrolls the highlighted option into view), and axe's `scrollable-region-focusable`
//   lets a combobox's listbox off for that reason. A box around it failed that rule in the design
//   system once six products and their categories outgrew the popup. The loading row, the recent
//   list's title and its clear button sit above the listbox and stay put. The listbox's 4 px of
//   padding (and as much scroll padding) keep the highlight's 3 px ring inside what it shows; its
//   negative margin keeps the options where the box's padding put them.
// - A product and a category are links, and they are the options: Base UI's Item is rendered AS the
//   anchor (`render`), so there is no link inside an option (axe's `nested-interactive`). Their
//   `tabIndex` is -1, so Tab goes from the field to the next control and the arrow keys walk the
//   options with the focus staying in the field (the combobox pattern). Enter on a highlighted link
//   clicks it, which is how a keyboard reader opens a product. Base UI already leaves a click on an
//   anchor to the browser; `preventBaseUIHandler` says so here, so no later version can write the
//   link's text into the field. A plain click also tells the dialog to close, because the header
//   lives across page changes and the dialog would stay open over the new page. A click with a
//   modifier key (a new tab) leaves the dialog as it is.
// - A recent query and a suggestion are not links: pressing one (or Enter on it) puts its text in
//   the field and asks the page for its results, through `onPickQuery`. Base UI would not do it
//   for us: it fills the field from an option only when the list is in an Autocomplete popup of its
//   own, and this list is inline in the dialog on purpose (see SearchOverlay).
// - Prices are drawn here with `formatMoney`, not with the Price atom: the atom imports the i18n
//   index, which would put the four catalogs into this client chunk. The words around a price ("From
//   €10", "Sale price", "Original price") are the `priceBlock` copy the caller hands in.
// - The loading row is decoration: the dialog's status region is the one that speaks. The spinner
//   turns only for readers who have not asked for reduced motion (D50).
// - "Clear recent searches" is a plain button above the list, not an option: a listbox must not
//   hold a button. It gives the focus back to the field, because it is removed with the list.
"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import type { Messages } from "@shopblok/i18n";
import { formatMessage, formatMoney } from "@shopblok/i18n/format";
import type { PriceSummary, ProductCard, SearchResult } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Image } from "@shopblok/ui/atoms/image";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { ClockIcon, Loader2Icon, SearchIcon, type LucideIcon } from "lucide-react";
import NextLink from "next/link";
import { useId, type MouseEvent, type ReactNode } from "react";

type SearchOverlayCopy = Messages["organisms"]["searchOverlay"];
type PriceCopy = Messages["molecules"]["priceBlock"];

/** `next/link` takes whatever an app with typed routes narrows its `href` to; ours are built strings. */
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** What the list shows, decided from the field's text and the answer. */
type ResultsMode = "recent" | "results" | "empty" | "waiting";

type SearchOverlayResultsProps = {
  /** The text in the field now. */
  query: string;
  recent: string[];
  /** The last answer; none before the first. */
  result?: SearchResult;
  /** An answer is on its way: `result` is the previous one. */
  loading: boolean;
  copy: SearchOverlayCopy;
  priceCopy: PriceCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  prefetch?: boolean | null;
  /** Called when a link was followed with a plain click: the dialog should close. */
  onNavigate: () => void;
  /** Called with the text of a recent query or a suggestion that was pressed. */
  onPickQuery: (text: string) => void;
  /** Called by "Clear recent searches"; without it the button is not drawn. */
  onClearRecent?: () => void;
  /** Gives the focus back to the field. */
  focusField: () => void;
};

/** Whether `result` answers the text in the field now, not an earlier text. */
function answers(query: string, result: SearchResult | undefined): result is SearchResult {
  return result !== undefined && result.query.trim() === query.trim();
}

/**
 * The mode of the list: recent queries for an empty field, else what the last answer holds.
 * An answer to an earlier text keeps its matches on screen until the next one arrives, but
 * never says "No results" for the new text: nobody has answered that yet.
 */
function modeOf(query: string, result: SearchResult | undefined): ResultsMode {
  if (query.trim() === "") return "recent";
  if (result === undefined) return "waiting";
  const found = result.products.length + result.categories.length + result.suggestions.length;
  if (found > 0) return "results";
  return answers(query, result) ? "empty" : "waiting";
}

/** A character no message contains, standing in for the price while "From {price}" is formatted. */
const PRICE_SLOT = "\uE000";

/** A click that a browser would open in the same tab: the primary button and no modifier key. */
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** The row every option shares: 44 px tall at least, the text wraps, the highlight is drawn as a ring. */
const optionRow =
  "flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md px-2 py-2 text-start text-sm text-foreground outline-none hover:bg-muted data-highlighted:bg-muted data-highlighted:ring-3 data-highlighted:ring-ring";

function ProductPrice({
  price,
  copy,
  locale,
}: {
  price: PriceSummary;
  copy: PriceCopy;
  locale: string;
}) {
  const [before = "", after = ""] = price.varies
    ? formatMessage(copy.from, { price: PRICE_SLOT }, locale).split(PRICE_SLOT)
    : [];
  // A space after the word, for a reader that joins the text of the boxes (the layout's gap is the eye's).
  const word = (text: string, end: "before" | "after") =>
    text.trim() === "" ? null : (
      <>
        {end === "after" ? " " : null}
        <span className="text-xs text-muted-foreground">{text.trim()}</span>
        {end === "before" ? " " : null}
      </>
    );
  const now = formatMoney(price.price.amount, price.price.currencyCode, locale);
  return (
    <span
      data-slot="search-overlay-price"
      className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm tabular-nums"
    >
      {word(before, "before")}
      {price.compareAt === undefined ? (
        <span className="font-medium text-price">{now}</span>
      ) : (
        <>
          <span className="font-medium text-price-sale">
            <VisuallyHidden>{copy.sale} </VisuallyHidden>
            {now}
          </span>
          <s className="text-xs font-normal text-price-original">
            <VisuallyHidden>{copy.original} </VisuallyHidden>
            {formatMoney(price.compareAt.amount, price.compareAt.currencyCode, locale)}
          </s>
        </>
      )}
      {word(after, "after")}
    </span>
  );
}

function ProductOption({
  product,
  priceCopy,
  locale,
  prefetch,
  onNavigate,
}: {
  product: ProductCard;
  priceCopy: PriceCopy;
  locale: string;
  prefetch?: boolean | null;
  onNavigate: () => void;
}) {
  const [picture] = product.images;
  return (
    <Autocomplete.Item
      value={product}
      render={<NextLink href={product.href as LinkHref} prefetch={prefetch} tabIndex={-1} />}
      data-slot="search-overlay-product"
      onClick={(event) => {
        event.preventBaseUIHandler();
        if (isPlainClick(event)) onNavigate();
      }}
      onMouseUp={(event) => event.preventBaseUIHandler()}
      className={cn(optionRow, "min-h-14")}
    >
      {/* A fixed width and a ratio: the picture's box is there before the picture, so nothing shifts. */}
      <Image
        src={picture?.src ?? ""}
        alt=""
        sizes="48px"
        ratio="portrait"
        radius="sm"
        className="w-12 shrink-0"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium wrap-anywhere">{product.title}</span>
        <ProductPrice price={product.price} copy={priceCopy} locale={locale} />
      </span>
    </Autocomplete.Item>
  );
}

function LinkOption({
  href,
  label,
  prefetch,
  onNavigate,
}: {
  href: string;
  label: string;
  prefetch?: boolean | null;
  onNavigate: () => void;
}) {
  return (
    <Autocomplete.Item
      value={label}
      render={<NextLink href={href as LinkHref} prefetch={prefetch} tabIndex={-1} />}
      data-slot="search-overlay-category"
      onClick={(event) => {
        event.preventBaseUIHandler();
        if (isPlainClick(event)) onNavigate();
      }}
      onMouseUp={(event) => event.preventBaseUIHandler()}
      className={optionRow}
    >
      <span className="min-w-0 flex-1 wrap-anywhere">{label}</span>
    </Autocomplete.Item>
  );
}

/** A query to put in the field: a recent one or a suggestion. */
function QueryOption({
  text,
  icon,
  onPick,
}: {
  text: string;
  icon: LucideIcon;
  onPick: (text: string) => void;
}) {
  return (
    <Autocomplete.Item
      value={text}
      data-slot="search-overlay-query"
      onClick={(event) => {
        event.preventBaseUIHandler();
        onPick(text);
      }}
      className={optionRow}
    >
      <Icon icon={icon} className="text-muted-foreground" />
      <span className="min-w-0 flex-1 wrap-anywhere">{text}</span>
    </Autocomplete.Item>
  );
}

/** A named group of options; its label names the group for assistive technology. */
function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Autocomplete.Group data-slot="search-overlay-group" className="flex flex-col pb-1">
      <Autocomplete.GroupLabel className="px-2 py-2 text-sm font-medium text-muted-foreground wrap-anywhere">
        {label}
      </Autocomplete.GroupLabel>
      {children}
    </Autocomplete.Group>
  );
}

function SearchOverlayResults({
  query,
  recent,
  result,
  loading,
  copy,
  priceCopy,
  locale,
  prefetch,
  onNavigate,
  onPickQuery,
  onClearRecent,
  focusField,
}: SearchOverlayResultsProps) {
  const recentTitleId = useId();
  const mode = modeOf(query, result);
  const shown = mode === "results" && result !== undefined ? result : undefined;
  return (
    <div
      data-slot="search-overlay-results"
      data-mode={mode}
      aria-busy={loading ? true : undefined}
      className="flex min-h-0 flex-1 flex-col gap-1 p-2"
    >
      {loading ? (
        <p
          data-slot="search-overlay-loading"
          aria-hidden="true"
          className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground"
        >
          <Icon icon={Loader2Icon} className="motion-safe:animate-spin" />
          <span className="min-w-0 wrap-anywhere">{copy.loading}</span>
        </p>
      ) : null}
      {mode === "recent" && recent.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p
            id={recentTitleId}
            className="px-2 py-2 text-sm font-medium text-muted-foreground wrap-anywhere"
          >
            {copy.recent}
          </p>
          {onClearRecent === undefined ? null : (
            <Button
              type="button"
              variant="ghost"
              data-slot="search-overlay-clear-recent"
              className="max-w-full"
              onClick={() => {
                onClearRecent();
                focusField();
              }}
            >
              {copy.clearRecent}
            </Button>
          )}
        </div>
      ) : null}
      {mode === "empty" ? (
        <div data-slot="search-overlay-empty" className="flex flex-col gap-1 px-2 py-6">
          <p className="font-medium text-foreground wrap-anywhere">
            {formatMessage(copy.noResults, { query: query.trim() }, locale)}
          </p>
          <p className="text-sm text-muted-foreground">{copy.noResultsHint}</p>
        </div>
      ) : null}
      <Autocomplete.List
        data-slot="search-overlay-list"
        {...(mode === "recent" && recent.length > 0
          ? { "aria-labelledby": recentTitleId }
          : { "aria-label": copy.label })}
        className="-m-1 flex min-h-0 min-w-0 flex-1 scroll-py-1 flex-col overflow-y-auto overscroll-contain p-1"
      >
        {mode === "recent"
          ? recent.map((each) => (
              <QueryOption key={each} text={each} icon={ClockIcon} onPick={onPickQuery} />
            ))
          : null}
        {shown === undefined ? null : (
          <>
            {shown.products.length === 0 ? null : (
              <OptionGroup label={copy.products}>
                {shown.products.map((product) => (
                  <ProductOption
                    key={product.id}
                    product={product}
                    priceCopy={priceCopy}
                    locale={locale}
                    prefetch={prefetch}
                    onNavigate={onNavigate}
                  />
                ))}
              </OptionGroup>
            )}
            {shown.categories.length === 0 ? null : (
              <OptionGroup label={copy.categories}>
                {shown.categories.map((category) => (
                  <LinkOption
                    key={category.href}
                    href={category.href}
                    label={category.label}
                    prefetch={prefetch}
                    onNavigate={onNavigate}
                  />
                ))}
              </OptionGroup>
            )}
            {shown.suggestions.length === 0 ? null : (
              <OptionGroup label={copy.suggestions}>
                {shown.suggestions.map((suggestion) => (
                  <QueryOption
                    key={suggestion}
                    text={suggestion}
                    icon={SearchIcon}
                    onPick={onPickQuery}
                  />
                ))}
              </OptionGroup>
            )}
          </>
        )}
      </Autocomplete.List>
    </div>
  );
}

export { answers, modeOf, SearchOverlayResults };
export type { ResultsMode, SearchOverlayResultsProps };
