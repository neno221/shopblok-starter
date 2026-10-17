import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { PaymentMethod } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { PaymentMethodCard, type PaymentMethodCardProps } from "./payment-method-card";

const source = readFileSync(path.join(import.meta.dirname, "payment-method-card.tsx"), "utf8");
/** The code without its comments, which say the English words the code must not hold. */
const code = source
  .split("\n")
  .filter((line) => !/^\s*(?:\/\/|\/\*\*|\*)/.test(line))
  .join("\n");

/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const method = (id: string, locale: Locale = "en") => {
  const found = commerceFixtures[locale].paymentMethods.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`There is no payment method ${id}`);
  return found;
};

const card = "pp_stripe_stripe";
const applePay = "pp_stripe-applepay_stripe";
const revolut = "pp_stripe-revolut_stripe";
const paypal = "pp_stripe-paypal_stripe";
const klarna = "pp_stripe-klarna_stripe";

function props(
  locale: Locale,
  paymentMethod: PaymentMethod,
  extra: Partial<PaymentMethodCardProps> = {},
): PaymentMethodCardProps {
  return {
    method: paymentMethod,
    copy: {
      card: catalogs[locale].molecules.paymentMethodCard,
      brands: catalogs[locale].atoms.payment,
    },
    locale: commerceFixtures[locale].market.htmlLang,
    name: "payment",
    ...extra,
  };
}

function setup(
  paymentMethod: PaymentMethod,
  extra: Partial<PaymentMethodCardProps> = {},
  locale: Locale = "en",
) {
  return render(<PaymentMethodCard {...props(locale, paymentMethod, extra)} />);
}

/** A bare method: only what the test is about. */
const bare = (change: Partial<PaymentMethod> = {}): PaymentMethod => ({
  id: "pp_test",
  kind: "manual",
  name: "Bank transfer",
  brands: [],
  ...change,
});

const radio = (name: string | RegExp) => screen.getByRole("radio", { name }) as HTMLInputElement;

describe("PaymentMethodCard", () => {
  describe("the file", () => {
    it("is a server component: no client directive, no state of its own", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect([...source.matchAll(/\buse[A-Z]\w+\(/g)].map((match) => match[0])).toEqual(["useId("]);
    });

    it("writes no English and no brand's name of its own", () => {
      expect(code).not.toMatch(/Accepts|redirected|Visa|Mastercard|PayPal|Apple Pay|Klarna/);
    });
  });

  describe("structure", () => {
    it("is one native radio, named by the method's name, in a card", () => {
      const { container } = setup(method(card));
      const input = radio("Credit or debit card");
      expect(input.type).toBe("radio");
      expect(input.name).toBe("payment");
      expect(input.value).toBe(card);
      const label = container.querySelector("label");
      expect(label?.getAttribute("data-slot")).toBe("payment-method-card");
      expect(label?.getAttribute("data-kind")).toBe("card");
      expect(label?.contains(input)).toBe(true);
      expect(screen.getAllByRole("radio")).toHaveLength(1);
    });

    it("draws a mark for each brand at the end, hidden from assistive technology", () => {
      const { container } = setup(method(card));
      const marks = [...container.querySelectorAll("[data-slot=payment-icon]")];
      expect(marks.map((mark) => mark.getAttribute("data-brand"))).toEqual([
        "visa",
        "mastercard",
        "americanexpress",
      ]);
      for (const mark of marks) expect(mark.getAttribute("aria-hidden")).toBe("true");
      expect(screen.queryAllByRole("img")).toHaveLength(0);
      // The marks are in a wrapper that is itself hidden, and that does not shrink.
      expect(marks[0]?.parentElement?.getAttribute("aria-hidden")).toBe("true");
      expect(marks[0]?.parentElement?.className).toContain("shrink-0");
    });

    it("says which cards it takes, for a name that does not say a brand", () => {
      setup(method(card));
      expect(
        screen.getByRole("radio", {
          name: "Credit or debit card",
          description: "Accepts Visa, Mastercard, and American Express",
        }),
      ).toBeTruthy();
    });

    it("keeps that sentence out of sight but in the page's text for a reader", () => {
      const { container } = setup(method(card));
      const accepts = container.querySelector("[id$=-accepts]");
      expect(accepts?.getAttribute("data-slot")).toBe("visually-hidden");
      expect(accepts?.className).toContain("sr-only");
      expect(accepts?.closest("label")).toBeTruthy();
    });

    it("says nothing more when the name already says the brand", () => {
      for (const id of [applePay, revolut]) {
        const { container, unmount } = setup(method(id));
        const input = container.querySelector("input");
        expect(input?.hasAttribute("aria-describedby")).toBe(false);
        expect(container.querySelector("[id$=-accepts]")).toBeNull();
        unmount();
      }
      setup(method(applePay));
      expect(screen.getByRole("radio", { name: "Apple Pay" })).toBeTruthy();
    });

    it("says in text that the shopper is sent to the provider, before choosing", () => {
      const { container } = setup(method(paypal));
      expect(container.querySelector("label")?.getAttribute("data-kind")).toBe("redirect");
      expect(
        screen.getByRole("radio", {
          name: "PayPal",
          description: "You will be redirected to PayPal to complete your payment.",
        }),
      ).toBeTruthy();
      expect(screen.getByText(/You will be redirected to PayPal/).tagName).toBe("SPAN");
      // Klarna: a redirect, and its name says the brand, so only the redirect is read.
      setup(method(klarna));
      expect(screen.getByText(/You will be redirected to Klarna/)).toBeTruthy();
    });

    it("says both when a redirect's name does not say its brand", () => {
      setup(bare({ kind: "redirect", name: "Pay later", brands: ["klarna"] }));
      expect(
        screen.getByRole("radio", {
          name: "Pay later",
          description:
            "Accepts Klarna You will be redirected to Pay later to complete your payment.",
        }),
      ).toBeTruthy();
    });

    it("draws no marks and says no brands for a method without any", () => {
      const { container } = setup(bare());
      expect(container.querySelector("[data-slot=payment-icon]")).toBeNull();
      expect(container.querySelector("[id$=-accepts]")).toBeNull();
      expect(radio("Bank transfer").hasAttribute("aria-describedby")).toBe(false);
    });

    it("passes the card's own props on, and merges the class", () => {
      const { container } = setup(method(card), { id: "mine", className: "max-w-sm", name: "pay" });
      const label = container.querySelector("label");
      expect(label?.id).toBe("mine");
      expect(label?.className).toContain("max-w-sm");
      expect(radio("Credit or debit card").name).toBe("pay");
    });

    it("gives two cards ids of their own", () => {
      const { container } = render(
        <>
          <PaymentMethodCard {...props("en", method(card))} />
          <PaymentMethodCard {...props("en", method(paypal))} />
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(ids.length).toBeGreaterThan(4);
      expect(new Set(ids).size).toBe(ids.length);
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
            <legend>Payment</legend>
            {commerceFixtures[locale].paymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                {...props(locale, paymentMethod)}
                defaultChecked={paymentMethod.id === card}
                onChange={onChange}
              />
            ))}
          </fieldset>
        </form>
      );
    }

    it("is one radio group named by its legend, walked with the arrow keys", async () => {
      const user = userEvent.setup();
      render(<Group />);
      const group = screen.getByRole("group", { name: "Payment" });
      expect(within(group).getAllByRole("radio")).toHaveLength(6);
      await user.tab();
      expect(document.activeElement).toBe(radio("Credit or debit card"));
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(radio("Apple Pay"));
      expect(radio("Apple Pay").checked).toBe(true);
      expect(radio("Credit or debit card").checked).toBe(false);
    });

    it("sends the chosen method's provider id under the group's name", async () => {
      const user = userEvent.setup();
      const { container } = render(<Group />);
      const data = () => new FormData(container.querySelector("form") as HTMLFormElement);
      expect(data().get("payment")).toBe(card);
      await user.click(screen.getByText("PayPal"));
      expect(data().get("payment")).toBe(paypal);
    });

    it("is chosen by a press on a mark, which is part of the card", async () => {
      const user = userEvent.setup();
      const { container } = render(<Group />);
      const mark = container.querySelector("[data-brand=klarna]");
      expect(mark).toBeTruthy();
      await user.click(mark as Element);
      expect(radio("Klarna").checked).toBe(true);
    });

    it("is controlled with `checked` and `onChange`", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <>
          <PaymentMethodCard {...props("en", method(card))} checked onChange={onChange} />
          <PaymentMethodCard {...props("en", method(paypal))} checked={false} onChange={onChange} />
        </>,
      );
      await user.click(radio("PayPal"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(radio("Credit or debit card").checked).toBe(true);
    });

    it("can be disabled by the caller", async () => {
      const user = userEvent.setup();
      setup(method(paypal), { disabled: true });
      expect(radio("PayPal").disabled).toBe(true);
      await user.click(screen.getByText("PayPal"));
      expect(radio("PayPal").checked).toBe(false);
    });
  });

  describe("without JavaScript", () => {
    it("is markup a form can submit: labelled radios with a name, a value and a checked one", () => {
      const markup = renderToString(
        <form action="/checkout/payment" method="post">
          {commerceFixtures.en.paymentMethods.map((paymentMethod) => (
            <PaymentMethodCard
              key={paymentMethod.id}
              {...props("en", paymentMethod)}
              defaultChecked={paymentMethod.id === paypal}
            />
          ))}
        </form>,
      );
      expect(markup.match(/type="radio"/g)).toHaveLength(6);
      expect(markup.match(/name="payment"/g)).toHaveLength(6);
      expect(markup).toContain(`value="${paypal}"`);
      expect(markup.match(/checked=""/g)).toHaveLength(1);
      expect(markup).toContain("Accepts Visa, Mastercard, and American Express");
      expect(markup).toContain("You will be redirected to PayPal");
    });
  });

  describe("in every language", () => {
    it("joins the brands as the locale does, and says the rest in its words", () => {
      for (const locale of LOCALES) {
        const { market, paymentMethods } = commerceFixtures[locale];
        const { container, unmount } = render(
          <>
            {paymentMethods.map((paymentMethod) => (
              <PaymentMethodCard key={paymentMethod.id} {...props(locale, paymentMethod)} />
            ))}
          </>,
        );
        const brands = catalogs[locale].atoms.payment;
        const list = new Intl.ListFormat(market.htmlLang, {
          style: "long",
          type: "conjunction",
        }).format([brands.visa, brands.mastercard, brands.americanexpress]);
        const text = plain(container.textContent);
        expect(text).toContain(list);
        if (locale !== "en") {
          expect(text).not.toMatch(/Accepts|redirected|Credit or debit/);
        }
        const cardMethod = method(card, locale);
        expect(screen.getByRole("radio", { name: cardMethod.name })).toBeTruthy();
        unmount();
      }
    });
  });

  describe("how it looks", () => {
    it("is at least 44 px tall, wraps, and draws its focus from the input", () => {
      const { container } = setup(method(card));
      const label = container.querySelector("label")?.className ?? "";
      expect(label).toContain("min-h-11");
      expect(label).toContain("has-[:focus-visible]:ring-3");
      expect(label).toContain("has-[:checked]:border-primary");
      expect(label).not.toMatch(/ring-ring\/\d/);
    });

    it("lets a long method name wrap beside its marks, in German and Greek", () => {
      for (const [locale, strings] of longLabels) {
        const long = commerceFixtures[locale].paymentSamples.longMethod;
        expect(long.name).toBe(strings.optionLabel);
        const { container, unmount } = setup(long, {}, locale);
        const name = container.querySelector("[id$=-name]");
        expect(name?.textContent).toBe(strings.optionLabel);
        expect(name?.className).toContain("wrap-break-word");
        expect(name?.className).toContain("min-w-0");
        expect(name?.parentElement?.className).toContain("flex-wrap");
        for (const element of container.querySelectorAll("*")) {
          expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
        }
        unmount();
      }
    });

    it("holds phrasing content only, as a label must", () => {
      const { container } = setup(method(paypal));
      expect(container.querySelectorAll("label div, label p, label ul, label h3")).toHaveLength(0);
    });

    it("uses no colour literal and no physical direction", () => {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
      expect(source).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|text-(?:left|right)/);
      expect(source).not.toMatch(/\bdark:/);
    });
  });
});
