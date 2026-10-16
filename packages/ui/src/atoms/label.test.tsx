import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Input } from "./input";
import { Label } from "./label";

describe("Label", () => {
  it("names the field it points at", () => {
    render(
      <>
        <Label htmlFor="size">Size</Label>
        <Input id="size" />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Size" })).toBeTruthy();
  });

  it("dims with a disabled control, native or Base UI", () => {
    render(<Label>Size</Label>);
    const label = screen.getByText("Size");
    expect(label.className).toContain("peer-disabled:opacity-50");
    expect(label.className).toContain("peer-data-disabled:opacity-50");
    expect(label.className).toContain("has-data-disabled:opacity-50");
  });

  it.each(longLabels)("wraps a long %s label with room between its lines", (_locale, strings) => {
    render(<Label>{strings.fieldLabel}</Label>);
    const label = screen.getByText(strings.fieldLabel);
    expect(label.className).not.toMatch(CLIPPING_CLASSES);
    expect(label.className).toContain("leading-snug");
    expect(label.className).not.toContain("leading-none");
  });
});
