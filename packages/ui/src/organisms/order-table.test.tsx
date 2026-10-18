// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). OrderTable's tests, in Testing
// Library and happy-dom: from `md` a table with a caption, column and row headers and a 44 px "View"
// link named for its order; below `md` the same orders as cards; the state in words in a badge; the
// number without grouping; the empty state; a long German and Greek label; and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatDate, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { OrderTable as OrderTableContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { OrderTable, type OrderTableProps } from "./order-table";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.orderTable;
const tableOf = (locale: Locale, which: "list" | "empty" = "list"): OrderTableContent =>
  commerceFixtures[locale].account.orders[which];

function element(
  locale: Locale = "en",
  which: "list" | "empty" = "list",
  props: Partial<OrderTableProps> = {},
) {
  return (
    <OrderTable
      {...tableOf(locale, which)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("OrderTable: the table from md", () => {
  it.each(LOCALES)("is a table with a caption and column headers, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const table = screen.getByRole("table", { name: copy.caption });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((each) => each.textContent)).toEqual([
      copy.order,
      copy.date,
      copy.status,
      copy.items,
      copy.total,
      copy.details,
    ]);
    for (const header of headers) expect(header.getAttribute("scope")).toBe("col");
    // The details column's header is read, not drawn.
    expect(headers.at(-1)?.querySelector(".sr-only")).not.toBeNull();
    expect(slot("order-table-wide")?.className).toContain("hidden md:block");
  });

  it.each(LOCALES)(
    "writes one row per order, newest first, headed by its number, in %s",
    (locale) => {
      render(element(locale));
      const copy = copyOf(locale);
      const table = screen.getByRole("table");
      const rows = [...table.querySelectorAll('[data-slot="order-table-row"]')] as HTMLElement[];
      const orders = tableOf(locale).orders;
      expect(rows).toHaveLength(orders.length);
      orders.forEach((order, index) => {
        const row = rows[index] as HTMLElement;
        const header = within(row).getByRole("rowheader");
        expect(header.getAttribute("scope")).toBe("row");
        // The number is a name: no grouping, whatever the locale.
        expect(header.textContent).toBe(copy.number.replace("{number}", String(order.displayId)));
        const text = plain(row.textContent ?? "");
        expect(text).toContain(
          plain(
            formatDate(order.placedAt, htmlLang[locale], { dateStyle: "medium", timeZone: "UTC" }),
          ),
        );
        expect(text).toContain(
          plain(formatMoney(order.total.amount, order.total.currencyCode, htmlLang[locale])),
        );
        const status =
          copy.statuses[order.status === "return-requested" ? "returnRequested" : order.status];
        expect(within(row).getByText(status).getAttribute("data-slot")).toBe("badge");
      });
    },
  );

  it.each(LOCALES)("links each order with a 44 px 'View' named for it, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const table = screen.getByRole("table");
    for (const order of tableOf(locale).orders) {
      const name = copy.viewLabel.replace("{number}", String(order.displayId));
      const link = within(table).getByRole("link", { name });
      // The visible word starts its name (WCAG 2.5.3).
      expect(name.startsWith(copy.view)).toBe(true);
      expect(link.textContent).toBe(copy.view);
      expect(link.getAttribute("href")).toBe(order.href);
      expect(link.getAttribute("data-prefetch")).toBe("false");
      expect(link.className).toContain("min-h-11");
    }
  });

  it("keeps a total on one line in its cell and nothing else", () => {
    render(element("en"));
    const table = screen.getByRole("table");
    const nowrap = [...table.querySelectorAll("[class]")].filter((each) =>
      CLIPPING_CLASSES.test(each.getAttribute("class") ?? ""),
    );
    expect(nowrap).toHaveLength(tableOf("en").orders.length);
    for (const each of nowrap) expect(each.textContent).toMatch(/\$/);
  });

  it("takes another caption when a page has two", () => {
    render(element("en", "list", { label: "Orders this year" }));
    expect(screen.getByRole("table", { name: "Orders this year" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Orders this year" })).toBeTruthy();
  });
});

describe("OrderTable: the cards below md", () => {
  it.each(LOCALES)("lists the same orders as cards with a heading and a link, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const list = screen.getByRole("list", { name: copy.caption });
    expect(list.className).toContain("md:hidden");
    const cards = within(list).getAllByRole("listitem");
    const orders = tableOf(locale).orders;
    expect(cards).toHaveLength(orders.length);
    orders.forEach((order, index) => {
      const card = cards[index] as HTMLElement;
      expect(within(card).getByRole("heading", { level: 3 }).textContent).toBe(
        copy.title.replace("{number}", String(order.displayId)),
      );
      expect(card.querySelector("dl")).not.toBeNull();
      expect(within(card).getByRole("link").getAttribute("href")).toBe(order.href);
    });
  });

  it("takes another heading level", () => {
    render(element("en", "list", { headingLevel: 2 }));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });
});

describe("OrderTable: empty", () => {
  it.each(LOCALES)("says there are no orders and links to the shop, in %s", (locale) => {
    render(element(locale, "empty"));
    const copy = copyOf(locale);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: copy.emptyTitle })).toBeTruthy();
    const link = screen.getByRole("link", { name: copy.emptyAction });
    expect(link.getAttribute("href")).toBe(tableOf(locale, "empty").shopHref);
  });
});

describe("OrderTable: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s label in the cards and cuts nothing there",
    (locale, long) => {
      render(
        element(locale, "list", {
          copy: {
            ...copyOf(locale),
            caption: long.fieldLabel,
            view: long.action,
            viewLabel: `${long.action} #{number}`,
            statuses: { ...copyOf(locale).statuses, delivered: long.badge, paid: long.badge },
          },
        }),
      );
      const cards = slot("order-table-cards") as HTMLElement;
      expect(
        [cards, ...cards.querySelectorAll("*")].filter((each) =>
          CLIPPING_CLASSES.test(each.getAttribute("class") ?? ""),
        ),
      ).toEqual([]);
      for (const link of within(cards).getAllByRole("link")) {
        expect(link.className).toContain("max-w-full");
        expect(within(link).getByText(long.action).className).toContain("wrap-anywhere");
      }
      // The labels take the room that is left and wrap; the values keep their width (a price never breaks).
      for (const list of cards.querySelectorAll("dl"))
        expect(list.className).toContain("grid-cols-[minmax(0,1fr)_auto]");
      for (const heading of within(cards).getAllByRole("heading"))
        expect(heading.className).toContain("wrap-anywhere");
      expect(screen.getByRole("table", { name: long.fieldLabel })).toBeTruthy();
    },
  );
});
