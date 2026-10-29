import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpacerSection } from "./spacer";

describe("SpacerSection", () => {
  it("is room of its size, outside the page's outline, with a line if asked", () => {
    const { container, rerender } = render(<SpacerSection size="medium" divider />);
    const frame = container.firstElementChild;
    expect(frame?.tagName).toBe("DIV");
    expect(screen.queryByRole("region")).toBeNull();
    expect(frame?.getAttribute("data-size")).toBe("medium");
    expect(frame?.querySelector(".h-16")).toBeTruthy();
    expect(container.querySelector("[data-slot=separator]")).toBeTruthy();
    rerender(<SpacerSection size="large" divider={false} />);
    expect(container.querySelector("[data-slot=separator]")).toBeNull();
  });

  it("ignores the settings' spacing, and keeps the surface and the visibility", () => {
    const { container } = render(
      <SpacerSection
        size="small"
        divider={false}
        settings={{ spacing: "large", surface: "muted", visibility: "desktop" }}
      />,
    );
    const frame = container.firstElementChild;
    expect(frame?.className).toContain("py-0");
    expect(frame?.className).not.toContain("py-16");
    expect(frame?.className).toContain("bg-muted");
    expect(frame?.className).toContain("max-lg:hidden");
  });
});
