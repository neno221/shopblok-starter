// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). OrderSummary's tests, in Testing
// Library and happy-dom: the section named by its heading, the lines (picture, title, options,
// quantity, total), the toggle below `lg` (its name, `aria-expanded`, `aria-controls`, Enter and
// Space, 44 px, gone from `lg` and without JavaScript), the rows as one `<dl>` ending with the total,
// the cart's summary and a placed order's, a long German and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { OrderSummary as OrderSummaryContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { OrderSummary, type OrderSummaryProps } from "./order-summary";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.orderSummary;
const summaryOf = (locale: Locale, which: "cart" | "order" = "cart"): OrderSummaryContent =>
  commerceFixtures[locale].cartCheckout.summary[which];

function element(
  locale: Locale = "en",
  which: "cart" | "order" = "cart",
  props: Partial<OrderSummaryProps> = {},
) {
  return (
    <OrderSummary
      {...summaryOf(locale, which)}
      copy={copyOf(locale)}
      rowCopy={catalogs[locale].molecules.orderSummaryRow}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const toggle = () => slot("order-summary-toggle") as HTMLButtonElement;
const panel = () => slot("order-summary-panel") as HTMLElement;
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
/** A name matcher that ignores the space happy-dom's name computation puts before a comma. */
const named = (expected: string) => (name: string) => name.replace(/\s+,/g, ",") === expected;
/** Text without the entities a server render writes, and with plain spaces. */
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("OrderSummary: the section", () => {
  it.each(LOCALES)("is a region named by its heading, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const region = screen.getByRole("region", { name: copy.title });
    expect(region).toBe(slot("order-summary"));
    expect(within(region).getByRole("heading", { level: 2, name: copy.title })).toBeTruthy();
  });

  it("takes another heading level", () => {
    render(element("en", "cart", { headingLevel: 3 }));
    expect(screen.getByRole("heading", { level: 3, name: "Order summary" })).toBeTruthy();
  });

  it.each(LOCALES)("lists every line with its options, quantity and total, in %s", (locale) => {
    render(element(locale, "cart", { defaultOpen: true }));
    const copy = copyOf(locale);
    const summary = summaryOf(locale);
    const list = screen.getByRole("list", { name: copy.items });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(summary.items.length);
    summary.items.forEach((item, index) => {
      const text = plain(items[index]?.textContent ?? "");
      expect(text).toContain(item.title);
      for (const option of item.options)
        expect(text).toContain(plain(formatMessage(copy.option, option, htmlLang[locale])));
      expect(text).toContain(
        plain(formatMessage(copy.quantity, { count: item.quantity }, htmlLang[locale])),
      );
      expect(text).toContain(copy.lineTotal);
      expect(text).toContain(
        plain(formatMoney(item.total.amount, item.total.currencyCode, htmlLang[locale])),
      );
    });
    // The pictures are decoration: the title says what the line is.
    for (const image of list.querySelectorAll("img")) expect(image.getAttribute("alt")).toBe("");
  });

  it.each(LOCALES)("ends with the rows in one list, the total last, in %s", (locale) => {
    render(element(locale));
    const rows = slot("order-summary-rows") as HTMLElement;
    expect(rows.tagName.toLowerCase()).toBe("dl");
    const terms = [...rows.querySelectorAll("dt")].map((each) => each.textContent ?? "");
    const words = catalogs[locale].molecules.orderSummaryRow;
    expect(terms[0]).toBe(words.subtotal);
    expect(terms.at(-1)).toBe(words.total);
    expect(terms).toHaveLength(summaryOf(locale).rows.length);
  });

  it("draws a placed order's summary: delivery and tax paid, no row pending", () => {
    render(element("en", "order"));
    const rows = slot("order-summary-rows") as HTMLElement;
    expect(rows.textContent).not.toContain(catalogs.en.molecules.orderSummaryRow.pending);
    expect([...rows.querySelectorAll("dt")].map((each) => each.textContent)).toEqual([
      "Subtotal",
      "Shipping",
      "Taxes",
      "Total",
    ]);
  });
});

describe("OrderSummary: the toggle below lg", () => {
  it.each(LOCALES)("is a 44 px button that says what it shows and how many, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const count = formatMessage(
      copy.count,
      { count: summaryOf(locale).itemCount },
      htmlLang[locale],
    );
    const button = screen.getByRole("button", { name: named(`${copy.show}, ${count}`) });
    expect(button).toBe(toggle());
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe(panel().id);
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("focus-visible:ring-ring");
  });

  it("is gone from lg and without JavaScript, where the lines are always shown", () => {
    render(element("en"));
    expect(toggle().className).toContain("lg:hidden");
    expect(toggle().className).toContain("noscript:hidden");
    expect(panel().className.split(/\s+/)).toEqual(["hidden", "lg:block", "noscript:block"]);
  });

  it.each([["{Enter}"], [" "]])("opens and closes with %j", async (key) => {
    render(element("en"));
    const user = userEvent.setup();
    toggle().focus();
    await user.keyboard(key);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(toggle().textContent).toContain("Hide order summary");
    expect(panel().className).toBe("block");
    expect(document.activeElement).toBe(toggle());
    await user.keyboard(key);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(panel().className).toContain("hidden");
  });

  it("starts open when told to", () => {
    render(element("en", "cart", { defaultOpen: true }));
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(panel().hasAttribute("data-open")).toBe(true);
  });

  it("renders on the server with the lines in the markup, hidden only by class", () => {
    const html = renderToString(element("en"));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-slot="order-summary-items"');
    expect(html).toContain("Merino Ankle Socks");
  });
});

describe("OrderSummary: long labels", () => {
  it.each(longLabels)("wraps a long %s label and cuts nothing", async (locale, long) => {
    const summary = summaryOf(locale);
    render(
      element(locale, "cart", {
        items: summary.items.map((item) => ({
          ...item,
          title: long.productName,
          options: [{ option: long.fieldLabel, value: long.optionLabel }],
        })),
        copy: { ...copyOf(locale), title: long.fieldLabel, show: long.linkLabel },
      }),
    );
    expect(
      classesIn(slot("order-summary") as HTMLElement).filter((each) => CLIPPING_CLASSES.test(each)),
    ).toEqual([]);
    expect(screen.getByRole("heading", { name: long.fieldLabel }).className).toContain(
      "wrap-anywhere",
    );
    expect(toggle().firstElementChild?.className).toContain("wrap-anywhere");
    expect(screen.getAllByText(long.productName)[0]?.className).toContain("wrap-anywhere");
    await userEvent.setup().click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });
});
