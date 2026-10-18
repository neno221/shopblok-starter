// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, SBP account.md). The
// account's orders, newest first. From `md` a table (the Table primitive) with a caption ("Your
// orders"), column headers with `scope` (order, date, status, items, total, and a "Details" column
// whose header is read but not drawn), a row header per order ("#1042"), and "View" as a 44 px link
// named for its order ("View order #1042", the visible word first, WCAG 2.5.3). Below `md` a table of
// six columns does not fit, so the same orders are a list of cards (the order as a heading, then the
// date, the state, the items and the total as a `<dl>`, then the link); the two are one or the other
// by `md` (`display: none` takes the hidden one out of the accessibility tree as well). The state is
// the order's latest event in words in a badge ("Delivered"), never colour alone. The number is
// written as it is (no grouping: "#1042", not "#1,042"), the date in the market's locale in UTC and
// the total with `formatMoney`. With no orders it is EmptyState with a link to the shop. A server
// component: it only formats.
import { formatDate, formatMessage, type Messages } from "@shopblok/i18n";
import type { OrderListItem, OrderTable as OrderTableContent } from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shopblok/ui/primitives/table";
import { PackageIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type OrderTableProps = Omit<React.ComponentProps<"div">, "children"> &
  OrderTableContent & {
    /** The wording, from the catalog's `organisms.orderTable`. */
    copy: Messages["organisms"]["orderTable"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The caption's and the list's name when a page has two (the design system's states). */
    label?: string;
    /** The level of a card's heading, and of the empty state's. */
    headingLevel?: HeadingLevel;
    /** next/link's `prefetch`; the design system passes `false`. */
    prefetch?: boolean | null;
  };

// `next/link` takes whatever an app with typed routes narrows its `href` to; these are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** The copy's key of each state, by the latest event's kind. */
const statusKeys = {
  placed: "placed",
  paid: "paid",
  fulfilled: "fulfilled",
  shipped: "shipped",
  delivered: "delivered",
  canceled: "canceled",
  "return-requested": "returnRequested",
  returned: "returned",
} as const satisfies Record<
  OrderListItem["status"],
  keyof Messages["organisms"]["orderTable"]["statuses"]
>;

function OrderTable({
  orders,
  shopHref,
  copy,
  locale,
  label,
  headingLevel = 3,
  prefetch,
  className,
  ...props
}: OrderTableProps) {
  if (orders.length === 0)
    return (
      <div data-slot="order-table" data-empty="" className={cn("min-w-0", className)} {...props}>
        <EmptyState
          icon={PackageIcon}
          title={copy.emptyTitle}
          text={copy.emptyText}
          action={{ label: copy.emptyAction, href: shopHref }}
          headingLevel={headingLevel}
          prefetch={prefetch}
        />
      </div>
    );
  const Heading = `h${headingLevel}` as const;
  // The number as it is: an order's number is a name, not a quantity, so it takes no grouping.
  const number = (order: OrderListItem) => String(order.displayId);
  // In UTC, so the prerendered HTML is the same on every server; M3 passes the market's time zone
  // (SETUP.md T39, review fixes) so an order placed after midnight in Cyprus shows that day.
  const date = (order: OrderListItem) =>
    formatDate(order.placedAt, locale, { dateStyle: "medium", timeZone: "UTC" });
  const status = (order: OrderListItem) => (
    <Badge variant={order.status === "canceled" ? "destructive" : "secondary"}>
      {copy.statuses[statusKeys[order.status]]}
    </Badge>
  );
  const view = (order: OrderListItem) => (
    <NextLink
      href={order.href as LinkHref}
      prefetch={prefetch}
      aria-label={formatMessage(copy.viewLabel, { number: number(order) }, locale)}
      data-slot="order-table-view"
      className={cn(buttonVariants({ variant: "outline" }), "max-w-full")}
    >
      <span className="min-w-0 wrap-anywhere">{copy.view}</span>
    </NextLink>
  );
  const total = (order: OrderListItem) => (
    <Price amount={order.total.amount} currency={order.total.currencyCode} locale={locale} />
  );
  const items = (order: OrderListItem) =>
    formatMessage(copy.itemCount, { count: order.itemCount }, locale);
  return (
    <div data-slot="order-table" className={cn("min-w-0", className)} {...props}>
      <div data-slot="order-table-wide" className="hidden md:block">
        <Table>
          <TableCaption className="mt-0 mb-3 text-start text-base font-semibold text-foreground [caption-side:top]">
            {label ?? copy.caption}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{copy.order}</TableHead>
              <TableHead scope="col">{copy.date}</TableHead>
              <TableHead scope="col">{copy.status}</TableHead>
              <TableHead scope="col">{copy.items}</TableHead>
              <TableHead scope="col" className="text-end">
                {copy.total}
              </TableHead>
              <TableHead scope="col">
                <span className="sr-only">{copy.details}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} data-slot="order-table-row">
                <TableHead scope="row" className="font-medium">
                  {formatMessage(copy.number, { number: number(order) }, locale)}
                </TableHead>
                <TableCell>{date(order)}</TableCell>
                <TableCell>{status(order)}</TableCell>
                <TableCell>{items(order)}</TableCell>
                <TableCell className="text-end whitespace-nowrap">{total(order)}</TableCell>
                <TableCell className="text-end">{view(order)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul
        role="list"
        aria-label={label ?? copy.caption}
        data-slot="order-table-cards"
        className="flex min-w-0 flex-col gap-3 md:hidden"
      >
        {orders.map((order) => (
          <li
            key={order.id}
            data-slot="order-table-card"
            className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Heading className="text-base leading-snug font-semibold wrap-anywhere">
                {formatMessage(copy.title, { number: number(order) }, locale)}
              </Heading>
              {status(order)}
            </div>
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground wrap-anywhere">{copy.date}</dt>
              <dd className="text-end wrap-anywhere">{date(order)}</dd>
              <dt className="text-muted-foreground wrap-anywhere">{copy.items}</dt>
              <dd className="text-end">{items(order)}</dd>
              <dt className="text-muted-foreground wrap-anywhere">{copy.total}</dt>
              <dd className="text-end font-medium">{total(order)}</dd>
            </dl>
            {view(order)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { OrderTable };
export type { OrderTableProps };
