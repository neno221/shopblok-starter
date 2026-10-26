// Ours (T52, SETUP.md "Cart and checkout (T52)"). The checkout template in Testing Library and
// happy-dom: for each of the three steps its root and heading (the stepper's current label); the
// contact step's email field, which belongs to the address form by id and is sent with it; the
// delivery step's shipping choice, which belongs to the payment form and is sent with it, and what
// it says with no option to choose; the review's four parts, each with its way back to its step, and
// the form that places the order; and the failures each step draws.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES } from "@shopblok/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutTemplate, checkoutCopy, checkoutIds } from "./checkout";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];

const STEPS = ["contact", "delivery", "review"] as const;
const NOW = "2026-10-26T12:00:00.000Z";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});

function renderCheckout(
  locale: (typeof LOCALES)[number] = "en",
  step: (typeof STEPS)[number] = "contact",
  props = {},
) {
  const page = pageFixtures[locale].checkout[step];
  return render(
    <CheckoutTemplate
      {...page}
      copy={checkoutCopy(catalogs[locale])}
      locale="en-US"
      now={NOW}
      prefetch={false}
      {...props}
    />,
  );
}

/** The delivery page with its options replaced, as the step is a union. */
function deliveryWith(change: { options?: []; selected?: string }) {
  const page = pageFixtures.en.checkout.delivery;
  if (page.step.kind !== "delivery") throw new Error("the fixture's delivery step is not one");
  return { ...page, step: { ...page.step, ...change } };
}

const stepHeading = () => {
  const section = slot("checkout-steps-step") as HTMLElement;
  return within(section).getAllByRole("heading")[0] as HTMLElement;
};

describe("CheckoutTemplate", () => {
  it.each(LOCALES)("is the page's main with one h1, in %s", (locale) => {
    renderCheckout(locale);
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("checkout-template");
    expect(main.getAttribute("data-variant")).toBe("default");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it.each(STEPS)(
    "marks the %s step on its root and heads it by the stepper's current label",
    (kind) => {
      renderCheckout("en", kind);
      const root = slot("checkout-template") as HTMLElement;
      expect(root.getAttribute("data-step")).toBe(kind);
      const label = catalogs.en.templates.checkout.steps[kind];
      const heading = stepHeading();
      expect(heading.tagName).toBe("H2");
      expect(heading.textContent).toBe(label);
      expect(slot("checkout-steps-step")?.getAttribute("aria-labelledby")).toBe(heading.id);
      const current = root.querySelector('[data-slot="stepper-item"][aria-current="step"]');
      expect(current?.getAttribute("data-step")).toBe(kind);
      expect(current?.querySelector('[data-slot="stepper-label"]')?.textContent).toContain(label);
      expect(slot(`checkout-${kind}`)).toBeTruthy();
      for (const other of STEPS.filter((name) => name !== kind)) {
        expect(slot(`checkout-${other}`)).toBeNull();
      }
    },
  );

  describe("contact", () => {
    it("puts the email field in the address form by its id, with the typed email", () => {
      renderCheckout("en", "contact");
      const page = pageFixtures.en.checkout.contact;
      const ids = checkoutIds("main");
      const form = slot("address-form") as HTMLFormElement;
      expect(form.id).toBe(ids.address);
      const email = screen.getByLabelText(catalogs.en.templates.checkout.contact.email);
      expect(email).toBe(document.getElementById(ids.email));
      expect(email.getAttribute("form")).toBe(ids.address);
      expect(form.contains(email)).toBe(false);
      expect((email as HTMLInputElement).type).toBe("email");
      expect((email as HTMLInputElement).value).toBe(
        page.step.kind === "contact" ? page.step.email : "",
      );
      expect(new FormData(form).get("email")).toBe(
        page.step.kind === "contact" ? page.step.email : "",
      );
    });

    it("sends the email that was typed with the address", () => {
      renderCheckout("en", "contact");
      const email = screen.getByLabelText<HTMLInputElement>(
        catalogs.en.templates.checkout.contact.email,
      );
      fireEvent.change(email, { target: { value: "someone@example.com" } });
      const form = slot("address-form") as HTMLFormElement;
      expect(new FormData(form).get("email")).toBe("someone@example.com");
    });

    it("hints at what the email is for, and submits the address form with the step's label", () => {
      renderCheckout("en", "contact");
      const words = catalogs.en.templates.checkout.contact;
      const ids = checkoutIds("main");
      const email = document.getElementById(ids.email) as HTMLElement;
      expect(email.getAttribute("aria-describedby")).toBe(ids.emailHint);
      expect(email.getAttribute("aria-invalid")).toBeNull();
      expect(document.getElementById(ids.emailHint)?.textContent).toBe(words.emailHint);
      expect(slot("checkout-email-error")).toBeNull();
      const submit = slot("address-form-submit-label") as HTMLElement;
      expect(submit.textContent).toBe(words.submit);
      expect(submit.closest("button")?.getAttribute("type")).toBe("submit");
    });

    it("posts the address form to the action it was given", () => {
      renderCheckout("en", "contact", { action: "/checkout/contact" });
      expect(slot("address-form")?.getAttribute("action")).toBe("/checkout/contact");
    });

    it("says an email's error beside it, and marks the field invalid", () => {
      renderCheckout("en", "contact", { errors: { email: "pattern" } });
      const ids = checkoutIds("main");
      const email = document.getElementById(ids.email) as HTMLElement;
      expect(email.getAttribute("aria-invalid")).toBe("true");
      expect(email.getAttribute("aria-describedby")).toBe(`${ids.emailError} ${ids.emailHint}`);
      const error = document.getElementById(ids.emailError) as HTMLElement;
      expect(error.textContent).toBe(catalogs.en.templates.checkout.contact.errors.pattern);
      expect(slot("checkout-email-error")).toBe(error);
    });
  });

  describe("delivery", () => {
    const radios = () => [
      ...document.querySelectorAll<HTMLInputElement>('input[name="shippingOption"]'),
    ];

    it("joins each shipping option to the payment form by its id", () => {
      renderCheckout("en", "delivery");
      const page = pageFixtures.en.checkout.delivery;
      const ids = checkoutIds("main");
      const form = slot("payment-step") as HTMLFormElement;
      expect(form.id).toBe(ids.payment);
      const options = page.step.kind === "delivery" ? page.step.options : [];
      expect(radios().map((radio) => radio.value)).toEqual(options.map((option) => option.id));
      for (const radio of radios()) {
        expect(radio.type).toBe("radio");
        expect(radio.getAttribute("form")).toBe(ids.payment);
        expect(form.contains(radio)).toBe(false);
      }
      const fieldset = slot("checkout-shipping") as HTMLElement;
      expect(
        within(fieldset).getByText(catalogs.en.templates.checkout.delivery.legend).tagName,
      ).toBe("LEGEND");
      expect(fieldset.getAttribute("aria-invalid")).toBeNull();
    });

    it("sends the chosen shipping option with the payment, and the payment method", () => {
      renderCheckout("en", "delivery");
      const form = slot("payment-step") as HTMLFormElement;
      expect(new FormData(form).get("shippingOption")).toBeNull();
      expect(new FormData(form).get("paymentMethod")).toBe("pp_system_default");
      const express = radios().find((radio) => radio.value === "so_express") as HTMLInputElement;
      fireEvent.click(express);
      const data = new FormData(form);
      expect(data.get("shippingOption")).toBe("so_express");
      expect(data.get("paymentMethod")).toBe("pp_system_default");
    });

    it("checks the option it is told was chosen, and the only one there is", () => {
      const props = { copy: checkoutCopy(catalogs.en), locale: "en-US", now: NOW, prefetch: false };
      const first = render(
        <CheckoutTemplate {...deliveryWith({ selected: "so_free" })} {...props} />,
      );
      expect(
        radios()
          .filter((radio) => radio.checked)
          .map((radio) => radio.value),
      ).toEqual(["so_free"]);
      first.unmount();
      const page = deliveryWith({});
      if (page.step.kind !== "delivery") throw new Error("the fixture's delivery step is not one");
      const only = page.step.options.slice(0, 1);
      render(<CheckoutTemplate {...page} step={{ ...page.step, options: only }} {...props} />);
      expect(
        radios()
          .filter((radio) => radio.checked)
          .map((radio) => radio.value),
      ).toEqual([only[0]?.id]);
    });

    it("posts the payment form to the action it was given", () => {
      renderCheckout("en", "delivery", { action: "/checkout/delivery" });
      expect(slot("payment-step")?.getAttribute("action")).toBe("/checkout/delivery");
    });

    it("says there is no delivery, and the way back to the address, with no option", () => {
      const page = deliveryWith({ options: [] });
      render(
        <CheckoutTemplate
          {...page}
          copy={checkoutCopy(catalogs.en)}
          locale="en-US"
          now={NOW}
          prefetch={false}
        />,
      );
      const words = catalogs.en.templates.checkout.delivery.none;
      const block = slot("checkout-no-delivery") as HTMLElement;
      expect(within(block).getByText(words.title)).toBeTruthy();
      expect(within(block).getByText(words.text)).toBeTruthy();
      const back = within(block).getByRole("link", { name: words.back });
      expect(back.getAttribute("href")).toBe(
        page.step.kind === "delivery" ? page.step.addressHref : "",
      );
      expect(slot("payment-step")).toBeNull();
      expect(slot("checkout-delivery")).toBeNull();
      expect(radios()).toHaveLength(0);
    });

    it("says a missing shipping choice by the fieldset, and marks it invalid", () => {
      renderCheckout("en", "delivery", { errors: { shipping: "required" } });
      const ids = checkoutIds("main");
      const fieldset = slot("checkout-shipping") as HTMLElement;
      expect(fieldset.getAttribute("aria-invalid")).toBe("true");
      expect(fieldset.getAttribute("aria-describedby")).toBe(ids.shippingError);
      expect(document.getElementById(ids.shippingError)?.textContent).toBe(
        catalogs.en.templates.checkout.delivery.required,
      );
    });
  });

  describe("review", () => {
    it("draws the four parts, each with an Edit link named by its part to its step", () => {
      renderCheckout("en", "review");
      const page = pageFixtures.en.checkout.review;
      const words = catalogs.en.templates.checkout.review;
      if (page.step.kind !== "review") throw new Error("the fixture's review step is not one");
      const { editHrefs } = page.step;
      const parts = slots("checkout-review-part");
      expect(parts).toHaveLength(4);
      const expected = [
        [words.contact, editHrefs.contact],
        [words.shipping, editHrefs.contact],
        [words.delivery, editHrefs.delivery],
        [words.payment, editHrefs.delivery],
      ] as const;
      for (const [i, [title, href]] of expected.entries()) {
        const part = parts[i] as HTMLElement;
        expect(within(part).getByRole("heading", { level: 3 }).textContent).toBe(title);
        const name = formatMessage(words.editLabel, { part: title }, "en-US");
        expect(name).toBe(`Edit: ${title}`);
        const edit = within(part).getByRole("link", { name });
        expect(edit.textContent).toBe(words.edit);
        expect(edit.getAttribute("href")).toBe(href);
        expect(edit.getAttribute("data-slot")).toBe("checkout-review-edit");
      }
      expect(screen.getAllByRole("link", { name: /^Edit: / })).toHaveLength(4);
    });

    it("shows what was chosen: the email, the address, the delivery and the payment", () => {
      renderCheckout("en", "review");
      const page = pageFixtures.en.checkout.review;
      if (page.step.kind !== "review") throw new Error("the fixture's review step is not one");
      const parts = slots("checkout-review-part");
      expect(parts[0]?.textContent).toContain(page.step.email);
      expect(parts[1]?.textContent).toContain(page.step.shippingAddress.lastName);
      expect(parts[2]?.textContent).toContain(page.step.shippingMethod.name);
      expect(parts[2]?.textContent).toContain(
        page.step.shippingMethod.price.amount === 0
          ? catalogs.en.molecules.shippingOptionCard.free
          : "$",
      );
      const payment = page.step.payment;
      expect(parts[3]?.textContent).toContain(
        payment.last4 === undefined ? (payment.name ?? "") : `•••• ${payment.last4}`,
      );
    });

    it("places the order by a form posting to the action it was given", () => {
      renderCheckout("en", "review", { action: "/checkout/place" });
      const words = catalogs.en.templates.checkout.review;
      const form = slot("checkout-place-order") as HTMLFormElement;
      expect(form.getAttribute("action")).toBe("/checkout/place");
      expect(form.getAttribute("method")).toBe("post");
      const button = within(form).getByRole("button", { name: words.place });
      expect(button.getAttribute("type")).toBe("submit");
      expect(form.textContent).toContain(words.note);
    });

    it("leaves the order's form to the browser's page without an action", () => {
      renderCheckout("en", "review");
      expect(slot("checkout-place-order")?.getAttribute("action")).toBeNull();
    });
  });

  describe("errors", () => {
    it.each(STEPS)("says the form's error in an alert at the top of the %s step", (kind) => {
      renderCheckout("en", kind, { errors: { form: "unavailable" } });
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toBe(catalogs.en.templates.checkout.errors.unavailable);
      expect(slot("checkout-error")).toBe(alert);
      const section = slot("checkout-steps-step") as HTMLElement;
      expect(section.contains(alert)).toBe(true);
      expect(
        stepHeading().compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("draws no alert when nothing failed", () => {
      renderCheckout("en", "contact");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("is a div with another id where the page has its main already", () => {
    renderCheckout("en", "contact", { as: "div", mainId: "checkout" });
    expect(screen.queryByRole("main")).toBeNull();
    const root = slot("checkout-template") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.id).toBe("checkout");
    const ids = checkoutIds("checkout");
    expect(slot("address-form")?.id).toBe(ids.address);
    expect(document.getElementById(ids.email)?.getAttribute("form")).toBe(ids.address);
  });
});
