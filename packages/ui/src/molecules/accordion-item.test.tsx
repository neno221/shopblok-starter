import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { Accordion } from "../primitives/accordion";
import { AccordionItem } from "./accordion-item";

/** The FAQ's five questions in the accordion primitive, `open` of them open at first. */
function Faq({
  locale = "en",
  open = ["shipping"],
  headingLevel,
  extra,
}: {
  locale?: Locale;
  open?: string[];
  headingLevel?: React.ComponentProps<typeof AccordionItem>["headingLevel"];
  extra?: React.ReactNode;
}) {
  const { items } = commerceFixtures[locale].site.faq;
  return (
    <Accordion defaultValue={open} multiple>
      {items.map((item) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          title={item.title}
          headingLevel={headingLevel}
        >
          {item.answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </AccordionItem>
      ))}
      {extra}
    </Accordion>
  );
}

/** Text with its spaces made plain: French writes a no-break space before "?", which Testing Library folds. */
const plain = (text: string) => text.replace(/\s+/g, " ").trim();
const byPlain = (text: string) => (_content: string, element: Element | null) =>
  element?.children.length === 0 && plain(element.textContent ?? "") === plain(text);

const trigger = (name: string | RegExp) => screen.getByRole("button", { name });

describe("AccordionItem", () => {
  describe("structure", () => {
    it("is a button inside a heading, one for each section, named by its title", () => {
      render(<Faq />);
      const { items } = commerceFixtures.en.site.faq;
      expect(screen.getAllByRole("heading")).toHaveLength(items.length);
      for (const item of items) {
        const heading = screen.getByRole("heading", { name: item.title });
        expect(within(heading).getByRole("button", { name: item.title })).toBeTruthy();
      }
    });

    it("is a level 3 heading by default, and the page's level when told", () => {
      const { unmount } = render(<Faq />);
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
      unmount();
      for (const level of [1, 2, 4, 5, 6] as const) {
        const view = render(<Faq headingLevel={level} />);
        expect(screen.getAllByRole("heading", { level })).toHaveLength(5);
        expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
        view.unmount();
      }
    });

    it("names its open panel by its title: a region labelled by the trigger", () => {
      render(<Faq open={["returns"]} />);
      const { items } = commerceFixtures.en.site.faq;
      const returns = items.find((item) => item.value === "returns");
      const region = screen.getByRole("region", { name: returns?.title });
      expect(region.getAttribute("data-slot")).toBe("accordion-content");
      expect(trigger(returns?.title ?? "").getAttribute("aria-controls")).toBe(region.id);
    });

    it("keeps the primitive's item as its wrapper, so the dividers stay", () => {
      const { container } = render(<Faq />);
      const wrappers = container.querySelectorAll("[data-slot=accordion-item]");
      expect(wrappers).toHaveLength(5);
      expect(wrappers[0]?.className).toContain("not-last:border-b");
    });

    it("takes the caller's class on the item, and passes other props to it", () => {
      const { container } = render(
        <Accordion>
          <AccordionItem value="x" title="Question" className="bg-muted" data-testid="item">
            Answer
          </AccordionItem>
        </Accordion>,
      );
      const item = container.querySelector("[data-slot=accordion-item]");
      expect(item?.className).toContain("bg-muted");
      expect(item?.getAttribute("data-testid")).toBe("item");
    });

    it("needs a value, a title and a body (a type error, checked by tsc)", () => {
      const noTitle = (
        // @ts-expect-error -- `title` is required (the contract's AccordionSection).
        <AccordionItem value="a">Body</AccordionItem>
      );
      const noValue = (
        // @ts-expect-error -- `value` is required.
        <AccordionItem title="Q">Body</AccordionItem>
      );
      const badLevel = (
        // @ts-expect-error -- a heading is h1 to h6.
        <AccordionItem value="a" title="Q" headingLevel={7}>
          Body
        </AccordionItem>
      );
      const fine = (
        <AccordionItem value="a" title="Q">
          Body
        </AccordionItem>
      );
      expect([noTitle, noValue, badLevel, fine]).toHaveLength(4);
    });
  });

  describe("states", () => {
    it("starts with the sections the accordion says are open, and the others closed", () => {
      render(<Faq open={["sizing"]} />);
      const { items } = commerceFixtures.en.site.faq;
      for (const item of items) {
        expect(trigger(item.title).getAttribute("aria-expanded")).toBe(
          item.value === "sizing" ? "true" : "false",
        );
      }
      expect(screen.getAllByRole("region")).toHaveLength(1);
      expect(screen.getByText(commerceFixtures.en.site.faq.items[2]?.answer[0] ?? "")).toBeTruthy();
    });

    it("opens and closes with a click", async () => {
      const user = userEvent.setup();
      render(<Faq open={[]} />);
      const { items } = commerceFixtures.en.site.faq;
      const first = items[0];
      expect(screen.queryAllByRole("region")).toHaveLength(0);
      await user.click(trigger(first?.title ?? ""));
      expect(trigger(first?.title ?? "").getAttribute("aria-expanded")).toBe("true");
      expect(await screen.findByText(first?.answer[0] ?? "")).toBeTruthy();
      await user.click(trigger(first?.title ?? ""));
      await waitFor(() => expect(screen.queryByText(first?.answer[0] ?? "")).toBeNull());
      expect(trigger(first?.title ?? "").getAttribute("aria-expanded")).toBe("false");
    });

    it("opens and closes from the keyboard with Enter and Space", async () => {
      const user = userEvent.setup();
      render(<Faq open={[]} />);
      const { items } = commerceFixtures.en.site.faq;
      const second = trigger(items[1]?.title ?? "");
      second.focus();
      await user.keyboard("{Enter}");
      expect(second.getAttribute("aria-expanded")).toBe("true");
      await user.keyboard(" ");
      await waitFor(() => expect(second.getAttribute("aria-expanded")).toBe("false"));
      await user.keyboard(" ");
      expect(second.getAttribute("aria-expanded")).toBe("true");
    });

    it("is reached in the page's tab order: one stop for each trigger, none inside a closed body", async () => {
      const user = userEvent.setup();
      render(<Faq open={[]} />);
      const { items } = commerceFixtures.en.site.faq;
      await user.tab();
      expect(document.activeElement).toBe(trigger(items[0]?.title ?? ""));
      await user.tab();
      expect(document.activeElement).toBe(trigger(items[1]?.title ?? ""));
    });

    it("keeps a disabled section out of the tab order", () => {
      render(
        <Accordion>
          <AccordionItem value="a" title="Closed for now" disabled>
            Body
          </AccordionItem>
        </Accordion>,
      );
      const disabled = trigger("Closed for now");
      expect(
        disabled.hasAttribute("disabled") || disabled.getAttribute("aria-disabled") === "true",
      ).toBe(true);
    });
  });

  describe("the rules", () => {
    it("has a trigger of 44 px at least that fills the row", () => {
      render(<Faq />);
      for (const item of commerceFixtures.en.site.faq.items) {
        const button = trigger(item.title);
        expect(button.className).toContain("min-h-11");
        expect(button.className).toContain("flex-1");
        expect(button.className).not.toMatch(/(?:^|\s)(?:h-\d|size-\d|min-h-[0-9]\b)/);
      }
    });

    it("draws the focus ring at full strength", () => {
      render(<Faq />);
      const className = trigger(commerceFixtures.en.site.faq.items[0]?.title ?? "").className;
      expect(className).toContain("focus-visible:ring-ring");
      expect(className).not.toContain("ring-ring/");
    });

    it("hides the chevron from assistive technology, and turns it when open", () => {
      const { container } = render(<Faq />);
      const chevrons = container.querySelectorAll("[data-slot=accordion-item-chevron]");
      expect(chevrons).toHaveLength(5);
      for (const chevron of chevrons) {
        expect(chevron.getAttribute("aria-hidden")).toBe("true");
        expect(chevron.getAttribute("class")).toContain(
          "group-aria-expanded/accordion-trigger:rotate-180",
        );
      }
    });

    it("animates the panel's height with Base UI's variable, not the primitive's inert classes", () => {
      render(<Faq />);
      const panel = screen.getByRole("region");
      const classes = panel.className;
      expect(classes).toContain("h-(--accordion-panel-height)");
      expect(classes).toContain("data-starting-style:h-0");
      expect(classes).toContain("data-ending-style:h-0");
      expect(classes).toContain("transition-[height]");
      expect(classes).toContain("overflow-hidden");
      expect(classes).not.toMatch(/animate-accordion-(?:down|up)/);
    });

    it("moves nothing under prefers-reduced-motion: the height and the chevron do not transition", () => {
      const { container } = render(<Faq />);
      expect(screen.getByRole("region").className).toContain("motion-reduce:transition-none");
      for (const chevron of container.querySelectorAll("[data-slot=accordion-item-chevron]")) {
        expect(chevron.getAttribute("class")).toContain("motion-reduce:transition-none");
      }
    });

    it("sets no colour, size or direction by itself that the rules forbid", () => {
      const source = readFileSync(path.join(import.meta.dirname, "accordion-item.tsx"), "utf8")
        .split("\n")
        .filter((line) => !line.startsWith("//"))
        .join("\n");
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(source).not.toMatch(/animate-accordion/);
      expect(source).not.toMatch(/\buse(?:State|Effect|Ref|Id|Memo)\(/);
    });
  });

  describe.each(LOCALES)("in %s", (locale) => {
    it("shows the FAQ's questions as the triggers' names and the answer's paragraphs", () => {
      render(<Faq locale={locale} open={["shipping"]} />);
      const { items } = commerceFixtures[locale].site.faq;
      for (const item of items) expect(trigger(item.title)).toBeTruthy();
      const region = screen.getByRole("region");
      expect(within(region).getAllByText(/./)).toHaveLength(items[0]?.answer.length ?? 0);
    });

    it("lets the longest question wrap instead of cutting it", () => {
      const { long } = commerceFixtures[locale].site.faq;
      render(
        <Accordion defaultValue={[long.value]}>
          <AccordionItem value={long.value} title={long.title}>
            {long.answer.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </AccordionItem>
        </Accordion>,
      );
      const button = trigger(long.title);
      expect(button.className).not.toMatch(CLIPPING_CLASSES);
      const label = within(button).getByText(byPlain(long.title));
      expect(label.className).toContain("wrap-anywhere");
      expect(label.className).toContain("min-w-0");
      expect(label.className).not.toMatch(CLIPPING_CLASSES);
      for (const paragraph of long.answer) {
        expect(screen.getByText(byPlain(paragraph)).closest("p")?.className ?? "").not.toMatch(
          CLIPPING_CLASSES,
        );
      }
    });
  });
});
