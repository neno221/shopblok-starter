import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { breakpoints, radius, shadows, text, viewports, zIndex } from "@shopblok/ui/tokens";
import { describe, expect, it } from "vitest";
import {
  durations,
  layerNotes,
  radiusClasses,
  shadowClasses,
  SPACING_STEP_PX,
  spacingSteps,
  textClasses,
  weightClasses,
} from "./classes";

const tokensCss = readFileSync(
  fileURLToPath(new URL("../../../../../packages/ui/src/styles/tokens.css", import.meta.url)),
  "utf8",
);

describe("the class maps of the Foundations pages", () => {
  it("cover every step of the generated tokens, so a new token cannot be missed", () => {
    expect(Object.keys(radiusClasses).sort()).toEqual(radius.steps.map((s) => s.step).sort());
    expect(Object.keys(shadowClasses).sort()).toEqual(shadows.map((s) => s.name).sort());
    expect(Object.keys(textClasses).sort()).toEqual(text.map((s) => s.step).sort());
    expect(Object.keys(layerNotes).sort()).toEqual(zIndex.map((s) => s.name).sort());
  });

  it("name utilities that match their tokens", () => {
    for (const step of radius.steps) expect(radiusClasses[step.step]).toBe(`rounded-${step.step}`);
    for (const shadow of shadows) expect(shadowClasses[shadow.name]).toBe(`shadow-${shadow.name}`);
    for (const step of text) expect(textClasses[step.step]).toBe(`text-${step.step}`);
  });

  it("match tokens.css: the 4 px step, the durations, the weights", () => {
    expect(tokensCss).toContain("--spacing: 0.25rem;");
    expect(SPACING_STEP_PX).toBe(4);
    for (const step of spacingSteps) expect(step.className).toBe(`w-${step.step}`);
    for (const duration of durations) {
      expect(tokensCss, duration.variable).toContain(`${duration.variable}: `);
      expect(duration.className).toBe(`duration-(${duration.variable})`);
    }
    for (const weight of weightClasses) {
      expect(tokensCss, weight.name).toContain(`--font-weight-${weight.name}: `);
    }
  });

  it("show the three design widths the viewport switcher uses, and the five breakpoints", () => {
    expect(viewports.map((viewport) => viewport.value)).toEqual([
      "375px",
      "768px",
      "1024px",
      "1440px",
    ]);
    expect(breakpoints).toHaveLength(5);
  });
});
