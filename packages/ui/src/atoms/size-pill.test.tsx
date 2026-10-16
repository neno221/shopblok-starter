import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { SizePill } from "./size-pill";

describe("SizePill", () => {
  it("is a button named by its text, at least 44 × 44 px (D32)", () => {
    render(<SizePill>M</SizePill>);
    const pill = screen.getByRole("button", { name: "M" });
    expect(pill.className).toContain("min-h-11");
    expect(pill.className).toContain("min-w-11");
    expect(pill.getAttribute("aria-pressed")).toBe("false");
  });

  it("marks the selected one with aria-pressed and a solid fill", () => {
    render(<SizePill selected>M</SizePill>);
    const pill = screen.getByRole("button", { name: "M" });
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(pill.className).toContain("data-selected:bg-primary");
  });

  it("strikes an unavailable size through, says so, and can still be reached", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <SizePill unavailable unavailableLabel="Unavailable" onClick={onClick}>
        XL
      </SizePill>,
    );
    const pill = screen.getByRole("button", { name: /^XL\s*,\s*Unavailable$/ });
    expect(pill.className).toContain("data-unavailable:line-through");
    expect(pill.getAttribute("data-unavailable")).toBe("");
    await user.tab();
    expect(document.activeElement).toBe(pill);
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <SizePill disabled onClick={onClick}>
        S
      </SizePill>,
    );
    await user.click(screen.getByRole("button", { name: "S" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("draws the ring at full strength when focused", () => {
    render(<SizePill>M</SizePill>);
    const classes = screen.getByRole("button", { name: "M" }).className;
    expect(classes).toContain("focus-visible:ring-ring");
    expect(classes).not.toContain("ring-ring/");
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(<SizePill>{strings.optionLabel}</SizePill>);
    const pill = screen.getByRole("button", { name: strings.optionLabel });
    expect(pill.className).not.toMatch(CLIPPING_CLASSES);
    expect(pill.className).toContain("min-h-11");
  });
});
