// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). A listing's pager on the
// pagination primitive. Links only (SPEC §8.4: crawlable `<a href>`, the filters and the sort stay in
// the URL): each page's address comes from the app's `hrefFor(page)`, so this is a server component
// and has no button anywhere. The current page is a link marked `aria-current="page"` and named
// "Page 10 of 20"; the others are named "Page 9". Previous and Next are links too, and at the first
// or last page they are left out rather than drawn dead: an inert "Previous" is a control that does
// nothing (and a dimmed one would need its own contrast exemption), and the current page already
// says where the reader is. A listing of one page draws nothing. The window is the first page, the
// last, the current one and one on each side, with an ellipsis for each gap that hides two pages or
// more (a gap of one page is that page), and it keeps the same number of slots wherever the current
// page is, so the pager does not change width as the reader moves. Below `sm` it shows five slots
// instead of seven (`1 … 10 … 20`), so Previous, Next and the numbers fit 343 px with 44 px targets:
// both windows are in the markup and CSS shows one, so the links stay in the page for a crawler at
// every width.
import { formatMessage, formatNumber } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { PageState } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Pagination as PaginationNav,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  type PaginationProps as PaginationNavProps,
} from "@shopblok/ui/primitives/pagination";

type PaginationProps = Omit<PaginationNavProps, "label" | "children"> &
  PageState & {
    /** The address of a page of this listing, with its filters and sort: `hrefFor(1)` is the first. */
    hrefFor: (page: number) => string;
    /** The wording, from the catalog's `molecules.pagination`. */
    copy: Messages["molecules"]["pagination"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
  };

type Slot = number | "start" | "end";

/**
 * The slots of a pager that shows `siblings` pages on each side of the current one, between the
 * first and the last page. With more pages than slots there are always `2 * siblings + 5` of them:
 * a gap that would hide one page shows that page instead.
 */
function windowOf(page: number, count: number, siblings: number): Slot[] {
  if (count <= 2 * siblings + 5) return Array.from({ length: count }, (_, index) => index + 1);
  const from = Math.max(Math.min(page - siblings, count - 2 * siblings - 2), 3);
  const to = Math.min(Math.max(page + siblings, 2 * siblings + 3), count - 2);
  return [
    1,
    from > 3 ? "start" : 2,
    ...Array.from({ length: to - from + 1 }, (_, index) => from + index),
    to < count - 2 ? "end" : count - 1,
    count,
  ];
}

type PageItem = {
  key: string;
  /** The page a link goes to; an ellipsis has none. */
  page?: number;
  /** Shown from `sm` up (seven slots). */
  wide: boolean;
  /** Shown below `sm` (five slots). */
  narrow: boolean;
};

/**
 * The wide window and the narrow one in one list, in reading order, each item saying which of the
 * two shows it. The narrow window's pages are always among the wide one's, and an ellipsis is
 * always next to the first page or the last, so one list serves both.
 */
function itemsOf(page: number, count: number): PageItem[] {
  const wide = windowOf(page, count, 1);
  const narrow = windowOf(page, count, 0);
  const numbers = [...new Set([...wide, ...narrow])]
    .filter((slot): slot is number => typeof slot === "number")
    .sort((a, b) => a - b);
  const pageItem = (number: number): PageItem => ({
    key: String(number),
    page: number,
    wide: wide.includes(number),
    narrow: narrow.includes(number),
  });
  const gap = (side: "start" | "end"): PageItem[] =>
    wide.includes(side) || narrow.includes(side)
      ? [{ key: side, wide: wide.includes(side), narrow: narrow.includes(side) }]
      : [];
  return [
    pageItem(1),
    ...gap("start"),
    ...numbers.filter((number) => number !== 1 && number !== count).map(pageItem),
    ...gap("end"),
    ...(count > 1 ? [pageItem(count)] : []),
  ];
}

/** Hides an item from the window it is not part of. */
const shownIn = ({ wide, narrow }: Pick<PageItem, "wide" | "narrow">) =>
  cn(!narrow && "max-sm:hidden", !wide && "sm:hidden");

function Pagination({
  page,
  pageCount,
  hrefFor,
  copy,
  locale,
  className,
  ...props
}: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <PaginationNav label={copy.label} className={className} {...props}>
      <PaginationContent className="flex-wrap justify-center">
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious label={copy.previous} href={hrefFor(page - 1)} rel="prev" />
          </PaginationItem>
        ) : null}
        {itemsOf(page, pageCount).map((item) => (
          <PaginationItem key={item.key} className={shownIn(item)}>
            {item.page === undefined ? (
              <PaginationEllipsis label={copy.more} />
            ) : (
              <PaginationLink
                href={hrefFor(item.page)}
                isActive={item.page === page}
                size="default"
                className="min-w-11 px-2"
                aria-label={
                  item.page === page
                    ? formatMessage(copy.current, { page: item.page, pageCount }, locale)
                    : formatMessage(copy.page, { page: item.page }, locale)
                }
              >
                {formatNumber(item.page, locale)}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        {page < pageCount ? (
          <PaginationItem>
            <PaginationNext label={copy.next} href={hrefFor(page + 1)} rel="next" />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </PaginationNav>
  );
}

export { itemsOf, Pagination, windowOf };
export type { PageItem, PaginationProps };
