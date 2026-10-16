import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "./separator";

describe("Separator", () => {
  it("is a horizontal separator by default, in the border token", () => {
    render(<Separator />);
    const line = screen.getByRole("separator");
    expect(line.getAttribute("aria-orientation")).toBe("horizontal");
    expect(line.className).toContain("bg-border");
  });

  it("can be vertical", () => {
    render(<Separator orientation="vertical" />);
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("vertical");
  });

  // PR 42 review: `data-horizontal:` matched no attribute Base UI sets, so the line had no size.
  it.each([
    ["horizontal", "h-px"],
    ["vertical", "w-px"],
  ] as const)("sizes its %s line by the attribute it renders", (orientation, size) => {
    render(<Separator orientation={orientation} />);
    const line = screen.getByRole("separator");
    const value = line.getAttribute("data-orientation");
    expect(value).toBe(orientation);
    expect(line.className.split(" ")).toContain(`data-[orientation=${value}]:${size}`);
  });
});
