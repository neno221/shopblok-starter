import { sampleImage } from "@shopblok/fixtures";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Swatch } from "./swatch";

describe("Swatch", () => {
  it("is a button named by its label, 44 × 44 px (D32), with the colour from its prop", () => {
    const { container } = render(<Swatch label="Forest green" colour="#2f5d3a" />);
    const swatch = screen.getByRole("button", { name: "Forest green" });
    expect(swatch.className).toContain("size-11");
    expect(swatch.getAttribute("aria-pressed")).toBe("false");
    const disc = container.querySelector<HTMLElement>("[data-slot=swatch] > span");
    expect(disc?.style.backgroundColor).not.toBe("");
  });

  it("marks the selected one with aria-pressed and a thicker edge, not by colour alone", () => {
    render(<Swatch label="Black" colour="#111111" selected />);
    const swatch = screen.getByRole("button", { name: "Black" });
    expect(swatch.getAttribute("aria-pressed")).toBe("true");
    expect(swatch.getAttribute("data-selected")).toBe("");
    expect(swatch.className).toContain("data-selected:border-2");
  });

  it("draws an image swatch", () => {
    const { container } = render(<Swatch label="Linen" image={sampleImage.src} />);
    expect(container.querySelector("img")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Linen" })).toBeTruthy();
  });

  it("strikes an unavailable swatch through, says so, and can still be reached", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Swatch
        label="Brick"
        colour="#a4452c"
        unavailable
        unavailableLabel="Unavailable"
        onClick={onClick}
      />,
    );
    const swatch = screen.getByRole("button", { name: "Brick, Unavailable" });
    expect(swatch.getAttribute("data-unavailable")).toBe("");
    expect(container.querySelector(".-rotate-45")).not.toBeNull();
    await user.tab();
    expect(document.activeElement).toBe(swatch);
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Swatch label="Black" colour="#111111" disabled onClick={onClick} />);
    const swatch = screen.getByRole("button", { name: "Black" });
    expect(swatch).toHaveProperty("disabled", true);
    await user.click(swatch);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is pressed with Space and draws the ring at full strength when focused", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Swatch label="Black" colour="#111111" onClick={onClick} />);
    await user.tab();
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
    const classes = screen.getByRole("button", { name: "Black" }).className;
    expect(classes).toContain("focus-visible:ring-ring");
    expect(classes).not.toContain("ring-ring/");
  });

  it.each(longLabels)("takes a long %s label as its name", (_locale, strings) => {
    render(<Swatch label={strings.optionLabel} colour="#111111" />);
    expect(screen.getByRole("button", { name: strings.optionLabel })).toBeTruthy();
  });

  it("drops aria-pressed when it is given a role, which only a button may carry (VariantSelector)", () => {
    render(<Swatch label="Black" colour="#111111" selected role="radio" aria-checked />);
    const radio = screen.getByRole("radio", { name: "Black" });
    expect(radio.hasAttribute("aria-pressed")).toBe(false);
    expect(radio.getAttribute("aria-checked")).toBe("true");
    // The edge still follows `selected`.
    expect(radio.getAttribute("data-selected")).toBe("");
  });

  it("keeps aria-pressed for the button role", () => {
    render(<Swatch label="Black" colour="#111111" selected role="button" />);
    expect(screen.getByRole("button", { name: "Black" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("needs unavailableLabel when unavailable", () => {
    // @ts-expect-error -- without its label the sold-out state would be a line alone (WCAG 1.4.1).
    render(<Swatch label="Forest" colour="green" unavailable />);
  });
});
