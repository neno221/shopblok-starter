import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { StepperState } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { Stepper, type StepperProps } from "./stepper";

// `next/link` becomes the anchor it renders, so a test can read the `prefetch` it was given.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...props
  }: { prefetch?: boolean | null; children?: React.ReactNode } & Record<string, unknown>) => (
    <a data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const flow = (locale: Locale) => commerceFixtures[locale].checkoutFlow.steps;
// The name of a done link: the step's name and ", completed", which the test environment may put a
// space between (a browser reads the comma either way).
const contactDone = /^Contact and address ?, completed$/;
const deliveryDone = /^Delivery and payment ?, completed$/;

function element(locale: Locale, state: StepperState, props: Partial<StepperProps> = {}) {
  return (
    <Stepper
      {...state}
      copy={catalogs[locale].molecules.stepper}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

function setup(locale: Locale, state: StepperState, props?: Partial<StepperProps>) {
  return render(element(locale, state, props));
}

const items = (root: ParentNode = document) => [...root.querySelectorAll("ol > li")];
/** The label of a step as a reader gets it: what is drawn and what is hidden. */
const label = (item: Element) =>
  plain(item.querySelector("[data-slot=stepper-label]")?.textContent);

describe("Stepper", () => {
  describe("structure", () => {
    it("is a navigation named by the copy, around an ordered list of the steps", () => {
      setup("en", flow("en").delivery);
      const nav = screen.getByRole("navigation", { name: "Checkout steps" });
      const list = within(nav).getByRole("list");
      expect(list.tagName).toBe("OL");
      expect(items()).toHaveLength(3);
      expect(within(list).getAllByRole("listitem")).toHaveLength(3);
      // Only list items inside the list: a screen reader counts "list, 3 items".
      expect([...list.children].every((child) => child.tagName === "LI")).toBe(true);
    });

    it("names the list by a prop where the flow is not checkout's", () => {
      setup("en", flow("en").delivery, { label: "Return steps" });
      expect(screen.getByRole("navigation", { name: "Return steps" })).toBeTruthy();
      expect(screen.queryByRole("navigation", { name: "Checkout steps" })).toBeNull();
    });

    it("is not a set of tabs: no tablist, tab or tabpanel, and no aria-orientation", () => {
      const { container } = setup("en", flow("en").delivery);
      expect(container.querySelector("[role=tablist], [role=tab], [role=tabpanel]")).toBeNull();
      expect(container.querySelector("[aria-orientation]")).toBeNull();
      expect(container.querySelector("[aria-controls], [aria-selected]")).toBeNull();
      expect(container.querySelector("button")).toBeNull();
    });

    it("has the root as a plain wrapper, so the navigation is the landmark", () => {
      const { container } = setup("en", flow("en").delivery);
      const root = container.querySelector("[data-slot=stepper]");
      expect(root?.getAttribute("role")).toBe("none");
      expect(root?.firstElementChild?.tagName).toBe("NAV");
      expect(screen.getAllByRole("navigation")).toHaveLength(1);
    });

    it("lists the steps in order, each with its id and its label", () => {
      setup("en", flow("en").delivery);
      expect(items().map((item) => item.getAttribute("data-step"))).toEqual([
        "contact",
        "delivery",
        "review",
      ]);
      expect(items().map((item) => label(item).replace(/^Step \d of \d: /, ""))).toEqual([
        "Contact and address, completed",
        "Delivery and payment",
        "Review",
      ]);
    });

    it("passes the root's own props on, and merges the class", () => {
      const { container } = setup("en", flow("en").delivery, {
        id: "checkout-steps",
        className: "max-w-xl",
      });
      const root = container.querySelector("[data-slot=stepper]");
      expect(root?.id).toBe("checkout-steps");
      expect(root?.className).toContain("max-w-xl");
      expect(root?.className).toContain("@container");
    });

    it("keeps the reading direction the page gives it", () => {
      const { container } = setup("en", flow("en").delivery, { dir: "rtl" });
      expect(container.querySelector("[data-slot=stepper]")?.getAttribute("dir")).toBe("rtl");
    });

    it("renders on the server as a nav, an ordered list and links, with no script", () => {
      const markup = renderToStaticMarkup(element("en", flow("en").review));
      expect(markup).toContain("<nav");
      expect(markup).toContain('aria-label="Checkout steps"');
      expect(markup).toContain("<ol");
      expect(markup).toContain('aria-current="step"');
      expect(markup).toContain('href="/us/checkout/contact"');
      expect(markup).toContain('href="/us/checkout/delivery"');
      expect(markup).not.toContain("<button");
      expect(markup).not.toContain("<script");
    });

    it("gives each stepper on a page ids of its own, or none to clash", () => {
      const { container } = render(
        <>
          {[0, 1].map((key) => (
            <Fragment key={key}>{element("en", flow("en").delivery)}</Fragment>
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(screen.getAllByRole("navigation")).toHaveLength(2);
    });
  });

  describe("where the reader is", () => {
    it("marks the current step with aria-current=step, and only that one", () => {
      for (const [place, current] of [
        ["contact", 0],
        ["delivery", 1],
        ["review", 2],
      ] as const) {
        const { unmount } = setup("en", flow("en")[place]);
        const marked = items().filter((item) => item.getAttribute("aria-current") === "step");
        expect(marked, place).toHaveLength(1);
        expect(items().indexOf(marked[0]!), place).toBe(current);
        expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
        unmount();
      }
    });

    it("marks the current step in a longer flow too", () => {
      setup("en", flow("en").five);
      const marked = items().find((item) => item.getAttribute("aria-current") === "step");
      expect(marked?.getAttribute("data-step")).toBe("payment");
      expect(items()).toHaveLength(5);
    });

    it("says where the reader is, in words, before the current step's name", () => {
      setup("en", flow("en").delivery);
      const current = items()[1]!;
      const hidden = current.querySelector("[data-slot=stepper-label] .sr-only");
      expect(plain(hidden?.textContent)).toBe("Step 2 of 3:");
      expect(label(current)).toBe("Step 2 of 3: Delivery and payment");
      // Only the current step says it.
      expect(label(items()[0]!)).not.toContain("Step ");
      expect(label(items()[2]!)).not.toContain("Step ");
    });

    it("counts the steps it was given: Step 4 of 5", () => {
      setup("en", flow("en").five);
      expect(label(items()[3]!)).toBe("Step 4 of 5: Payment");
    });

    it("says a step done is completed, in words after its name", () => {
      setup("en", flow("en").review);
      expect(label(items()[0]!)).toBe("Contact and address, completed");
      expect(label(items()[1]!)).toBe("Delivery and payment, completed");
      // Not the current step, and not one to come.
      expect(label(items()[2]!)).toBe("Step 3 of 3: Review");
    });

    it("tells the three apart by shape and weight as well as colour", () => {
      const { container } = setup("en", flow("en").delivery);
      const [done, current, next] = items() as [Element, Element, Element];
      const circle = (item: Element) => item.querySelector("[data-slot=stepper-indicator]");
      expect(circle(done)?.getAttribute("data-state")).toBe("completed");
      expect(circle(current)?.getAttribute("data-state")).toBe("active");
      expect(circle(next)?.getAttribute("data-state")).toBe("inactive");
      // Done: a check mark instead of the number.
      expect(circle(done)?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
      expect(circle(done)?.textContent).toBe("");
      // Current: the number, in a filled circle with a ring around it.
      expect(circle(current)?.textContent).toBe("2");
      expect(circle(current)?.className).toContain("data-[state=active]:ring-2");
      // To come: the number, in a hollow circle.
      expect(circle(next)?.textContent).toBe("3");
      expect(circle(next)?.querySelector("svg")).toBeNull();
      // The weights differ: current is bold, done is medium, to come is muted.
      const weight = (item: Element) =>
        item.querySelector("[data-slot=stepper-label]")?.className ?? "";
      expect(weight(current)).toContain("font-semibold");
      expect(weight(done)).toContain("font-medium");
      expect(weight(done)).not.toContain("font-semibold");
      expect(weight(next)).toContain("text-muted-foreground");
      expect(weight(next)).not.toContain("font-");
      expect(container.querySelectorAll("[data-state=completed]").length).toBeGreaterThan(0);
    });

    it("hides the number and the check mark from assistive technology", () => {
      const { container } = setup("en", flow("en").delivery);
      for (const circle of container.querySelectorAll("[data-slot=stepper-indicator]")) {
        for (const child of circle.querySelectorAll("span, svg"))
          expect(child.closest("[aria-hidden=true]"), circle.outerHTML).toBeTruthy();
      }
    });

    it("writes the numbers as the locale does", () => {
      setup("el", flow("el").delivery);
      const numbers = [...document.querySelectorAll("[data-slot=stepper-indicator]")].map(
        (circle) => circle.textContent,
      );
      // Greek numerals are the Latin digits; the done step shows a check instead of its number.
      expect(numbers).toEqual(["", "2", "3"]);
    });

    it("has no current step when current names none: nothing is done either", () => {
      const { container } = setup("en", { ...flow("en").delivery, current: "nowhere" });
      expect(container.querySelector("[aria-current]")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
      expect(container.textContent).not.toContain("Step ");
      expect(container.textContent).not.toContain("completed");
    });
  });

  describe("the steps before the current one", () => {
    it("are links back to the step, named by the step and by its being done", () => {
      setup("en", flow("en").review);
      const contact = screen.getByRole("link", { name: contactDone });
      expect(contact.getAttribute("href")).toBe("/us/checkout/contact");
      const delivery = screen.getByRole("link", { name: deliveryDone });
      expect(delivery.getAttribute("href")).toBe("/us/checkout/delivery");
      expect(screen.getAllByRole("link")).toHaveLength(2);
    });

    it("are inside their list item, with the aria-current only on the current one", () => {
      setup("en", flow("en").review);
      for (const link of screen.getAllByRole("link"))
        expect(link.closest("li")?.hasAttribute("aria-current")).toBe(false);
    });

    it("start no link at the first step: there is nothing to go back to", () => {
      setup("en", flow("en").contact);
      expect(screen.queryByRole("link")).toBeNull();
    });

    it("link nothing that is current or to come, even where the data gives an href", () => {
      const state: StepperState = {
        ...flow("en").delivery,
        steps: flow("en").delivery.steps.map((step) => ({ ...step, href: `/x/${step.id}` })),
      };
      setup("en", state);
      expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
        "/x/contact",
      ]);
    });

    it("are marked done without a link where the data has no href", () => {
      const state: StepperState = {
        ...flow("en").delivery,
        steps: flow("en").delivery.steps.map(({ id, label: text }) => ({ id, label: text })),
      };
      setup("en", state);
      expect(screen.queryByRole("link")).toBeNull();
      expect(label(items()[0]!)).toBe("Contact and address, completed");
      expect(items()[0]!.querySelector("[data-slot=stepper-indicator] svg")).toBeTruthy();
    });

    it("pass prefetch on to every link, and leave it unset otherwise", () => {
      const { unmount } = setup("en", flow("en").review, { prefetch: false });
      for (const link of screen.getAllByRole("link"))
        expect(link.getAttribute("data-prefetch")).toBe("false");
      unmount();
      setup("en", flow("en").review);
      for (const link of screen.getAllByRole("link"))
        expect(link.getAttribute("data-prefetch")).toBe("undefined");
    });

    it("are the only tab stops: the current step and the ones to come are text", async () => {
      const user = userEvent.setup();
      setup("en", flow("en").review);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: contactDone }));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: deliveryDone }));
      await user.tab();
      expect(document.activeElement).toBe(document.body);
      // Back again with Shift+Tab.
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByRole("link", { name: deliveryDone }));
    });

    it("follows the keyboard: Enter on the link is the browser's own", async () => {
      const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
      const user = userEvent.setup();
      setup("en", flow("en").review);
      const link = screen.getByRole("link", { name: contactDone });
      link.addEventListener("click", onClick as unknown as EventListener);
      link.focus();
      await user.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("the copy", () => {
    it.each(LOCALES)("names the navigation and the current step in %s", (locale) => {
      const copy = catalogs[locale].molecules.stepper;
      setup(locale, flow(locale).delivery);
      expect(screen.getByRole("navigation", { name: copy.label })).toBeTruthy();
      const current = items().find((item) => item.getAttribute("aria-current") === "step");
      expect(current).toBeTruthy();
      expect(label(current!)).toBe(
        plain(
          `${formatMessage(copy.position, { step: 2, count: 3 }, htmlLang[locale])} ${
            flow(locale).delivery.steps[1]?.label
          }`,
        ),
      );
    });

    it.each(LOCALES)("says a step is completed in %s", (locale) => {
      const copy = catalogs[locale].molecules.stepper;
      setup(locale, flow(locale).review);
      expect(label(items()[0]!)).toBe(
        plain(`${flow(locale).review.steps[0]?.label}${copy.completed}`),
      );
      expect(screen.getAllByRole("link")).toHaveLength(2);
    });

    it("is English, Greek, German and French words, not one language's", () => {
      const labels = LOCALES.map((locale) => catalogs[locale].molecules.stepper.label);
      expect(new Set(labels).size).toBe(4);
    });
  });

  describe("sizes and long labels", () => {
    it("makes a link back at least 44 px high and wide (D32)", () => {
      setup("en", flow("en").review);
      for (const link of screen.getAllByRole("link")) {
        expect(link.className).toContain("min-h-11");
        expect(link.className).toContain("min-w-11");
      }
    });

    it("gives the current step and the ones to come the same box, so the row does not jump", () => {
      const { container } = setup("en", flow("en").delivery);
      for (const box of container.querySelectorAll("[data-slot=stepper-step]")) {
        expect(box.className).toContain("min-h-11");
        expect(box.className).toContain("min-w-11");
      }
    });

    it("draws a ring at full strength on a link's focus", () => {
      setup("en", flow("en").review);
      for (const link of screen.getAllByRole("link")) {
        expect(link.className).toContain("focus-visible:ring-ring");
        expect(link.className).not.toMatch(/ring-ring\/\d/);
      }
    });

    it("lays the labels out from a container's width, not the viewport's", () => {
      const { container } = setup("en", flow("en").delivery);
      // Below it only the current step's label is drawn, the others are read but not seen.
      const [done, current, next] = items() as [Element, Element, Element];
      const labelOf = (item: Element) => item.querySelector("[data-slot=stepper-label]");
      expect(labelOf(done)?.className).toMatch(/(?:^|\s)sr-only(?:\s|$)/);
      expect(labelOf(next)?.className).toMatch(/(?:^|\s)sr-only(?:\s|$)/);
      expect(labelOf(current)?.className).not.toMatch(/(?:^|\s)sr-only(?:\s|$)/);
      // From it up they are drawn, and the lines grow between the circles.
      expect(labelOf(done)?.className).toContain("@lg:not-sr-only");
      expect(container.querySelector("[data-slot=stepper-separator]")?.className).toContain(
        "@lg:block",
      );
      expect(container.querySelector("[data-slot=stepper]")?.className).toContain("@container");
      expect(container.innerHTML).not.toMatch(/(?:^|[\s"])(?:sm|md|lg|xl):/);
    });

    it("needs more room for four steps or more than for three", () => {
      const { container } = setup("en", flow("en").five);
      const first = items()[0]!.querySelector("[data-slot=stepper-label]");
      expect(first?.className).toContain("@3xl:not-sr-only");
      expect(first?.className).not.toContain("@lg:");
      expect(container.querySelector("[data-slot=stepper-separator]")?.className).toContain(
        "@3xl:block",
      );
    });

    it("wraps onto a second line in a container too narrow for the circles, and never from its width up", () => {
      const { container, rerender } = setup("en", flow("en").delivery);
      const list = container.querySelector("ol");
      expect(list?.className).toContain("flex-wrap");
      expect(list?.className).toContain("@lg:flex-nowrap");
      rerender(element("en", flow("en").five));
      expect(container.querySelector("ol")?.className).toContain("@3xl:flex-nowrap");
      expect(container.querySelector("ol")?.className).not.toContain("@lg:");
    });

    it("has no separator after the last step", () => {
      const { container } = setup("en", flow("en").delivery);
      expect(container.querySelectorAll("[data-slot=stepper-separator]")).toHaveLength(2);
      expect(items()[2]!.querySelector("[data-slot=stepper-separator]")).toBeNull();
    });

    it("draws a done line in the primary colour and a line to come in the border colour", () => {
      const { container } = setup("en", flow("en").delivery);
      const lines = [...container.querySelectorAll("[data-slot=stepper-separator]")];
      expect(lines.map((line) => line.getAttribute("data-state"))).toEqual(["completed", "active"]);
      for (const line of lines) {
        expect(line.className).toContain("bg-border");
        expect(line.className).toContain("data-[state=completed]:bg-primary");
      }
    });

    it.each(["de", "el"] as const)("lets the longest labels, in %s, wrap", (locale) => {
      const { container } = setup(locale, flow(locale).long);
      for (const node of container.querySelectorAll("*")) {
        expect(String(node.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      for (const text of container.querySelectorAll("[data-slot=stepper-label]")) {
        expect(text.className).toContain("wrap-anywhere");
        expect(text.className).toContain("min-w-0");
      }
      for (const item of items()) expect(item.className).toContain("min-w-0");
      // Every step's whole name is in the page, drawn or not.
      const names = items().map((item) => label(item));
      flow(locale).long.steps.forEach((step, index) => expect(names[index]).toContain(step.label));
    });

    it("uses only logical properties: the steps run the other way in a right-to-left page", () => {
      const { container } = setup("en", flow("en").delivery);
      const classes = [...container.querySelectorAll("*")]
        .map((node) => node.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
    });
  });
});
