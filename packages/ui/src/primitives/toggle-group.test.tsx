import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const source = readFileSync(path.join(import.meta.dirname, "toggle-group.tsx"), "utf8");

function Sizes(props: React.ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup aria-label="Size" {...props}>
      <ToggleGroupItem value="s">S</ToggleGroupItem>
      <ToggleGroupItem value="m">M</ToggleGroupItem>
      <ToggleGroupItem value="l">L</ToggleGroupItem>
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  it("says in its header why it is a client component", () => {
    expect(source).toMatch(/^"use client";$/m);
    expect(source.split('"use client"')[0]).toMatch(/client component because/);
  });

  it("is a group named by its label, with a button for each item", () => {
    render(<Sizes />);
    const group = screen.getByRole("group", { name: "Size" });
    expect(group.getAttribute("data-slot")).toBe("toggle-group");
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "S",
      "M",
      "L",
    ]);
  });

  it("makes every item at least 44 × 44 px, in both sizes (D32)", () => {
    render(
      <>
        <Sizes />
        <Sizes size="lg" />
      </>,
    );
    const items = screen.getAllByRole("button");
    expect(items).toHaveLength(6);
    for (const item of items.slice(0, 3)) {
      expect(item.className).toContain("min-h-11");
      expect(item.className).toContain("min-w-11");
    }
    for (const item of items.slice(3)) {
      expect(item.className).toContain("min-h-12");
    }
  });

  it("moves focus with the arrow keys, Home and End, wrapping at the ends, and does not press anything", async () => {
    const user = userEvent.setup();
    render(<Sizes />);
    const [small, medium, large] = screen.getAllByRole("button");
    await user.tab();
    expect(document.activeElement).toBe(small);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(medium);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(large);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(small);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(large);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(small);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(large);
    for (const item of [small, medium, large]) {
      expect(item?.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("is one Tab stop: Tab leaves the group", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Sizes />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });

  it("presses one item at a time with Space, and Enter, and tells the value", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Sizes onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard(" ");
    const [small, medium] = screen.getAllByRole("button");
    expect(small?.getAttribute("aria-pressed")).toBe("true");
    await user.keyboard("{ArrowRight}{Enter}");
    expect(medium?.getAttribute("aria-pressed")).toBe("true");
    expect(small?.getAttribute("aria-pressed")).toBe("false");
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([["s"], ["m"]]);
  });

  it("presses several items when it is `multiple`", async () => {
    const user = userEvent.setup();
    render(<Sizes multiple />);
    const [small, medium] = screen.getAllByRole("button");
    await user.click(small!);
    await user.click(medium!);
    expect(small?.getAttribute("aria-pressed")).toBe("true");
    expect(medium?.getAttribute("aria-pressed")).toBe("true");
  });

  it("passes `vertical` on to Base UI, so ArrowDown and ArrowUp move focus (the kit only drew it vertical)", async () => {
    const user = userEvent.setup();
    render(<Sizes orientation="vertical" />);
    const group = screen.getByRole("group", { name: "Size" });
    expect(group.getAttribute("data-orientation")).toBe("vertical");
    expect(group.className).toContain("data-[orientation=vertical]:flex-col");
    const [small, medium] = screen.getAllByRole("button");
    await user.tab();
    expect(document.activeElement).toBe(small);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(medium);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(small);
  });

  it("rounds the first and last item at the logical start and end, and draws only a start border on the first (spacing 0, outline)", () => {
    render(<Sizes spacing={0} variant="outline" />);
    const [first] = screen.getAllByRole("button");
    const classes = first?.className ?? "";
    expect(classes).toContain("data-[spacing=0]:first:rounded-s-md");
    expect(classes).toContain("data-[spacing=0]:last:rounded-e-md");
    expect(classes).toContain("data-[spacing=0]:data-[variant=outline]:border-s-0");
    expect(classes).toContain("data-[spacing=0]:data-[variant=outline]:first:border-s");
    expect(classes).not.toMatch(/rounded-[lr]-|border-[lr](?:-|\s|$)/);
    expect(first?.getAttribute("data-spacing")).toBe("0");
    expect(first?.getAttribute("data-variant")).toBe("outline");
  });

  it("keys its variants on the data-orientation attribute and aria-pressed that Base UI renders", () => {
    render(<Sizes spacing={0} variant="outline" />);
    const group = screen.getByRole("group", { name: "Size" });
    expect(group.getAttribute("data-orientation")).toBe("horizontal");
    const [first] = screen.getAllByRole("button");
    expect(first?.className).toContain("group-data-[orientation=horizontal]/toggle-group:");
    expect(first?.className).toContain("aria-pressed:bg-primary");
    // The kit's custom variants and Radix's `data-state` match nothing Base UI renders.
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/group-data-(?:horizontal|vertical)\//);
    expect(html).not.toMatch(/(?:^|[\s:"])data-(?:horizontal|vertical):/);
    expect(html).not.toContain("data-[state=on]");
  });

  it("draws the focus ring at full strength, with no dark variant", () => {
    render(<Sizes variant="outline" />);
    for (const item of screen.getAllByRole("button")) {
      expect(item.className).toContain("focus-visible:ring-ring");
      expect(item.className).not.toMatch(/ring-[a-z-]+\/\d/);
      expect(item.className).not.toMatch(/(?:^|[\s:])dark:/);
    }
  });

  it("does not move when disabled", async () => {
    const user = userEvent.setup();
    render(<Sizes disabled />);
    const [small] = screen.getAllByRole("button");
    await user.click(small!);
    expect(small?.getAttribute("aria-pressed")).toBe("false");
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(
      <ToggleGroup aria-label={strings.fieldLabel}>
        <ToggleGroupItem value="a">{strings.toggleLabel}</ToggleGroupItem>
        <ToggleGroupItem value="b">{strings.optionLabel}</ToggleGroupItem>
      </ToggleGroup>,
    );
    for (const name of [strings.toggleLabel, strings.optionLabel]) {
      expect(screen.getByRole("button", { name }).className).not.toMatch(CLIPPING_CLASSES);
    }
    expect(screen.getByRole("group", { name: strings.fieldLabel }).className).not.toMatch(
      CLIPPING_CLASSES,
    );
  });
});
