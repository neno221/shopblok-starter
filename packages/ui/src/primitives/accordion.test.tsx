import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

function Example({ question = "Can I return an item?" }: { question?: string }) {
  return (
    <Accordion>
      <AccordionItem value="returns">
        <AccordionTrigger>{question}</AccordionTrigger>
        <AccordionContent>Yes, within 30 days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="shipping">
        <AccordionTrigger>How long is delivery?</AccordionTrigger>
        <AccordionContent>Two to four days.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("has triggers at least 44 px tall (D32), with the ring at full strength (D35)", () => {
    render(<Example />);
    for (const trigger of screen.getAllByRole("button")) {
      expect(trigger.className).toContain("min-h-11");
      expect(trigger.className).toContain("focus-visible:ring-ring");
      expect(trigger.className).not.toContain("ring-ring/");
      expect(trigger.className).toContain("text-start");
      expect(trigger.className).not.toMatch(/text-left|dark:/);
    }
  });

  it("hides its chevrons from assistive technology and puts them at the end", () => {
    render(<Example />);
    const trigger = screen.getAllByRole("button")[0]!;
    const icons = trigger.querySelectorAll("[data-slot=accordion-trigger-icon]");
    expect(icons).toHaveLength(2);
    for (const icon of icons) expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(trigger.className).toContain("**:data-[slot=accordion-trigger-icon]:ms-auto");
    expect(trigger.getAttribute("class")).not.toContain("ml-auto");
  });

  it("opens with Enter and Space, and each trigger is a tab stop (Base UI's Accordion has no arrow keys)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const [returns, shipping] = screen.getAllByRole("button") as [HTMLElement, HTMLElement];
    expect(document.activeElement).toBe(returns);
    expect(returns.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard("{Enter}");
    expect(returns.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Yes, within 30 days.")).toBeTruthy();
    await user.tab();
    expect(document.activeElement).toBe(shipping);
    await user.keyboard(" ");
    expect(shipping.getAttribute("aria-expanded")).toBe("true");
  });

  it.each(longLabels)("wraps a long %s question instead of cutting it", (_l, strings) => {
    render(<Example question={strings.productDescription} />);
    const trigger = screen.getByRole("button", { name: strings.productDescription });
    expect(trigger.className).not.toMatch(CLIPPING_CLASSES);
    expect(trigger.className).toContain("items-start");
  });

  it('is not a client component: no "use client", so a server page can render it (D42)', () => {
    const source = readFileSync(path.join(import.meta.dirname, "accordion.tsx"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });
});
