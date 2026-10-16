import { viewports } from "@shopblok/ui/tokens";
import { describe, expect, it } from "vitest";
import { viewportScale } from "./components/viewport-switcher";
import { viewportWidths, VIEWPORT_NAMES } from "./viewport-widths";

describe("viewportWidths", () => {
  it("takes the three preview widths from the viewport tokens, by name", () => {
    const widths = viewportWidths();
    expect(widths).toEqual([375, 768, 1440]);
    expect(widths).toEqual(
      VIEWPORT_NAMES.map((name) =>
        Number.parseInt(viewports.find((viewport) => viewport.name === name)?.value ?? "", 10),
      ),
    );
  });

  it("leaves the laptop width out and keeps the widths ascending", () => {
    expect(viewportWidths()).not.toContain(1024);
    expect(viewportWidths()).toEqual([...viewportWidths()].sort((a, b) => a - b));
  });
});

describe("viewportScale", () => {
  it("is 0 until the column has been measured, so nothing is drawn at 1:1 and cropped", () => {
    expect(viewportScale(null, 2615)).toBe(0);
  });

  it("fits the column and never scales up", () => {
    expect(viewportScale(1307.5, 2615)).toBe(0.5);
    expect(viewportScale(2615, 2615)).toBe(1);
    expect(viewportScale(5000, 768)).toBe(1);
  });
});
