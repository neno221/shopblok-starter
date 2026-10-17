import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { SummaryLine } from "@shopblok/registry/contracts";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { OrderSummaryRow, type OrderSummaryRowProps } from "./order-summary-row";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const MINUS = "−";
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const flow = (locale: Locale) => commerceFixtures[locale].checkoutFlow.summary;

/** A row is a `<div>` of a description list, so the test puts it in one, as the organism does. */
function element(locale: Locale, line: SummaryLine, props: Partial<OrderSummaryRowProps> = {}) {
  return (
    <dl>
      <OrderSummaryRow
        {...line}
        copy={catalogs[locale].molecules.orderSummaryRow}
        locale={htmlLang[locale]}
        {...props}
      />
    </dl>
  );
}

function setup(locale: Locale, line: SummaryLine, props?: Partial<OrderSummaryRowProps>) {
  return render(element(locale, line, props));
}

const term = (root: ParentNode = document) => root.querySelector("dt");
const value = (root: ParentNode = document) => root.querySelector("dd");

describe("OrderSummaryRow", () => {
  describe("structure", () => {
    it("is a div holding a term and its description, which a description list allows", () => {
      const { container } = setup("en", flow("en").subtotal);
      const row = container.querySelector("dl > div");
      expect(row?.getAttribute("data-slot")).toBe("order-summary-row");
      expect([...(row?.children ?? [])].map((child) => child.tagName)).toEqual(["DT", "DD"]);
    });

    it("reads as a pair: the label, then the amount", () => {
      setup("en", flow("en").subtotal);
      expect(screen.getByRole("term").textContent).toBe("Subtotal");
      expect(plain(screen.getByRole("definition").textContent)).toBe(
        plain(
          formatMoney(
            flow("en").subtotal.amount?.amount ?? 0,
            flow("en").subtotal.amount?.currencyCode ?? "USD",
            "en-US",
          ),
        ),
      );
    });

    it("says which kind it is, for a style or a test to find", () => {
      for (const kind of ["subtotal", "discount", "shipping", "tax", "total"] as const) {
        const { container, unmount } = setup("en", { kind });
        expect(
          container.querySelector("[data-slot=order-summary-row]")?.getAttribute("data-kind"),
        ).toBe(kind);
        unmount();
      }
    });

    it("passes the div's own props on, and merges the class", () => {
      const { container } = setup("en", flow("en").total, { id: "grand-total", className: "py-4" });
      const row = container.querySelector("[data-slot=order-summary-row]");
      expect(row?.id).toBe("grand-total");
      expect(row?.className).toContain("py-4");
      expect(row?.className).toContain("justify-between");
      // The caller's py-4 wins over the row's own py-2.
      expect(row?.className).not.toContain("py-2");
    });

    it("renders on the server, as a term and a description", () => {
      const markup = renderToStaticMarkup(element("en", flow("en").subtotal));
      expect(markup).toContain("<dl>");
      expect(markup).toContain("<dt");
      expect(markup).toContain("<dd");
      expect(markup).toContain("Subtotal");
    });

    it("needs no client component: it holds no state and no effect", () => {
      // Rendering it with the server renderer is enough, and the markup has no script or button.
      const markup = renderToStaticMarkup(element("en", flow("en").total));
      expect(markup).not.toContain("<button");
      expect(markup).not.toContain("<script");
    });
  });

  describe("the label", () => {
    it.each(LOCALES)("is the copy's word for the kind, in %s", (locale) => {
      const copy = catalogs[locale].molecules.orderSummaryRow;
      for (const kind of ["subtotal", "discount", "shipping", "tax", "total"] as const) {
        const { unmount } = setup(locale, { kind });
        expect(term()?.textContent, `${locale} ${kind}`).toBe(copy[kind]);
        unmount();
      }
    });

    it("is Subtotal, Discount, Shipping, Taxes and Total in English", () => {
      const labels = (["subtotal", "discount", "shipping", "tax", "total"] as const).map((kind) => {
        const { unmount } = setup("en", { kind });
        const label = term()?.textContent;
        unmount();
        return label;
      });
      expect(labels).toEqual(["Subtotal", "Discount", "Shipping", "Taxes", "Total"]);
    });

    it.each(LOCALES)("has the detail beside it as the copy puts it, in %s", (locale) => {
      const copy = catalogs[locale].molecules.orderSummaryRow;
      setup(locale, flow(locale).discount);
      const code = flow(locale).discount.detail ?? "";
      expect(code).not.toBe("");
      expect(plain(term()?.textContent)).toBe(
        plain(
          formatMessage(copy.withDetail, { label: copy.discount, detail: code }, htmlLang[locale]),
        ),
      );
      // The slot character that cut the sentence never reaches the page.
      expect(term()?.textContent).not.toContain("");
    });

    it("sets the detail in the medium weight and lets it break anywhere", () => {
      setup("en", flow("en").discount);
      const detail = term()?.querySelector("[data-slot=order-summary-row-detail]");
      expect(detail?.textContent).toBe(flow("en").discount.detail);
      expect(detail?.className).toContain("font-medium");
      // A code with no space or hyphen has nowhere else to break.
      expect(detail?.className).toContain("wrap-anywhere");
    });

    it("has no detail element without a detail", () => {
      setup("en", flow("en").subtotal);
      expect(document.querySelector("[data-slot=order-summary-row-detail]")).toBeNull();
    });

    it("puts the detail wherever the language's sentence needs it", () => {
      const base = catalogs.en.molecules.orderSummaryRow;
      for (const withDetail of ["{detail}: {label}", "{label} for {detail}!", "{detail}"]) {
        const { unmount } = setup("en", flow("en").discount, { copy: { ...base, withDetail } });
        const code = flow("en").discount.detail ?? "";
        expect(plain(term()?.textContent)).toBe(
          withDetail.replace("{label}", "Discount").replace("{detail}", code),
        );
        unmount();
      }
    });

    it("keeps a 40-character code whole", () => {
      setup("en", flow("en").longDetail);
      expect(flow("en").longDetail.detail).toHaveLength(40);
      expect(term()?.textContent).toContain(flow("en").longDetail.detail);
    });
  });

  describe("the amount", () => {
    it.each(LOCALES)("is written by formatMoney for the market, in %s", (locale) => {
      const line = flow(locale).subtotal;
      setup(locale, line);
      expect(plain(value()?.textContent)).toBe(
        plain(
          formatMoney(line.amount?.amount ?? 0, line.amount?.currencyCode ?? "", htmlLang[locale]),
        ),
      );
    });

    it("is not divided or multiplied: major units, as Medusa returns them", () => {
      setup("en", { kind: "subtotal", amount: { amount: 12.5, currencyCode: "USD" } });
      expect(plain(value()?.textContent)).toBe("$12.50");
    });

    it("draws a Price for an ordinary row", () => {
      setup("en", flow("en").subtotal);
      expect(value()?.querySelector("[data-slot=price]")).toBeTruthy();
    });

    it.each(LOCALES)("draws a discount as a negative with the real minus sign, in %s", (locale) => {
      const line = flow(locale).discount;
      setup(locale, line);
      const written = plain(value()?.textContent);
      // U+2212, which a screen reader says as "minus"; a hyphen it may not say at all.
      expect(written).toContain(MINUS);
      expect(written).not.toMatch(/[-‐-‒]/);
      expect(written).toBe(
        plain(
          formatMoney(
            -(line.amount?.amount ?? 0),
            line.amount?.currencyCode ?? "",
            htmlLang[locale],
          ),
        ).replace("-", MINUS),
      );
    });

    it("draws the minus beside the amount, not only a colour", () => {
      setup("en", flow("en").discount);
      const amount = value()?.firstElementChild;
      expect(amount?.className).toContain("text-success");
      expect(amount?.textContent?.startsWith(MINUS)).toBe(true);
    });

    it("reads a discount of $5.00 as −$5.00", () => {
      setup("en", { kind: "discount", amount: { amount: 5, currencyCode: "USD" } });
      expect(value()?.textContent).toBe(`${MINUS}$5.00`);
    });

    it("does not draw a minus for a discount of nothing", () => {
      setup("en", { kind: "discount", amount: { amount: 0, currencyCode: "USD" } });
      expect(value()?.textContent).toBe("$0.00");
    });

    it("draws a tax or a total with no minus, however it is given", () => {
      setup("en", flow("en").tax);
      expect(value()?.textContent).not.toContain(MINUS);
    });
  });

  describe("shipping", () => {
    it.each(LOCALES)("is the copy's Free for an amount of 0, in %s", (locale) => {
      setup(locale, flow(locale).shippingFree);
      expect(value()?.textContent).toBe(catalogs[locale].molecules.orderSummaryRow.free);
      expect(value()?.querySelector("[data-slot=price]")).toBeNull();
      expect(value()?.firstElementChild?.className).toContain("text-success");
    });

    it("is Free in English", () => {
      setup("en", flow("en").shippingFree);
      expect(value()?.textContent).toBe("Free");
    });

    it("is the price of the delivery chosen", () => {
      setup("en", flow("en").shippingPaid);
      expect(value()?.textContent).toBe("$5.50");
    });

    it.each(LOCALES)("says it is calculated at the next step with no amount, in %s", (locale) => {
      setup(locale, flow(locale).shippingPending);
      expect(value()?.textContent).toBe(catalogs[locale].molecules.orderSummaryRow.pending);
      expect(value()?.querySelector("[data-slot=order-summary-row-pending]")).toBeTruthy();
    });

    it("is Calculated at the next step in English", () => {
      setup("en", { kind: "shipping" });
      expect(value()?.textContent).toBe("Calculated at the next step");
    });

    it("only calls a 0 free for shipping: a 0 subtotal is an amount", () => {
      setup("en", { kind: "subtotal", amount: { amount: 0, currencyCode: "USD" } });
      expect(value()?.textContent).toBe("$0.00");
    });

    it("says an unknown tax is calculated at the next step too", () => {
      setup("en", { kind: "tax" });
      expect(value()?.textContent).toBe("Calculated at the next step");
    });
  });

  describe("the total", () => {
    it("is emphasised by size, weight and a rule, not by colour alone", () => {
      const { container } = setup("en", flow("en").total);
      const row = container.querySelector("[data-slot=order-summary-row]");
      expect(row?.className).toContain("border-t");
      expect(term()?.className).toContain("font-semibold");
      expect(term()?.className).toContain("text-base");
      const price = value()?.querySelector("[data-slot=price]");
      expect(price?.className).toContain("text-xl");
      expect(price?.className).toContain("font-semibold");
    });

    it("is quieter for the other kinds: no rule, small amounts", () => {
      const { container } = setup("en", flow("en").subtotal);
      expect(container.querySelector("[data-slot=order-summary-row]")?.className).not.toContain(
        "border-t",
      );
      expect(term()?.className).not.toContain("font-semibold");
      expect(value()?.querySelector("[data-slot=price]")?.className).toContain("text-sm");
    });

    it("writes seven digits with the locale's grouping", () => {
      for (const locale of LOCALES) {
        const line = flow(locale).large;
        const { unmount } = setup(locale, line);
        expect(plain(value()?.textContent)).toBe(
          plain(formatMoney(1234567.89, line.amount?.currencyCode ?? "", htmlLang[locale])),
        );
        unmount();
      }
    });
  });

  describe("sizes and long labels", () => {
    it("wraps the row and lets the label and the amount shrink instead of overflowing", () => {
      const { container } = setup("en", flow("en").longDetail);
      expect(container.querySelector("[data-slot=order-summary-row]")?.className).toContain(
        "flex-wrap",
      );
      expect(term()?.className).toContain("min-w-0");
      expect(term()?.className).toContain("wrap-break-word");
      expect(value()?.className).toContain("min-w-0");
      // The amount sits at the end of the line, wherever the label wraps.
      expect(value()?.className).toContain("ms-auto");
      expect(value()?.className).toContain("text-end");
    });

    it.each(["de", "el"] as const)("lets the longest copy, in %s, wrap", (locale) => {
      const line: SummaryLine = { ...flow(locale).longDetail };
      const { container } = setup(locale, line);
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      // The whole word, however long, and the whole code.
      expect(term()?.textContent).toContain(line.detail);
    });

    it("uses only logical properties: the amount is at the end in a right-to-left page too", () => {
      const { container } = setup("en", flow("en").discount);
      const classes = [...container.querySelectorAll("*")]
        .map((element) => element.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
    });
  });
});
