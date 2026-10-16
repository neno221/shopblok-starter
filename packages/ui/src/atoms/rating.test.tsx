import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Rating } from "./rating";

/** The widths of each star's filled layer, in order. */
const fills = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-slot=rating-star-filled]")].map(
    (star) => star.parentElement?.style.width,
  );

describe("Rating", () => {
  it("is one image named by its label, and the stars are hidden from assistive technology", () => {
    const { container } = render(<Rating value={4.5} label="4.5 out of 5" />);
    const rating = screen.getByRole("img", { name: "4.5 out of 5" });
    expect(rating.getAttribute("data-slot")).toBe("rating");
    expect(container.querySelectorAll("[data-slot=rating-star-empty]")).toHaveLength(5);
    expect(rating.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("is read-only: no button, no handler", () => {
    render(<Rating value={3} label="3 out of 5" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img").className).not.toContain("cursor-pointer");
  });

  it("fills whole and half stars", () => {
    expect(fills(render(<Rating value={4.5} label="a" />).container)).toEqual([
      "100%",
      "100%",
      "100%",
      "100%",
      "50%",
    ]);
    expect(fills(render(<Rating value={2} label="b" />).container)).toEqual([
      "100%",
      "100%",
      "0%",
      "0%",
      "0%",
    ]);
  });

  it("rounds to the nearest half and stays between 0 and the maximum", () => {
    expect(fills(render(<Rating value={4.6} label="a" />).container)[4]).toBe("50%");
    expect(fills(render(<Rating value={4.8} label="b" />).container)[4]).toBe("100%");
    expect(fills(render(<Rating value={7} label="c" />).container)).toEqual(Array(5).fill("100%"));
    expect(fills(render(<Rating value={-1} label="d" />).container)).toEqual(Array(5).fill("0%"));
  });

  it("draws as many stars as the maximum", () => {
    const { container } = render(<Rating value={7} max={10} label="7 out of 10" />);
    expect(container.querySelectorAll("[data-slot=rating-star-empty]")).toHaveLength(10);
  });

  it("colours the stars with the rating token, not a palette colour", () => {
    const { container } = render(<Rating value={5} label="5 out of 5" />);
    const filled = container.querySelector("[data-slot=rating-star-filled]");
    expect(filled?.getAttribute("class")).toContain("text-rating");
    expect(filled?.getAttribute("class")).toContain("fill-rating");
  });

  it("shows the value as given, as text that assistive technology skips", () => {
    render(<Rating value={4.6} label="4.6 out of 5" valueText="4,6" />);
    const value = screen.getByText("4,6");
    expect(value.getAttribute("aria-hidden")).toBe("true");
  });

  it("requires the label", () => {
    // @ts-expect-error -- `label` is required (D30).
    render(<Rating value={3} />);
  });

  it.each(longLabels)("takes a long %s label as its name", (_locale, strings) => {
    render(<Rating value={4.5} label={strings.helpText} />);
    expect(screen.getByRole("img", { name: strings.helpText })).toBeTruthy();
  });
});
