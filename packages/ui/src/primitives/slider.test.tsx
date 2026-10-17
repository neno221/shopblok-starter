import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Slider } from "./slider";

const source = readFileSync(path.join(import.meta.dirname, "slider.tsx"), "utf8");
const names = ["Minimum price", "Maximum price"];
const getThumbLabel = (index: number) => names[index] ?? "Price";

// The wrapper aligns the thumbs to the edges (`thumbAlignment="edge"`), and Base UI keeps such a
// thumb `visibility: hidden` until it has measured it. happy-dom has no layout, so a thumb never
// becomes visible there and neither `getByRole` nor Tab would find it. The tests that need the
// keyboard or an accessible name ask for `thumbAlignment="center"`, which Base UI draws at once.
const visible = { thumbAlignment: "center" } as const;

function sliders() {
  return screen.getAllByRole("slider") as HTMLInputElement[];
}

describe("Slider", () => {
  it("is not a client component: no state and no events in the file", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("has one slider per value, each named by getThumbLabel (the type requires it)", () => {
    render(<Slider defaultValue={[20, 80]} getThumbLabel={getThumbLabel} {...visible} />);
    expect(sliders().map((thumb) => thumb.getAttribute("aria-label"))).toEqual(names);
    expect(screen.getByRole("slider", { name: "Minimum price" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Maximum price" })).toBeTruthy();
    // @ts-expect-error -- `getThumbLabel` is required: a thumb has no other accessible name.
    render(<Slider defaultValue={[10]} />);
  });

  it("gives each thumb a 44 × 44 hit area around its 16 px circle, and the control 44 px (D32)", () => {
    render(<Slider defaultValue={[20, 80]} getThumbLabel={getThumbLabel} />);
    const thumb = document.querySelector("[data-slot=slider-thumb]");
    expect(thumb?.className).toContain("size-4");
    // 14 px inside the 1 px border + 2 × 15 px (`-inset-[15px]`) = 44 px each way.
    expect(thumb?.className).toContain("after:absolute");
    expect(thumb?.className).toContain("after:-inset-[15px]");
    expect(document.querySelector("[data-slot=slider] > div")?.className).toContain(
      "data-[orientation=horizontal]:min-h-11",
    );
  });

  it("draws the thumb on the background token, with the ring at full strength when its input has focus (D35)", () => {
    render(<Slider defaultValue={[50]} getThumbLabel={getThumbLabel} />);
    const classes = document.querySelector("[data-slot=slider-thumb]")?.className ?? "";
    expect(classes).toContain("bg-background");
    expect(classes).not.toMatch(/bg-(?:white|black)/);
    expect(classes).toContain("ring-ring");
    expect(classes).not.toMatch(/ring-ring\/\d/);
    // Focus is on the `<input>` inside the thumb, so the thumb has to ask for it with `has-`.
    expect(classes).toContain("has-[:focus-visible]:ring-4");
    expect(classes).not.toMatch(/(?:^|\s)focus-visible:ring/);
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
  });

  it.each(["horizontal", "vertical"] as const)(
    "keys its %s layout on the data-orientation Base UI renders",
    (orientation) => {
      render(
        <Slider orientation={orientation} defaultValue={[40]} getThumbLabel={getThumbLabel} />,
      );
      const parts = ["slider", "slider-track", "slider-range"].map(
        (slot) => document.querySelector(`[data-slot=${slot}]`) as HTMLElement,
      );
      for (const part of parts) {
        expect(part.getAttribute("data-orientation")).toBe(orientation);
        expect(part.className).toContain(`data-[orientation=${orientation}]:`);
      }
      // The kit's `data-horizontal:` and `data-vertical:` match nothing Base UI sets.
      expect(document.body.innerHTML).not.toMatch(/data-(?:horizontal|vertical):/);
      const track = parts[1];
      expect(track?.className).toContain(
        orientation === "horizontal"
          ? "data-[orientation=horizontal]:h-1.5"
          : "data-[orientation=vertical]:w-1.5",
      );
    },
  );

  it("changes its value with the arrow keys, Home, End and Page Up", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Slider
        defaultValue={[50]}
        min={0}
        max={100}
        step={5}
        getThumbLabel={getThumbLabel}
        onValueChange={onValueChange}
        {...visible}
      />,
    );
    await user.tab();
    const [thumb] = sliders();
    expect(document.activeElement).toBe(thumb);
    expect(thumb?.value).toBe("50");
    await user.keyboard("{ArrowRight}");
    expect(thumb?.value).toBe("55");
    await user.keyboard("{ArrowUp}");
    expect(thumb?.value).toBe("60");
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowDown}");
    expect(thumb?.value).toBe("45");
    await user.keyboard("{Home}");
    expect(thumb?.value).toBe("0");
    await user.keyboard("{End}");
    expect(thumb?.value).toBe("100");
    await user.keyboard("{PageDown}");
    expect(Number(thumb?.value)).toBeLessThan(100);
    expect(onValueChange.mock.calls[0]?.[0]).toEqual([55]);
  });

  it("moves each thumb of a range on its own, and Tab goes from one to the next", async () => {
    const user = userEvent.setup();
    render(<Slider defaultValue={[20, 80]} getThumbLabel={getThumbLabel} {...visible} />);
    const [low, high] = sliders();
    await user.tab();
    expect(document.activeElement).toBe(low);
    await user.keyboard("{ArrowRight}");
    expect(low?.value).toBe("21");
    expect(high?.value).toBe("80");
    await user.tab();
    expect(document.activeElement).toBe(high);
    await user.keyboard("{ArrowLeft}");
    expect(high?.value).toBe("79");
  });

  it("does not move when disabled", async () => {
    const user = userEvent.setup();
    render(<Slider defaultValue={[50]} disabled getThumbLabel={getThumbLabel} {...visible} />);
    const [thumb] = sliders();
    expect(thumb?.disabled).toBe(true);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(thumb?.value).toBe("50");
    expect(document.querySelector("[data-slot=slider-thumb]")?.className).toContain(
      "data-disabled:pointer-events-none",
    );
  });

  it("speaks the formatted number in the page's language, with no English 'start range'", () => {
    render(
      <Slider
        defaultValue={[1250, 4800]}
        min={0}
        max={5000}
        locale="de-DE"
        format={{ maximumFractionDigits: 0 }}
        getThumbLabel={getThumbLabel}
        {...visible}
      />,
    );
    const [low, high] = sliders();
    expect(low?.getAttribute("aria-valuetext")).toBe("1.250");
    expect(high?.getAttribute("aria-valuetext")).toBe("4.800");
    for (const thumb of sliders()) {
      expect(thumb.getAttribute("aria-valuetext")).not.toMatch(/range|start|end/i);
    }
  });

  it.each(longLabels)("takes a long %s thumb label as its name", (_locale, strings) => {
    render(<Slider defaultValue={[10]} getThumbLabel={() => strings.fieldLabel} {...visible} />);
    expect(screen.getByRole("slider", { name: strings.fieldLabel })).toBeTruthy();
    for (const element of document.querySelectorAll("[data-slot^=slider]")) {
      expect(element.className).not.toMatch(CLIPPING_CLASSES);
    }
  });
});
