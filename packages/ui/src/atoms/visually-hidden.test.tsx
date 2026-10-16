import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { VisuallyHidden } from "./visually-hidden";

describe("VisuallyHidden", () => {
  it("keeps its text in the document and hides it with sr-only", () => {
    render(
      <p>
        Total <VisuallyHidden>including VAT</VisuallyHidden>
      </p>,
    );
    const hidden = screen.getByText("including VAT");
    expect(hidden.className).toContain("sr-only");
    expect(hidden.getAttribute("aria-hidden")).toBeNull();
    expect(hidden.closest("p")?.textContent).toBe("Total including VAT");
  });

  it("names a control", () => {
    render(
      <button type="button">
        <VisuallyHidden>Search</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });

  it.each(longLabels)("takes a long %s text", (_locale, strings) => {
    render(<VisuallyHidden>{strings.helpText}</VisuallyHidden>);
    expect(screen.getByText(strings.helpText)).toBeTruthy();
  });
});
