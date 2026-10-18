// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). PaymentStep's tests, in Testing
// Library and happy-dom: one form that posts unless its action is a function, a fieldset named
// "Payment" with one radio group (saved cards first, an expired one not choosable, then the region's
// ways to pay), the system payment when there is nothing else, the card details box (the Payment
// Element's slot and "save for next time" only where a customer may keep a card), the error in a
// status region that is always there, the pending submit, the arrows through the group, a long German
// and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { PaymentStep as PaymentStepContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { PaymentStep, SYSTEM_ID, type PaymentStepProps } from "./payment-step";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const NOW = "2026-10-18T09:00:00.000Z";
type Which = "saved" | "guest" | "system";

const copyOf = (locale: Locale): PaymentStepProps["copy"] => ({
  step: catalogs[locale].organisms.paymentStep,
  method: catalogs[locale].molecules.paymentMethodCard,
  brands: catalogs[locale].atoms.payment,
});
const paymentOf = (locale: Locale, which: Which = "saved"): PaymentStepContent =>
  commerceFixtures[locale].cartCheckout.payment[which];

function element(
  locale: Locale = "en",
  which: Which = "saved",
  props: Partial<PaymentStepProps> = {},
) {
  return (
    <PaymentStep
      {...paymentOf(locale, which)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      now={NOW}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const form = () => slot("payment-step") as HTMLFormElement;
const radios = () => screen.getAllByRole("radio") as HTMLInputElement[];
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

describe("PaymentStep: the form", () => {
  it("posts unless its action is a function", () => {
    const { unmount } = render(element("en", "saved", { action: "/checkout/payment" }));
    expect(form().getAttribute("method")).toBe("post");
    expect(form().getAttribute("action")).toBe("/checkout/payment");
    unmount();
    render(element("en", "saved", { action: async () => {} }));
    expect(form().hasAttribute("method")).toBe(false);
  });

  it.each(LOCALES)("is a fieldset named 'Payment' with one radio group, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale).step;
    const group = screen.getByRole("group", { name: copy.legend });
    expect(group.tagName.toLowerCase()).toBe("fieldset");
    const { saved, methods } = paymentOf(locale);
    expect(radios()).toHaveLength(saved.length + methods.length);
    expect(new Set(radios().map((radio) => radio.name))).toEqual(new Set(["paymentMethod"]));
    // The saved cards first, then the region's ways to pay, each under its own name.
    expect(screen.getByRole("group", { name: copy.saved })).toBeTruthy();
    expect(screen.getByRole("group", { name: copy.methods })).toBeTruthy();
    expect(radios().map((radio) => radio.value)).toEqual([
      ...saved.map((card) => card.id),
      ...methods.map((method) => method.id),
    ]);
  });

  it.each(LOCALES)(
    "names each saved card in words and starts on the chosen one, in %s",
    (locale) => {
      render(element(locale));
      const copy = copyOf(locale);
      for (const card of paymentOf(locale).saved) {
        const name = formatMessage(
          copy.step.card,
          { brand: copy.brands[card.brand], last4: card.last4 },
          htmlLang[locale],
        );
        expect(screen.getByRole("radio", { name })).toBeTruthy();
      }
      const chosen = radios().find((radio) => radio.checked);
      expect(chosen?.value).toBe(paymentOf(locale).selected);
    },
  );

  it("says which card is the default, and when each expires", () => {
    render(element("en"));
    const visa = screen.getByRole("radio", { name: "Visa ending in 4242" });
    const described = (visa.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["Expires 08/2028", "Default"]);
  });

  it("keeps an expired card in the list but not choosable, and says so in words", () => {
    render(element("en", "saved", { now: "2028-01-15T00:00:00.000Z" }));
    const mastercard = screen.getByRole("radio", {
      name: "Mastercard ending in 4444",
    }) as HTMLInputElement;
    expect(mastercard.disabled).toBe(true);
    expect(mastercard.checked).toBe(false);
    const described = document.getElementById(mastercard.getAttribute("aria-describedby") ?? "");
    expect(described?.textContent).toBe("Expired 12/2027");
    expect(described?.className).toContain("text-destructive");
  });

  it("offers the system payment when every saved card has expired and nothing else is on offer", () => {
    const { saved } = paymentOf("en", "saved");
    render(element("en", "saved", { saved, methods: [], now: "2099-01-15T00:00:00.000Z" }));
    const copy = copyOf("en").step;
    const radio = screen.getByRole("radio", { name: copy.systemName }) as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it("offers a guest the region's ways to pay with no saved cards' heading", () => {
    render(element("en", "guest"));
    expect(screen.queryByRole("group", { name: "Your saved cards" })).toBeNull();
    expect(screen.queryByText("Other ways to pay")).toBeNull();
    expect(radios()).toHaveLength(paymentOf("en", "guest").methods.length);
    expect(radios().every((radio) => !radio.checked)).toBe(true);
    expect(radios().every((radio) => radio.required)).toBe(true);
  });

  it.each(LOCALES)(
    "offers the system payment, chosen, when nothing else is on offer, in %s",
    (locale) => {
      render(element(locale, "system"));
      const copy = copyOf(locale).step;
      const radio = screen.getByRole("radio", { name: copy.systemName }) as HTMLInputElement;
      expect(radio.value).toBe(SYSTEM_ID);
      expect(radio.checked).toBe(true);
      expect(
        document.getElementById(radio.getAttribute("aria-describedby") ?? "")?.textContent,
      ).toBe(copy.systemText);
      expect(slot("payment-step-details")).toBeNull();
    },
  );
});

describe("PaymentStep: the card details", () => {
  it("draws the Payment Element's slot and the save box, shown by CSS while a card is chosen", () => {
    render(element("en", "saved", { paymentElement: <div data-testid="stripe">Stripe</div> }));
    const box = slot("payment-step-details") as HTMLElement;
    expect(box.className).toContain("hidden");
    expect(box.className).toContain("group-has-[[data-kind=card]_input:checked]/payment:flex");
    expect(form().className).toContain("group/payment");
    expect(within(box).getByTestId("stripe")).toBeTruthy();
    const save = within(box).getByRole("checkbox", {
      name: "Save this card for next time",
    }) as HTMLInputElement;
    expect(save.name).toBe("saveForLater");
    expect(save.checked).toBe(false);
    expect(save.closest("label")?.className).toContain("min-h-11");
    // The way that takes a card is the one the box follows.
    expect(form().querySelector('[data-kind="card"] input[type="radio"]')).not.toBeNull();
  });

  it("starts with the box ticked when the customer asked before", () => {
    render(element("en", "saved", { saveForLater: true }));
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("offers a guest no 'save for next time'", () => {
    render(element("en", "guest"));
    expect(slot("payment-step-details")).not.toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("PaymentStep: errors and sending", () => {
  it("has a polite status region that is there and empty at first", () => {
    render(element("en"));
    const region = slot("payment-step-status") as HTMLElement;
    expect(region.getAttribute("role")).toBe("status");
    expect(region.textContent).toBe("");
    expect(screen.getByRole("group", { name: "Payment" }).hasAttribute("aria-invalid")).toBe(false);
  });

  it.each(LOCALES)("says a choice is needed and ties it to the fieldset, in %s", (locale) => {
    render(element(locale, "guest", { error: "required" }));
    const copy = copyOf(locale).step;
    const fieldset = screen.getByRole("group", { name: copy.legend });
    expect(fieldset.getAttribute("aria-invalid")).toBe("true");
    const error = document.getElementById(fieldset.getAttribute("aria-describedby") ?? "");
    expect(error?.textContent).toBe(copy.errors.required);
    expect(slot("payment-step-status")?.contains(error as Node)).toBe(true);
  });

  it("says the server failed without marking the fieldset invalid", () => {
    render(element("en", "saved", { error: "failed" }));
    expect(slot("payment-step-status")?.textContent).toBe(copyOf("en").step.errors.failed);
    expect(screen.getByRole("group", { name: "Payment" }).hasAttribute("aria-invalid")).toBe(false);
  });

  it("is a 44 px submit, with the page's words when it has its own", () => {
    render(element("en", "saved", { submitLabel: "Place order" }));
    const submit = screen.getByRole("button", { name: "Place order" });
    expect(submit.getAttribute("type")).toBe("submit");
    expect(submit.className).toContain("min-h-12");
  });

  it("holds the submit while it is sent, so it cannot be sent twice", async () => {
    render(element("en", "saved", { status: "pending" }));
    const submit = screen.getByRole("button", { name: "Saving…" });
    expect(submit.getAttribute("type")).toBe("button");
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    expect(form().getAttribute("aria-busy")).toBe("true");
    const blocker = form().firstElementChild as HTMLButtonElement;
    expect(blocker.type).toBe("submit");
    expect(blocker.disabled).toBe(true);
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener("submit", submitted);
    const user = userEvent.setup();
    submit.focus();
    await user.keyboard("{Enter}");
    expect(submitted).not.toHaveBeenCalled();
  });
});

describe("PaymentStep: the keyboard", () => {
  it("is one Tab stop for the group, the arrows move the choice, skipping an expired card", async () => {
    render(
      <>
        <button type="button">Before</button>
        {element("en", "saved", { now: "2028-01-15T00:00:00.000Z" })}
      </>,
    );
    const user = userEvent.setup();
    screen.getByRole("button", { name: "Before" }).focus();
    await user.tab();
    const visa = screen.getByRole("radio", { name: "Visa ending in 4242" }) as HTMLInputElement;
    expect(document.activeElement).toBe(visa);
    await user.keyboard("{ArrowDown}");
    const amex = screen.getByRole("radio", {
      name: "American Express ending in 0005",
    }) as HTMLInputElement;
    expect(document.activeElement).toBe(amex);
    expect(amex.checked).toBe(true);
    await user.tab();
    expect(document.activeElement?.getAttribute("type")).toBe("checkbox");
  });

  it("draws the focus ring at full strength on every radio card", () => {
    render(element("en"));
    for (const radio of radios()) {
      const card = radio.closest("label") as HTMLElement;
      expect(card.className).toContain("has-[:focus-visible]:ring-ring");
      expect(card.className).toContain("min-h-11");
    }
  });
});

describe("PaymentStep: long labels", () => {
  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    render(
      element(locale, "system", {
        copy: {
          ...copyOf(locale),
          step: {
            ...copyOf(locale).step,
            legend: long.fieldLabel,
            systemName: long.optionLabel,
            systemText: long.helpText,
            submit: long.action,
          },
        },
      }),
    );
    expect(classesIn(form()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByText(long.fieldLabel).className).toContain("wrap-anywhere");
    expect(screen.getByText(long.optionLabel).className).toContain("wrap-break-word");
    expect(screen.getByText(long.action).className).toContain("wrap-anywhere");
    expect(screen.getByRole("radio", { name: long.optionLabel })).toBeTruthy();
  });
});
