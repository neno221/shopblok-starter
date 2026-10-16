import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Label } from "./label";
import { Switch } from "./switch";

describe("Switch", () => {
  it("keeps the kit's track and a 44 px tall hit area (D32)", () => {
    render(<Switch aria-label="Newsletter" />);
    const control = screen.getByRole("switch", { name: "Newsletter" });
    expect(control.className).toContain("w-[32px]");
    // 18.4 px + 2 × 13 px = 44.4 px tall, 32 px + 2 × 6 px = 44 px wide.
    expect(control.className).toContain("after:-inset-y-[13px]");
    expect(control.className).toContain("after:-inset-x-1.5");
  });

  it("toggles with Space", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Newsletter" onCheckedChange={onCheckedChange} />);
    await user.tab();
    const control = screen.getByRole("switch", { name: "Newsletter" });
    expect(document.activeElement).toBe(control);
    await user.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
    expect(control.className).toContain("focus-visible:ring-ring");
  });

  it("toggles when its label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Label className="min-h-11">
        <Switch />
        Newsletter
      </Label>,
    );
    await user.click(screen.getByText("Newsletter"));
    expect(screen.getByRole("switch", { name: "Newsletter" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Newsletter" disabled />);
    const control = screen.getByRole("switch", { name: "Newsletter" });
    await user.click(control);
    await user.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("false");
  });

  it("moves its thumb the other way in a right-to-left page", () => {
    render(<Switch aria-label="Newsletter" />);
    const thumb = screen.getByRole("switch").querySelector("[data-slot=switch-thumb]");
    expect(thumb?.className).toContain("rtl:data-checked:-translate-x-[calc(100%-2px)]");
  });

  it("is announced as invalid", () => {
    render(<Switch aria-label="Terms" aria-invalid="true" />);
    expect(screen.getByRole("switch").className).toContain("aria-invalid:border-destructive");
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(
      <Label>
        <Switch />
        {strings.helpText}
      </Label>,
    );
    expect(screen.getByRole("switch", { name: strings.helpText })).toBeTruthy();
  });
});
