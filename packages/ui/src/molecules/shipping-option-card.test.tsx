import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { ShippingOption } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ShippingOptionCard, type ShippingOptionCardProps } from "./shipping-option-card";

const source = readFileSync(path.join(import.meta.dirname, "shipping-option-card.tsx"), "utf8");
/** The code without its comments, which say the English words the code must not hold. */
const code = source
  .split("\n")
  .filter((line) => !/^\s*(?:\/\/|\/\*\*|\*)/.test(line))
  .join("\n");

/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const option = (id: string, locale: Locale = "en") => {
  const found = commerceFixtures[locale].shippingOptions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`There is no shipping option ${id}`);
  return found;
};

function props(
  locale: Locale,
  shipping: ShippingOption,
  extra: Partial<ShippingOptionCardProps> = {},
): ShippingOptionCardProps {
  return {
    option: shipping,
    copy: catalogs[locale].molecules.shippingOptionCard,
    locale: commerceFixtures[locale].market.htmlLang,
    name: "shipping",
    ...extra,
  };
}

function setup(
  shipping: ShippingOption,
  extra: Partial<ShippingOptionCardProps> = {},
  locale: Locale = "en",
) {
  return render(<ShippingOptionCard {...props(locale, shipping, extra)} />);
}

/** A bare option: only what the test is about. */
const bare = (change: Partial<ShippingOption> = {}): ShippingOption => ({
  id: "so_test",
  name: "Courier",
  price: { amount: 7.5, currencyCode: "USD" },
  available: true,
  ...change,
});

const radio = (name: string | RegExp) => screen.getByRole("radio", { name }) as HTMLInputElement;

describe("ShippingOptionCard", () => {
  describe("the file", () => {
    it("is a server component: no client directive, no state of its own", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect([...source.matchAll(/\buse[A-Z]\w+\(/g)].map((match) => match[0])).toEqual(["useId("]);
    });

    it("writes no English and no country's address order of its own", () => {
      expect(code).not.toMatch(/business day|Same day|Collect from|Not available/);
      expect(source).toContain("addressLines");
      expect(code).not.toMatch(/\bpostalCode\b/);
    });
  });

  describe("structure", () => {
    it("is one native radio, named by the option's name, in a card", () => {
      const { container } = setup(option("so_standard"));
      const input = radio("Standard delivery");
      expect(input.type).toBe("radio");
      expect(input.name).toBe("shipping");
      expect(input.value).toBe("so_standard");
      const card = container.querySelector("label");
      expect(card?.getAttribute("data-slot")).toBe("shipping-option-card");
      expect(card?.getAttribute("data-available")).toBe("true");
      expect(card?.contains(input)).toBe(true);
      expect(screen.getAllByRole("radio")).toHaveLength(1);
    });

    it("describes the radio by its price and its time, after the name", () => {
      setup(option("so_standard"));
      expect(
        screen.getByRole("radio", {
          name: "Standard delivery",
          description: "$5.50 3–5 business days",
        }),
      ).toBeTruthy();
    });

    it("draws the price with the market's currency", () => {
      const { container } = setup(option("so_express"));
      expect(plain(container.querySelector("[data-slot=price]")?.textContent)).toBe("$14.00");
    });

    it("says Free in words for a 0 amount, and draws no price", () => {
      const { container } = setup(option("so_free"));
      const free = container.querySelector("[data-slot=shipping-option-free]");
      expect(free?.textContent).toBe("Free");
      expect(container.querySelector("[data-slot=price]")).toBeNull();
      expect(container.textContent).not.toContain("$0");
      expect(screen.getByRole("radio", { name: "Free economy delivery" })).toBeTruthy();
      expect(free?.className).toContain("text-success");
    });

    it("never says Free for an amount that is not 0", () => {
      const { container } = setup(bare({ price: { amount: 0.01, currencyCode: "USD" } }));
      expect(container.querySelector("[data-slot=shipping-option-free]")).toBeNull();
      expect(plain(container.querySelector("[data-slot=price]")?.textContent)).toBe("$0.01");
    });

    it("has no estimate line when there is no estimate", () => {
      const { container } = setup(bare());
      expect(container.textContent).not.toMatch(/business day/);
      expect(radio("Courier").getAttribute("aria-describedby")?.split(" ")).toHaveLength(1);
    });

    it("passes the card's own props on, and merges the class", () => {
      const { container } = setup(option("so_standard"), {
        id: "mine",
        className: "max-w-sm",
        name: "delivery",
      });
      const card = container.querySelector("label");
      expect(card?.id).toBe("mine");
      expect(card?.className).toContain("max-w-sm");
      expect(card?.className).toContain("min-h-11");
      expect(radio("Standard delivery").name).toBe("delivery");
    });

    it("gives two cards ids of their own", () => {
      const { container } = render(
        <>
          <ShippingOptionCard {...props("en", option("so_standard"))} />
          <ShippingOptionCard {...props("en", option("so_express"))} />
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(ids.length).toBeGreaterThan(4);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("the estimate", () => {
    it("is a range in business days, the plural following the upper number", () => {
      setup(bare({ estimate: { minDays: 3, maxDays: 5 } }));
      expect(screen.getByText("3–5 business days")).toBeTruthy();
    });

    it("is one number when the two are the same", () => {
      setup(bare({ estimate: { minDays: 2, maxDays: 2 } }));
      expect(screen.getByText("2 business days")).toBeTruthy();
    });

    it("is singular for one", () => {
      const { unmount } = setup(bare({ estimate: { minDays: 1, maxDays: 1 } }));
      expect(screen.getByText("1 business day")).toBeTruthy();
      unmount();
      setup(bare({ estimate: { minDays: 0, maxDays: 1 } }));
      expect(screen.getByText("0–1 business day")).toBeTruthy();
    });

    it("is Same day for 0 to 0", () => {
      setup(bare({ estimate: { minDays: 0, maxDays: 0 } }));
      expect(screen.getByText("Same day")).toBeTruthy();
      expect(screen.queryByText(/business day/)).toBeNull();
    });

    it("is in the locale's words, from the catalog", () => {
      const words = { en: "business days", el: "εργάσιμες", de: "Werktage", fr: "jours ouvrés" };
      for (const locale of LOCALES) {
        const { container, unmount } = setup(
          bare({ estimate: { minDays: 3, maxDays: 5 } }),
          {},
          locale,
        );
        const text = plain(container.textContent);
        expect(text).toMatch(/3\s?[–-]\s?5|3 à 5/);
        expect(text).toContain(words[locale]);
        unmount();
      }
    });
  });

  describe("a pickup", () => {
    it("says where from, and the address in the country's order", () => {
      const { container } = setup(option("so_pickup"));
      expect(screen.getByText("Collect from Shopblok Store, Williamsburg")).toBeTruthy();
      expect(plain(container.textContent)).toContain("118 Wythe Avenue, Brooklyn, NY 11249");
      expect(
        screen.getByRole("radio", { name: "Pick up in store", description: /Collect from/ }),
      ).toBeTruthy();
    });

    it("puts the postal code first where the country does, with its own prefix (CH-)", () => {
      const pickups = {
        de: "Torstraße 61, 10119 Berlin",
        fr: "Rämistrasse 18, CH-8001 Zürich",
        el: "Λεωφόρος Σπύρου Κυπριανού 12, 1075 Λευκωσία",
      } as const;
      for (const [locale, line] of Object.entries(pickups) as [keyof typeof pickups, string][]) {
        const { container, unmount } = setup(option("so_pickup", locale), {}, locale);
        expect(plain(container.textContent)).toContain(line);
        unmount();
      }
    });

    it("is only the location's name when it has no address", () => {
      const { container } = setup(bare({ pickup: { locationName: "Locker 14" }, name: "Collect" }));
      expect(screen.getByText("Collect from Locker 14")).toBeTruthy();
      expect(container.querySelectorAll("[id$=-pickup] > span")).toHaveLength(1);
    });
  });

  describe("an option that is not available", () => {
    it("is a disabled radio that says why in text, and is not left to colour", () => {
      const { container } = setup(option("so_same_day"));
      const input = radio("Same-day delivery");
      expect(input.disabled).toBe(true);
      expect(container.querySelector("label")?.getAttribute("data-available")).toBe("false");
      expect(screen.getByText("Not available for this order")).toBeTruthy();
      expect(
        screen.getByRole("radio", {
          name: "Same-day delivery",
          description: /Not available for this order/,
        }),
      ).toBeTruthy();
      // An icon beside the words, hidden from assistive technology.
      const reason = screen.getByText("Not available for this order").parentElement;
      expect(reason?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("is not chosen by a press, not reached by Tab, and not sent", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <ShippingOptionCard {...props("en", option("so_same_day"))} />
        </form>,
      );
      await user.click(screen.getByText("Same-day delivery"));
      expect(radio("Same-day delivery").checked).toBe(false);
      await user.tab();
      expect(document.activeElement).not.toBe(radio("Same-day delivery"));
      expect(new FormData(container.querySelector("form") as HTMLFormElement).has("shipping")).toBe(
        false,
      );
    });

    it("is disabled by the caller too, with the reason only when it is really unavailable", () => {
      setup(option("so_standard"), { disabled: true });
      expect(radio("Standard delivery").disabled).toBe(true);
      expect(screen.queryByText("Not available for this order")).toBeNull();
    });
  });

  describe("a group of them", () => {
    function Group({
      locale = "en" as Locale,
      onChange,
    }: {
      locale?: Locale;
      onChange?: () => void;
    }) {
      return (
        <form>
          <fieldset>
            <legend>Delivery</legend>
            {commerceFixtures[locale].shippingOptions.map((shipping) => (
              <ShippingOptionCard
                key={shipping.id}
                {...props(locale, shipping)}
                defaultChecked={shipping.id === "so_standard"}
                onChange={onChange}
              />
            ))}
          </fieldset>
        </form>
      );
    }

    it("is one radio group named by its legend, the chosen one first in the tab order", async () => {
      const user = userEvent.setup();
      render(<Group />);
      const group = screen.getByRole("group", { name: "Delivery" });
      expect(within(group).getAllByRole("radio")).toHaveLength(5);
      expect(radio("Standard delivery").checked).toBe(true);
      await user.tab();
      expect(document.activeElement).toBe(radio("Standard delivery"));
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(radio("Express delivery"));
      expect(radio("Express delivery").checked).toBe(true);
    });

    it("skips the unavailable option when the arrow keys walk the group", async () => {
      const user = userEvent.setup();
      render(<Group />);
      radio("Pick up in store").focus();
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).not.toBe(radio("Same-day delivery"));
      expect(radio("Same-day delivery").checked).toBe(false);
    });

    it("sends the chosen option's id under the group's name", async () => {
      const user = userEvent.setup();
      const { container } = render(<Group />);
      const data = () => new FormData(container.querySelector("form") as HTMLFormElement);
      expect(data().get("shipping")).toBe("so_standard");
      await user.click(screen.getByText("Express delivery"));
      expect(data().get("shipping")).toBe("so_express");
    });

    it("is controlled with `checked` and `onChange`", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <>
          <ShippingOptionCard {...props("en", option("so_standard"))} checked onChange={onChange} />
          <ShippingOptionCard
            {...props("en", option("so_express"))}
            checked={false}
            onChange={onChange}
          />
        </>,
      );
      await user.click(radio("Express delivery"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(radio("Standard delivery").checked).toBe(true);
    });
  });

  describe("without JavaScript", () => {
    it("is markup a form can submit: labelled radios with a name, a value and a checked one", () => {
      const markup = renderToString(
        <form action="/checkout/delivery" method="post">
          {commerceFixtures.en.shippingOptions.map((shipping) => (
            <ShippingOptionCard
              key={shipping.id}
              {...props("en", shipping)}
              defaultChecked={shipping.id === "so_free"}
            />
          ))}
        </form>,
      );
      expect(markup.match(/type="radio"/g)).toHaveLength(5);
      expect(markup.match(/name="shipping"/g)).toHaveLength(5);
      expect(markup).toContain('value="so_free"');
      expect(markup.match(/checked=""/g)).toHaveLength(1);
      // The one that is not available is disabled in the markup, so it is not sent.
      expect(markup.match(/disabled=""/g)).toHaveLength(1);
      expect(markup).toContain("Not available for this order");
      expect(markup).toContain("3–5 business days");
    });
  });

  describe("in every language", () => {
    it("writes every option in the locale's words, with the market's currency", () => {
      for (const locale of LOCALES) {
        const { market, shippingOptions } = commerceFixtures[locale];
        const { container, unmount } = render(
          <>
            {shippingOptions.map((shipping) => (
              <ShippingOptionCard key={shipping.id} {...props(locale, shipping)} />
            ))}
          </>,
        );
        const copy = catalogs[locale].molecules.shippingOptionCard;
        const text = plain(container.textContent);
        expect(text).toContain(copy.free);
        expect(text).toContain(copy.sameDay);
        expect(text).toContain(copy.unavailable);
        const standard = shippingOptions.find((candidate) => candidate.id === "so_standard");
        const amount = new Intl.NumberFormat(market.htmlLang, {
          style: "currency",
          currency: market.currency,
        }).format(standard?.price.amount ?? 0);
        expect(text).toContain(plain(amount));
        if (locale !== "en") {
          expect(text).not.toMatch(/business day|Same day|Not available|Free\b|Collect from/);
        }
        unmount();
      }
    });
  });

  describe("how it looks", () => {
    it("is at least 44 px tall, wraps, and draws its focus from the input", () => {
      const { container } = setup(option("so_standard"));
      const card = container.querySelector("label")?.className ?? "";
      expect(card).toContain("min-h-11");
      expect(card).toContain("has-[:focus-visible]:ring-3");
      expect(card).toContain("has-[:checked]:border-primary");
      expect(card).not.toMatch(/ring-ring\/\d/);
    });

    it("keeps the price beside the name and lets a long name wrap, in German and Greek", () => {
      for (const [locale, strings] of longLabels) {
        const { container, unmount } = setup(
          bare({
            name: strings.optionLabel,
            price: { amount: 1234.5, currencyCode: commerceFixtures[locale].market.currency },
            estimate: { minDays: 10, maxDays: 15 },
            pickup: { locationName: strings.optionLabel },
          }),
          {},
          locale,
        );
        const name = container.querySelector("[id$=-name]");
        expect(name?.textContent).toBe(strings.optionLabel);
        expect(name?.className).toContain("wrap-break-word");
        expect(name?.className).toContain("min-w-0");
        for (const element of container.querySelectorAll("*")) {
          expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
        }
        // The price keeps its size; the name gives way.
        expect(container.querySelector("[id$=-price]")?.className).toContain("shrink-0");
        unmount();
      }
    });

    it("holds phrasing content only, as a label must", () => {
      const { container } = setup(option("so_pickup"));
      expect(container.querySelectorAll("label div, label p, label ul, label h3")).toHaveLength(0);
    });

    it("uses no colour literal and no physical direction", () => {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
      expect(source).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|text-(?:left|right)/);
      expect(source).not.toMatch(/\bdark:/);
    });
  });
});
