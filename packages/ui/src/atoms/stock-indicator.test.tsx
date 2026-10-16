import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { StockIndicator } from "./stock-indicator";

describe("StockIndicator", () => {
  it.each([
    ["in-stock", "In stock", "text-stock-in"],
    ["low", "Only 3 left", "text-stock-low"],
    ["out", "Out of stock", "text-stock-out"],
  ] as const)("says %s in words and in its token's colour", (status, text, token) => {
    render(<StockIndicator status={status} text={text} />);
    // WCAG 1.4.1: the text carries the state, the colour only adds to it.
    const indicator = screen.getByText(text).closest("[data-slot=stock-indicator]");
    expect(indicator?.textContent).toBe(text);
    expect(indicator?.className).toContain(token);
    expect(indicator?.getAttribute("data-status")).toBe(status);
  });

  it("gives each state its own icon, hidden from assistive technology", () => {
    const shapes = (["in-stock", "low", "out"] as const).map((status) => {
      const { container, unmount } = render(<StockIndicator status={status} text={status} />);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      const markup = svg?.innerHTML;
      unmount();
      return markup;
    });
    expect(new Set(shapes).size).toBe(3);
  });

  it("needs its text", () => {
    // @ts-expect-error -- `text` is required: colour alone is not enough (WCAG 1.4.1).
    render(<StockIndicator status="low" />);
  });

  it.each(longLabels)("wraps a long %s text instead of cutting it", (_locale, strings) => {
    render(<StockIndicator status="low" text={strings.hint} />);
    const indicator = screen.getByText(strings.hint).closest("[data-slot=stock-indicator]");
    expect(indicator?.textContent).toBe(strings.hint);
    expect(indicator?.className).not.toMatch(CLIPPING_CLASSES);
  });
});
