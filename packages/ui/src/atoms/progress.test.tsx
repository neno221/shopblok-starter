import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Progress, ProgressLabel, ProgressValue } from "./progress";

describe("Progress", () => {
  it("is a progressbar with its value, named by its label", () => {
    render(
      <Progress value={40}>
        <ProgressLabel>Free delivery</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    const bar = screen.getByRole("progressbar", { name: "Free delivery" });
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
  });

  it("puts the value at the inline end", () => {
    const { container } = render(
      <Progress value={40} aria-label="Upload">
        <ProgressValue />
      </Progress>,
    );
    expect(container.querySelector("[data-slot=progress-value]")?.className).toContain("ms-auto");
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(
      <Progress value={10}>
        <ProgressLabel>{strings.helpText}</ProgressLabel>
      </Progress>,
    );
    expect(screen.getByRole("progressbar", { name: strings.helpText })).toBeTruthy();
  });
});
