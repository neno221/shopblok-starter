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
});
