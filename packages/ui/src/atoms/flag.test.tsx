import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Flag } from "./flag";

describe("Flag", () => {
  it.each([
    ["CY", "Cyprus"],
    ["us", "United States"],
    ["DE", "Germany"],
    ["ch", "Switzerland"],
    ["GR", "Greece"],
  ] as const)("%s is an SVG image named by its label", (code, name) => {
    const { container } = render(<Flag code={code} label={name} />);
    const flag = screen.getByRole("img", { name });
    expect(flag.tagName.toLowerCase()).toBe("svg");
    expect(flag.getAttribute("data-code")).toBe(code.toUpperCase());
    // country-flag-icons' 3x2 set: a 900 × 600 box, drawn at 3:2.
    expect(flag.getAttribute("viewBox")).toMatch(/^0 0 (\d+) (\d+)$/);
    const [, width, height] = /^0 0 (\d+) (\d+)$/.exec(flag.getAttribute("viewBox") ?? "") ?? [];
    expect(Number(width) / Number(height)).toBeCloseTo(1.5, 1);
    expect(flag.getAttribute("class")).toContain("aspect-[3/2]");
    expect(container.querySelector("svg *")).not.toBeNull();
  });

  it("draws different flags for different countries", () => {
    const markup = (code: "CY" | "DE") => {
      const { container, unmount } = render(<Flag code={code} label={code} />);
      const html = container.innerHTML;
      unmount();
      return html;
    };
    expect(markup("CY")).not.toBe(markup("DE"));
  });

  it("keeps its name for a code the set does not have", () => {
    // @ts-expect-error -- not an ISO 3166-1 code, so the type refuses it; the component survives it.
    render(<Flag code="ZZ" label="Nowhere" />);
    expect(screen.getByRole("img", { name: "Nowhere" })).toBeTruthy();
  });

  it("requires the label", () => {
    // @ts-expect-error -- `label` is required (D30).
    render(<Flag code="CY" />);
  });

  it("is a server component: no use client in the file", () => {
    const source = readFileSync(path.join(import.meta.dirname, "flag.tsx"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(<Flag code="CY" label={strings.storeName} />);
    expect(screen.getByRole("img", { name: strings.storeName })).toBeTruthy();
  });
});
