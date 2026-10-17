import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BoldIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Toggle, toggleVariants } from "./toggle";

const source = readFileSync(path.join(import.meta.dirname, "toggle.tsx"), "utf8");

describe("Toggle", () => {
  it("is not a client component: no state and no events in the file, and toggleVariants stays callable from both kinds", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is a button with aria-pressed, named by its content, at least 44 × 44 px (D32)", () => {
    render(<Toggle>Bold</Toggle>);
    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.className).toContain("min-h-11");
    expect(toggle.className).toContain("min-w-11");
    expect(toggle.getAttribute("data-slot")).toBe("toggle");
  });

  it("can be named by an aria-label when it holds only an icon", () => {
    render(
      <Toggle aria-label="Bold">
        <BoldIcon aria-hidden="true" />
      </Toggle>,
    );
    expect(screen.getByRole("button", { name: "Bold" }).className).toContain("min-w-11");
  });

  it("has no size under 44 px: the large one is 48 px and the kit's sm is gone", () => {
    expect(toggleVariants({ size: "default" })).toContain("min-h-11");
    expect(toggleVariants({ size: "lg" })).toContain("min-h-12");
    expect(toggleVariants({ size: "lg" })).toContain("min-w-12");
    // @ts-expect-error -- the size was removed on purpose (D32).
    expect(toggleVariants({ size: "sm" })).not.toMatch(/\bh-(?:8|9|10)\b|\bmin-w-(?:8|9|10)\b/);
    expect(toggleVariants()).not.toMatch(
      /(?:^|\s)(?:h-8|h-9|h-10|min-w-8|min-w-9|min-w-10)(?:\s|$)/,
    );
  });

  it("toggles with a click, Space and Enter, and tells the change", async () => {
    const onPressedChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle onPressedChange={onPressedChange}>Bold</Toggle>);
    await user.tab();
    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(document.activeElement).toBe(toggle);
    await user.keyboard(" ");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(onPressedChange.mock.calls.map(([pressed]) => pressed)).toEqual([true, false, true]);
  });

  it("does nothing when disabled", async () => {
    const onPressedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Toggle disabled onPressedChange={onPressedChange}>
        Bold
      </Toggle>,
    );
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(onPressedChange).not.toHaveBeenCalled();
  });

  it("marks the pressed state with the primary fill (3:1 or more), not the kit's 1.1:1 muted", () => {
    render(<Toggle defaultPressed>Bold</Toggle>);
    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.className).toContain("aria-pressed:bg-primary");
    expect(toggle.className).toContain("aria-pressed:text-primary-foreground");
    // Hovering a pressed toggle keeps its text readable on the filled background.
    expect(toggle.className).toContain("aria-pressed:hover:bg-primary/80");
    expect(toggle.className).toContain("aria-pressed:hover:text-primary-foreground");
    expect(toggle.className).not.toContain("aria-pressed:bg-muted");
  });

  it("draws the focus ring at full strength and marks invalid by its border alone (D35)", () => {
    render(
      <Toggle aria-invalid="true" variant="outline">
        Bold
      </Toggle>,
    );
    const classes = screen.getByRole("button", { name: "Bold" }).className;
    expect(classes).toContain("focus-visible:ring-ring");
    expect(classes).toContain("aria-invalid:border-destructive");
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).toContain("border-input");
  });

  it("pads an icon on the logical side", () => {
    expect(toggleVariants()).toContain("has-data-[icon=inline-end]:pe-2");
    expect(toggleVariants()).toContain("has-data-[icon=inline-start]:ps-2");
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(<Toggle>{strings.toggleLabel}</Toggle>);
    const toggle = screen.getByRole("button", { name: strings.toggleLabel });
    expect(toggle.className).not.toMatch(CLIPPING_CLASSES);
    expect(toggle.className).toContain("min-h-11");
  });
});
