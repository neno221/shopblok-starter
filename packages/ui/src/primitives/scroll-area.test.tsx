import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders its content in a viewport whose focus ring is at full strength (D35)", () => {
    render(
      <ScrollArea className="h-24">
        <p>Sizing chart</p>
      </ScrollArea>,
    );
    const viewport = document.querySelector("[data-slot=scroll-area-viewport]");
    expect(viewport?.textContent).toBe("Sizing chart");
    expect(screen.getByText("Sizing chart")).toBeTruthy();
    expect(viewport?.className).toContain("focus-visible:ring-ring");
    expect(viewport?.className).not.toContain("ring-ring/");
    expect(viewport?.className).not.toContain("outline-1");
  });

  it("styles the scrollbar by Base UI's data-orientation, with logical borders", () => {
    render(
      <ScrollAreaPrimitive.Root>
        <ScrollAreaPrimitive.Viewport>content</ScrollAreaPrimitive.Viewport>
        <ScrollBar keepMounted data-testid="vertical" />
        <ScrollBar keepMounted orientation="horizontal" data-testid="horizontal" />
      </ScrollAreaPrimitive.Root>,
    );
    const vertical = screen.getByTestId("vertical");
    const horizontal = screen.getByTestId("horizontal");
    expect(vertical.getAttribute("data-orientation")).toBe("vertical");
    expect(horizontal.getAttribute("data-orientation")).toBe("horizontal");
    expect(vertical.className).toContain("data-[orientation=vertical]:border-s");
    expect(vertical.className).toContain("data-[orientation=vertical]:border-s-transparent");
    expect(horizontal.className).toContain("data-[orientation=horizontal]:h-2.5");
    const classes = `${vertical.className} ${horizontal.className}`;
    expect(classes).not.toMatch(/data-horizontal|data-vertical|border-l/);
  });
});
