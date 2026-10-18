// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). CheckoutSteps' tests, in
// Testing Library and happy-dom: the page's heading, the stepper and the step it marks current
// (`aria-current="step"`, the mutation the plan names), the step's section named by its label, the
// summary column (sticky from `lg`), the order of the markup, the whole delivery step by keyboard
// alone (the stepper's link back, the summary's toggle, a payment chosen with the arrows, the
// submit), a long German and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { CheckoutSteps as CheckoutStepsContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { CheckoutSteps, type CheckoutStepsProps } from "./checkout-steps";
import { PaymentStep } from "./payment-step";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const NOW = "2026-10-18T09:00:00.000Z";
type StepId = "contact" | "delivery" | "review";

const copyOf = (locale: Locale): CheckoutStepsProps["copy"] => ({
  steps: catalogs[locale].organisms.checkoutSteps,
  stepper: catalogs[locale].molecules.stepper,
  summary: catalogs[locale].organisms.orderSummary,
  rows: catalogs[locale].molecules.orderSummaryRow,
});
const stateOf = (locale: Locale, step: StepId): CheckoutStepsContent =>
  commerceFixtures[locale].cartCheckout.checkout[step];

function element(
  locale: Locale = "en",
  step: StepId = "delivery",
  props: Partial<CheckoutStepsProps> = {},
) {
  return (
    <CheckoutSteps
      {...stateOf(locale, step)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    >
      {props.children ?? <p>The step&apos;s form</p>}
    </CheckoutSteps>
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

describe("CheckoutSteps: the frame", () => {
  it.each(LOCALES)("is the checkout's page heading, its stepper and its step, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const state = stateOf(locale, "delivery");
    expect(screen.getByRole("heading", { level: 1, name: copy.steps.title })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: copy.stepper.label })).toBeTruthy();
    const current = state.steps.steps.find((step) => step.id === "delivery");
    // The step is a section named by its own heading, one level below the page's.
    const section = screen.getByRole("region", { name: current?.label });
    expect(section).toBe(slot("checkout-steps-step"));
    expect(within(section).getByRole("heading", { level: 2, name: current?.label })).toBeTruthy();
    expect(within(section).getByText("The step's form")).toBeTruthy();
    // The summary is the other region, its heading at the same level as the step's.
    expect(
      screen.getByRole("region", { name: copy.summary.title }).closest("[data-slot]"),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.summary.title }).tagName.toLowerCase(),
    ).toBe("h2");
  });

  it.each<StepId>(["contact", "delivery", "review"])(
    "marks %s, and only it, as the current step",
    (step) => {
      render(element("en", step));
      const marked = document.querySelectorAll('[aria-current="step"]');
      expect(marked).toHaveLength(1);
      expect(marked[0]?.tagName.toLowerCase()).toBe("li");
      expect(marked[0]?.getAttribute("data-step")).toBe(step);
      expect(slot("checkout-steps")?.getAttribute("data-step")).toBe(step);
      const label = stateOf("en", step).steps.steps.find((each) => each.id === step)?.label ?? "";
      expect(screen.getByRole("region", { name: label })).toBe(slot("checkout-steps-step"));
    },
  );

  it("links back to the steps done and to no step to come", () => {
    render(element("en", "review"));
    const nav = screen.getByRole("navigation", { name: "Checkout steps" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/us/checkout/contact",
      "/us/checkout/delivery",
    ]);
    expect(links[0]?.getAttribute("data-prefetch")).toBe("false");
    expect(links[0]?.className).toContain("min-h-11");
  });

  it("takes a page heading at another level, and its sections one below it", () => {
    render(element("en", "delivery", { headingLevel: 2 }));
    expect(screen.getByRole("heading", { level: 2, name: "Checkout" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Delivery and payment" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Order summary" })).toBeTruthy();
  });

  it("puts the summary in a second column, sticky from lg, and the step under the stepper", () => {
    render(element("en"));
    const root = slot("checkout-steps") as HTMLElement;
    expect(root.className).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]");
    const summary = slot("checkout-steps-summary") as HTMLElement;
    for (const token of ["lg:sticky", "lg:top-4", "lg:col-start-2", "lg:row-start-1"])
      expect(summary.className).toContain(token);
    expect(slot("checkout-steps-step")?.className).toContain("lg:col-start-1");
  });

  it("keeps the markup in the order of the screen below lg: stepper, summary, step", () => {
    render(element("en"));
    const root = slot("checkout-steps") as HTMLElement;
    expect([...root.children].map((child) => child.getAttribute("data-slot"))).toEqual([
      "checkout-steps-header",
      "checkout-steps-summary",
      "checkout-steps-step",
    ]);
  });

  it("collapses the summary's lines below lg unless told to open them", () => {
    const { unmount } = render(element("en"));
    expect(screen.getByRole("button", { name: /Show order summary/ })).toBeTruthy();
    unmount();
    render(element("en", "delivery", { summaryOpen: true }));
    expect(
      screen.getByRole("button", { name: /Hide order summary/ }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("shows the delivery's price in the review's summary and not before", () => {
    const { unmount } = render(element("en", "delivery"));
    const pending = catalogs.en.molecules.orderSummaryRow.pending;
    expect(slot("order-summary-rows")?.textContent).toContain(`Shipping${pending}`);
    unmount();
    render(element("en", "review"));
    // The US price has no tax in it, so the tax stays to be worked out; the delivery is chosen.
    expect(slot("order-summary-rows")?.textContent).toContain("Shipping$5.50");
  });
});

describe("CheckoutSteps: by keyboard alone", () => {
  it("goes from the stepper to the summary to a payment and on, with Tab, arrows and Enter", async () => {
    const payment = commerceFixtures.en.cartCheckout.payment.guest;
    const submitted = vi.fn((event: Event) => event.preventDefault());
    render(
      element("en", "delivery", {
        children: (
          <PaymentStep
            {...payment}
            copy={{
              step: catalogs.en.organisms.paymentStep,
              method: catalogs.en.molecules.paymentMethodCard,
              brands: catalogs.en.atoms.payment,
            }}
            locale="en-US"
            now={NOW}
            onSubmitCapture={(event) => submitted(event.nativeEvent)}
          />
        ),
      }),
    );
    const user = userEvent.setup();
    // 1. The link back to the step done.
    await user.tab();
    expect(document.activeElement?.getAttribute("href")).toBe("/us/checkout/contact");
    // 2. The summary's toggle, which opens with Enter.
    await user.tab();
    const toggle = slot("order-summary-toggle") as HTMLButtonElement;
    expect(document.activeElement).toBe(toggle);
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    // 3. The payment's radio group: one stop, then the arrows move through it.
    await user.tab();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(document.activeElement).toBe(radios[0]);
    await user.keyboard(" ");
    expect(radios[0]?.checked).toBe(true);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(radios[1]);
    expect(radios[1]?.checked).toBe(true);
    // 4. The submit, after the group: Enter sends the form.
    await user.tab();
    const submit = screen.getByRole("button", { name: "Continue to review" });
    expect(document.activeElement).toBe(submit);
    await user.keyboard("{Enter}");
    expect(submitted).toHaveBeenCalledTimes(1);
    const sent = new FormData(submit.closest("form") as HTMLFormElement);
    expect(sent.get("paymentMethod")).toBe(payment.methods[1]?.id);
  });
});

describe("CheckoutSteps: long labels", () => {
  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    const state = stateOf(locale, "delivery");
    render(
      element(locale, "delivery", {
        steps: {
          ...state.steps,
          steps: state.steps.steps.map((step) => ({ ...step, label: long.fieldLabel })),
        },
        summary: {
          ...state.summary,
          items: state.summary.items.map((item) => ({ ...item, title: long.productName })),
        },
        copy: { ...copyOf(locale), steps: { title: long.action } },
      }),
    );
    expect(
      classesIn(slot("checkout-steps") as HTMLElement).filter((each) =>
        CLIPPING_CLASSES.test(each),
      ),
    ).toEqual([]);
    expect(screen.getByRole("heading", { level: 1, name: long.action }).className).toContain(
      "wrap-anywhere",
    );
    expect(screen.getByRole("heading", { level: 2, name: long.fieldLabel }).className).toContain(
      "wrap-anywhere",
    );
    expect(screen.getAllByText(long.productName)[0]?.className).toContain("wrap-anywhere");
  });
});
