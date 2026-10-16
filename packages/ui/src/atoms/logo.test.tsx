import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Logo } from "./logo";

const Mark = () => (
  <svg viewBox="0 0 24 24" data-testid="mark">
    <path d="M2 2h20v20H2z" fill="currentColor" />
  </svg>
);

describe("Logo", () => {
  it("is an image named by the store's name, with the SVG in its slot", () => {
    render(
      <Logo name="Shopblok">
        <Mark />
      </Logo>,
    );
    const logo = screen.getByRole("img", { name: "Shopblok" });
    expect(logo.querySelector("svg")).toBe(screen.getByTestId("mark"));
    expect(logo.className).toContain("h-8");
  });

  it("shows the name as text when there is no SVG", () => {
    render(<Logo name="Shopblok" />);
    expect(screen.getByText("Shopblok")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("requires the name", () => {
    // @ts-expect-error -- `name` is required (D30).
    render(<Logo />);
  });

  it.each(longLabels)("takes a long %s name, and wraps it as text", (_locale, strings) => {
    const { unmount } = render(
      <Logo name={strings.storeName}>
        <Mark />
      </Logo>,
    );
    expect(screen.getByRole("img", { name: strings.storeName })).toBeTruthy();
    unmount();
    render(<Logo name={strings.storeName} />);
    const text = screen.getByText(strings.storeName);
    expect(text.className).not.toMatch(CLIPPING_CLASSES);
    expect(text.className).toContain("max-w-full");
  });
});
