import { commerceFixtures } from "@shopblok/fixtures";
import {
  catalogs,
  countryName,
  formatMessage,
  formatMoney,
  LOCALES,
  type Locale,
} from "@shopblok/i18n";
import type { ShippingEstimate } from "@shopblok/registry/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { ShippingEstimator, type ShippingEstimatorProps } from "./shipping-estimator";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const states = (locale: Locale) => commerceFixtures[locale].checkoutFlow.estimator;

function element(
  locale: Locale,
  estimate: ShippingEstimate,
  props: Partial<ShippingEstimatorProps> = {},
) {
  return (
    <ShippingEstimator
      estimate={estimate}
      copy={catalogs[locale].molecules.shippingEstimator}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

function setup(
  locale: Locale,
  estimate: ShippingEstimate,
  props?: Partial<ShippingEstimatorProps>,
) {
  return render(element(locale, estimate, props));
}

const country = () => screen.getByRole("combobox", { name: "Country" }) as HTMLSelectElement;
const postal = () => screen.getByRole("textbox", { name: "Postal code" }) as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: "Show delivery options" });
const region = () => screen.getByRole("status");
const optionRows = () => [...document.querySelectorAll("[data-slot=shipping-estimator-option]")];

describe("ShippingEstimator", () => {
  describe("structure", () => {
    it("is a form named by its heading, which is an h3 unless asked otherwise", () => {
      setup("en", states("en").empty);
      const form = screen.getByRole("form", { name: "Estimate shipping" });
      expect(form.tagName).toBe("FORM");
      expect(screen.getByRole("heading", { level: 3, name: "Estimate shipping" })).toBeTruthy();
    });

    it("takes the heading's level from the page's outline", () => {
      setup("en", states("en").empty, { headingLevel: 2 });
      expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
      expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    });

    it("is a GET form to the page the data names, so the answer is a URL", () => {
      const { container } = setup("en", states("en").empty);
      const form = container.querySelector("form");
      expect(form?.getAttribute("method")).toBe("get");
      expect(form?.getAttribute("action")).toBe("/us/cart");
    });

    it("says what the shopper gets before asking for anything", () => {
      setup("en", states("en").empty);
      expect(
        screen.getByText("Enter your country and postal code to see delivery options and prices."),
      ).toBeTruthy();
    });

    it("has a labelled, required country select that the browser can fill in", () => {
      setup("en", states("en").empty);
      expect(country().tagName).toBe("SELECT");
      expect(country().name).toBe("country");
      expect(country().required).toBe(true);
      expect(country().getAttribute("autocomplete")).toBe("country");
      // The label is a real <label for>, not a placeholder.
      expect(country().labels).toHaveLength(1);
      expect(country().labels?.[0]?.textContent).toBe("Country");
    });

    it("has a labelled, required postal code field that the browser can fill in", () => {
      setup("en", states("en").empty);
      expect(postal().type).toBe("text");
      expect(postal().name).toBe("postalCode");
      expect(postal().required).toBe(true);
      expect(postal().getAttribute("autocomplete")).toBe("postal-code");
      // Text, not numeric: a British or Dutch code has letters. And no pattern the country may not match.
      expect(postal().getAttribute("inputmode")).toBeNull();
      expect(postal().getAttribute("pattern")).toBeNull();
      expect(postal().labels).toHaveLength(1);
      expect(postal().labels?.[0]?.textContent).toBe("Postal code");
      expect(postal().getAttribute("placeholder")).toBeNull();
      // A long code scrolls inside the field: the design system's clipping check is told.
      expect(postal().hasAttribute("data-truncate")).toBe(true);
    });

    it("has one submit button that submits", () => {
      setup("en", states("en").empty);
      expect((submit() as HTMLButtonElement).type).toBe("submit");
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("renders on the server, as markup a browser can submit without JavaScript", () => {
      const markup = renderToStaticMarkup(element("en", states("en").answered));
      expect(markup).toContain("<form ");
      expect(markup).toContain('method="get"');
      expect(markup).toContain('action="/us/cart"');
      expect(markup).toContain('name="country"');
      expect(markup).toContain('name="postalCode"');
      expect(markup).toContain('autoComplete="country"');
      expect(markup).toContain('autoComplete="postal-code"');
      expect(markup).toContain(`value="${states("en").answered.postalCode}"`);
      expect(markup).toContain('type="submit"');
      // The answer is in the markup too: no script fills it in.
      expect(markup).toContain("Standard delivery");
      expect(markup).not.toContain("<script");
    });

    it("passes the form's own props on, and merges the class", () => {
      const { container } = setup("en", states("en").empty, {
        id: "cart-shipping",
        className: "max-w-md",
      });
      const form = container.querySelector("form");
      expect(form?.id).toBe("cart-shipping");
      expect(form?.className).toContain("max-w-md");
      expect(form?.className).toContain("w-full");
    });

    it("gives two estimators on one page ids of their own, each label pointing at its field", () => {
      const { container } = render(
        <>
          {[0, 1].map((key) => (
            <div key={key}>{element("en", states("en").answered)}</div>
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const input of container.querySelectorAll("input, select")) {
        expect((input as HTMLInputElement).labels).toHaveLength(1);
      }
      expect(screen.getAllByRole("form")).toHaveLength(2);
    });
  });

  describe("the country", () => {
    it("lists the region's countries named in the page's language, in the order given", () => {
      setup("en", states("en").empty);
      const names = [...country().options].filter((option) => option.value !== "");
      expect(names.map((option) => option.value)).toEqual(states("en").empty.countries);
      expect(names.map((option) => option.textContent)).toEqual(
        states("en").empty.countries.map((code) => countryName(code, "en-US")),
      );
      // The market's own first.
      expect(names[0]?.value).toBe("us");
      expect(names[0]?.textContent).toBe("United States");
    });

    it.each(LOCALES)("names the countries by Intl for %s", (locale) => {
      setup(locale, states(locale).empty);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      for (const code of states(locale).empty.countries) {
        const option = [...select.options].find((candidate) => candidate.value === code);
        expect(option?.textContent, `${locale} ${code}`).toBe(countryName(code, htmlLang[locale]));
      }
    });

    it("starts on a disabled placeholder when none is chosen, so the first is not sent by accident", () => {
      setup("en", states("en").empty);
      const first = country().options[0];
      expect(first?.value).toBe("");
      expect(first?.disabled).toBe(true);
      expect(first?.textContent).toBe("Select a country");
      expect(country().value).toBe("");
      expect(country().selectedOptions[0]).toBe(first);
    });

    it("has no placeholder once a country is chosen, and shows it", () => {
      setup("en", states("en").answered);
      expect([...country().options].some((option) => option.value === "")).toBe(false);
      expect(country().value).toBe("us");
    });

    it("has no placeholder for a region of one country, which is chosen", () => {
      setup("en", states("en").single);
      expect(country().options).toHaveLength(1);
      expect(country().value).toBe("us");
    });

    it("starts the fields again from the server's values when a new answer arrives", () => {
      const { rerender } = setup("en", states("en").empty);
      expect(country().value).toBe("");
      rerender(element("en", states("en").answered));
      expect(country().value).toBe("us");
      expect(postal().value).toBe(states("en").answered.postalCode);
      rerender(element("en", states("en").none));
      expect(country().value).toBe("gb");
      expect(postal().value).toBe("M2 5BQ");
    });
  });

  describe("sending it", () => {
    it("sends the country and the postal code the shopper chose, as the query of a GET", async () => {
      const user = userEvent.setup();
      let sent: [string, string][] = [];
      const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        sent = [...new FormData(event.currentTarget)].map(([name, value]) => [name, String(value)]);
      });
      setup("en", states("en").empty, { onSubmit });
      await user.selectOptions(country(), "gb");
      await user.type(postal(), "M2 5BQ");
      await user.click(submit());
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(sent).toEqual([
        ["country", "gb"],
        ["postalCode", "M2 5BQ"],
      ]);
    });

    it("submits with Enter in the postal code field", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      setup("en", states("en").answered, { onSubmit });
      await user.click(postal());
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("tabs from the country to the postal code to the button", async () => {
      const user = userEvent.setup();
      setup("en", states("en").empty);
      await user.tab();
      expect(document.activeElement).toBe(country());
      await user.tab();
      expect(document.activeElement).toBe(postal());
      await user.tab();
      expect(document.activeElement).toBe(submit());
    });

    it("never submits by itself", () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const { container } = setup("en", states("en").answered, { onSubmit });
      expect(onSubmit).not.toHaveBeenCalled();
      fireEvent.submit(container.querySelector("form")!);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("the results region", () => {
    it("is in the page in every state, polite, so a change is announced", () => {
      for (const estimate of Object.values(states("en"))) {
        const { unmount } = setup("en", estimate);
        expect(region().getAttribute("aria-live")).toBe("polite");
        expect(screen.getAllByRole("status")).toHaveLength(1);
        unmount();
      }
    });

    it("is empty before the form has been sent", () => {
      setup("en", states("en").empty);
      expect(region().textContent).toBe("");
      expect(document.querySelector("[data-slot=shipping-estimator-options]")).toBeNull();
    });

    it("announces a change from empty to the answer in the same element", () => {
      const { rerender } = setup("en", states("en").empty);
      const before = region();
      rerender(element("en", states("en").answered));
      expect(region()).toBe(before);
      expect(before.textContent).toContain("Standard delivery");
    });
  });

  describe("the answer", () => {
    it("names the place it answers for, and lists the options under that name", () => {
      setup("en", states("en").answered);
      const name = within(region()).getByText(
        `Delivery options for ${states("en").answered.postalCode}, United States`,
      );
      const list = screen.getByRole("list", {
        name: `Delivery options for ${states("en").answered.postalCode}, United States`,
      });
      expect(list.getAttribute("aria-labelledby")).toBe(name.id);
      expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    });

    it("lists the available options only, in the order given", () => {
      setup("en", states("en").answered);
      const names = optionRows().map((row) => row.querySelector("span")?.textContent);
      expect(names).toEqual([
        "Standard delivery",
        "Express delivery",
        "Free economy delivery",
        "Pick up in store",
      ]);
      // Same-day delivery is in the data, not available, and not shown.
      expect(screen.queryByText("Same-day delivery")).toBeNull();
    });

    it("gives each option its time in business days, as a range or a number", () => {
      setup("en", states("en").answered);
      const text = optionRows().map((row) => plain(row.textContent));
      expect(text[0]).toContain("3–5 business days");
      expect(text[1]).toContain("1–2 business days");
      expect(text[2]).toContain("5–8 business days");
    });

    it("gives each option its price, and Free for an amount of 0", () => {
      setup("en", states("en").answered);
      const rows = optionRows();
      expect(plain(rows[0]?.lastElementChild?.textContent)).toBe("$5.50");
      expect(plain(rows[1]?.lastElementChild?.textContent)).toBe("$14.00");
      expect(plain(rows[2]?.lastElementChild?.textContent)).toBe("Free");
      expect(plain(rows[3]?.lastElementChild?.textContent)).toBe("Free");
      expect(rows[2]?.lastElementChild?.firstElementChild?.className).toContain("text-success");
    });

    it("says where a pickup is collected", () => {
      setup("en", states("en").answered);
      expect(optionRows()[3]?.textContent).toContain("Collect from Shopblok Store, Williamsburg");
      expect(optionRows()[0]?.textContent).not.toContain("Collect from");
    });

    it("writes one number of days in its plural, and Same day for 0", () => {
      const base = states("en").answered;
      const pick = (id: string) => base.options?.find((option) => option.id === id);
      const standard = pick("so_standard")!;
      const options = [
        { ...standard, id: "a", estimate: { minDays: 1, maxDays: 1 } },
        { ...standard, id: "b", estimate: { minDays: 2, maxDays: 2 } },
        { ...standard, id: "c", estimate: { minDays: 0, maxDays: 0 } },
        { ...standard, id: "d", estimate: undefined },
      ];
      setup("en", { ...base, options });
      const rows = optionRows().map((row) => plain(row.textContent));
      expect(rows[0]).toContain("1 business day");
      expect(rows[0]).not.toContain("1 business days");
      expect(rows[1]).toContain("2 business days");
      expect(rows[2]).toContain("Same day");
      // No estimate: no time is made up.
      expect(rows[3]).not.toMatch(/business day|Same day/);
    });

    it.each(LOCALES)("lists the same options with the market's money, in %s", (locale) => {
      setup(locale, states(locale).answered);
      const rows = optionRows();
      expect(rows).toHaveLength(4);
      const standard = states(locale).answered.options?.[0];
      expect(plain(rows[0]?.lastElementChild?.textContent)).toBe(
        plain(
          formatMoney(
            standard?.price.amount ?? 0,
            standard?.price.currencyCode ?? "",
            htmlLang[locale],
          ),
        ),
      );
      const copy = catalogs[locale].molecules.shippingEstimator;
      expect(plain(rows[2]?.lastElementChild?.textContent)).toBe(copy.free);
    });

    it.each(LOCALES)("names the place in %s", (locale) => {
      const copy = catalogs[locale].molecules.shippingEstimator;
      const estimate = states(locale).answered;
      setup(locale, estimate);
      expect(plain(region().querySelector("p")?.textContent)).toBe(
        plain(
          formatMessage(
            copy.results,
            {
              postalCode: estimate.postalCode,
              country: countryName(estimate.countryCode ?? "", htmlLang[locale]),
            },
            htmlLang[locale],
          ),
        ),
      );
    });

    it("says nothing ships there when the list is empty, never an empty list", () => {
      setup("en", states("en").none);
      expect(
        within(region()).getByText(
          "We cannot deliver to M2 5BQ, United Kingdom right now. Try another postal code or country.",
        ),
      ).toBeTruthy();
      expect(screen.queryByRole("list")).toBeNull();
      expect(document.querySelector("[data-slot=shipping-estimator-none]")).toBeTruthy();
    });

    it("says the same when every option is unavailable", () => {
      const base = states("en").answered;
      setup("en", {
        ...base,
        options: (base.options ?? []).map((option) => ({ ...option, available: false })),
      });
      expect(document.querySelector("[data-slot=shipping-estimator-none]")).toBeTruthy();
      expect(screen.queryByRole("list")).toBeNull();
    });

    it.each(LOCALES)("says nothing ships there in %s", (locale) => {
      const copy = catalogs[locale].molecules.shippingEstimator;
      setup(locale, states(locale).none);
      expect(
        plain(document.querySelector("[data-slot=shipping-estimator-none]")?.textContent),
      ).toBe(
        plain(
          formatMessage(
            copy.none,
            { postalCode: "M2 5BQ", country: countryName("gb", htmlLang[locale]) },
            htmlLang[locale],
          ),
        ),
      );
    });

    it("keeps the typed code and country in the fields, whatever the answer", () => {
      setup("en", states("en").none);
      expect(postal().value).toBe("M2 5BQ");
      expect(country().value).toBe("gb");
    });
  });

  describe("the errors", () => {
    it("ties a refused postal code to its field, keeping the value", () => {
      setup("en", states("en").mistaken, { error: "postalCode" });
      const message = screen.getByText("Enter a valid postal code for this country.");
      expect(postal().getAttribute("aria-invalid")).toBe("true");
      expect(postal().getAttribute("aria-describedby")).toBe(message.id);
      expect(postal().value).toBe("12");
      // Announced as it appears, and in words with the colour: the message is text.
      expect(message.getAttribute("role")).toBe("alert");
      expect(country().getAttribute("aria-invalid")).toBeNull();
      // And no answer is made up beside it.
      expect(document.querySelector("[data-slot=shipping-estimator-options]")).toBeNull();
      expect(region().textContent).toBe("");
    });

    it("has no error on the field when there is none", () => {
      setup("en", states("en").answered);
      expect(postal().getAttribute("aria-invalid")).toBeNull();
      expect(postal().getAttribute("aria-describedby")).toBeNull();
      expect(document.querySelector("[data-slot=field-error]")).toBeNull();
    });

    it("says a failed lookup in the results region, with an icon, and lists no option", () => {
      setup("en", states("en").answered, { error: "failed" });
      const message = within(region()).getByText(
        "We could not get delivery options. Please try again.",
      );
      expect(message.parentElement?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
      expect(message.parentElement?.className).toContain("text-destructive");
      expect(screen.queryByRole("list")).toBeNull();
      expect(document.querySelector("[data-slot=shipping-estimator-none]")).toBeNull();
      // The values stay, so the shopper can try again without typing.
      expect(postal().value).toBe(states("en").answered.postalCode);
      expect(postal().getAttribute("aria-invalid")).toBeNull();
    });

    it.each(LOCALES)("says both in %s", (locale) => {
      const copy = catalogs[locale].molecules.shippingEstimator;
      const { unmount } = setup(locale, states(locale).mistaken, { error: "postalCode" });
      expect(screen.getByText(copy.errors.postalCode)).toBeTruthy();
      unmount();
      setup(locale, states(locale).answered, { error: "failed" });
      expect(screen.getByText(copy.errors.failed)).toBeTruthy();
    });
  });

  describe("the copy", () => {
    it.each(LOCALES)("reads in %s: heading, fields and button", (locale) => {
      setup(locale, states(locale).empty);
      const copy = catalogs[locale].molecules.shippingEstimator;
      expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
      expect(screen.getByRole("combobox", { name: copy.country })).toBeTruthy();
      expect(screen.getByRole("textbox", { name: copy.postalCode })).toBeTruthy();
      expect(screen.getByRole("button", { name: copy.submit })).toBeTruthy();
      expect(screen.getByText(copy.description)).toBeTruthy();
      expect(screen.getByRole("option", { name: copy.countryPlaceholder })).toBeTruthy();
    });

    it("writes the days in each language's plural", () => {
      const base = states("en").answered;
      const standard = base.options![0]!;
      const one = { ...standard, estimate: { minDays: 1, maxDays: 1 } };
      for (const locale of LOCALES) {
        const { unmount } = setup(locale, { ...base, options: [one] });
        const copy = catalogs[locale].molecules.shippingEstimator;
        expect(plain(optionRows()[0]?.textContent)).toContain(
          plain(formatMessage(copy.estimateExact, { days: 1 }, htmlLang[locale])),
        );
        unmount();
      }
    });
  });

  describe("sizes and long labels", () => {
    it("makes the fields and the button at least 44 px high (D32)", () => {
      setup("en", states("en").empty);
      expect(country().className).toContain("h-11");
      expect(postal().className).toContain("h-11");
      expect(submit().className).toContain("min-h-11");
    });

    it("lays the two fields on one row from a container's width, and stacks them below it", () => {
      const { container } = setup("en", states("en").empty);
      const row = country().closest("[data-slot=field]")?.parentElement;
      expect(row?.className).toContain("flex-col");
      expect(row?.className).toContain("@lg:flex-row");
      expect(container.querySelector("form")?.className).toContain("@container");
    });

    it("uses the focus ring at full strength on the fields and the button", () => {
      setup("en", states("en").empty);
      const classes = `${country().className} ${postal().className} ${submit().className}`;
      expect(classes).toContain("focus-visible:ring-ring");
      expect(classes).not.toMatch(/ring-ring\/\d/);
    });

    it.each(["de", "el"] as const)("lets the longest copy, in %s, wrap", (locale) => {
      const { container } = setup(locale, states(locale).long);
      for (const node of container.querySelectorAll("*")) {
        expect(String(node.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      const long = commerceFixtures[locale].long.shippingOption.name;
      const row = optionRows().find((candidate) => candidate.textContent?.includes(long));
      expect(row).toBeTruthy();
      expect(row?.className).toContain("flex-wrap");
      expect(row?.firstElementChild?.className).toContain("min-w-0");
      expect(row?.querySelector("span")?.className).toContain("wrap-break-word");
    });

    it("lets the button wrap its label rather than overflow", () => {
      setup("de", states("de").empty);
      const button = screen.getByRole("button");
      // Capped at the form's width, and a column item (a shrink-0 would only hold its height).
      expect(button.className).toContain("max-w-full");
      expect(button.parentElement?.className).toContain("flex-col");
    });

    it("uses only logical properties", () => {
      const { container } = setup("en", states("en").answered);
      const classes = [...container.querySelectorAll("*")]
        .map((node) => node.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
    });
  });
});
