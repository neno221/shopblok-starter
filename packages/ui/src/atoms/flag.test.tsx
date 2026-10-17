import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import * as flags from "country-flag-icons/react/3x2";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Flag } from "./flag";
import { isFlagCode } from "./flag-code";

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

  it("passes the caller's props to the empty frame too (PR 43 review, item 10)", () => {
    let clicked = 0;
    render(
      <Flag
        // @ts-expect-error -- not an ISO 3166-1 code.
        code="zz"
        label="Nowhere"
        id="flag-zz"
        data-testid="flag"
        onClick={() => (clicked += 1)}
      />,
    );
    const frame = screen.getByTestId("flag");
    expect(frame.tagName.toLowerCase()).toBe("span");
    expect(frame.id).toBe("flag-zz");
    expect(frame.getAttribute("data-code")).toBe("ZZ");
    expect(frame.getAttribute("role")).toBe("img");
    frame.click();
    expect(clicked).toBe(1);
  });
});

describe("isFlagCode (flag-code.ts)", () => {
  it("knows which ISO codes the set has, in either case", () => {
    expect(["CY", "cy", "Us", "DE", "ch", "GR"].every(isFlagCode)).toBe(true);
    expect(["ZZ", "", "cyp", "constructor", "BQ-BO", "bq-bo"].some(isFlagCode)).toBe(false);
  });

  it("agrees with the React set: every two-letter flag, and no other code", () => {
    const drawn = Object.keys(flags).filter((code) => /^[A-Z]{2}$/.test(code));
    expect(drawn.length).toBeGreaterThan(240);
    expect(drawn.filter((code) => !isFlagCode(code))).toEqual([]);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const all = [...letters].flatMap((a) => [...letters].map((b) => a + b));
    expect(all.filter(isFlagCode).sort()).toEqual([...drawn].sort());
  });

  it("has no React and no flag in it (D49): the set is imported as a type only", () => {
    const source = readFileSync(path.join(import.meta.dirname, "flag-code.ts"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).not.toMatch(/from "react"/);
    // Every import of the React set is `import type`, which TypeScript erases.
    for (const line of source.split("\n").filter((l) => l.includes("country-flag-icons/react")))
      expect(line).toMatch(/^import type /);
  });
});

describe("Flag, more", () => {
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
