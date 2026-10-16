import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology and pulses only when motion is allowed", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const shape = container.firstElementChild;
    expect(shape?.getAttribute("aria-hidden")).toBe("true");
    expect(shape?.className).toContain("motion-safe:animate-pulse");
    expect(shape?.className).not.toMatch(/(?:^|\s)animate-pulse/);
    expect(shape?.className).toContain("bg-muted");
  });
});
