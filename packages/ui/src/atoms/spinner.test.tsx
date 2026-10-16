import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("is a status named by its label prop, with no English of its own", () => {
    render(<Spinner label="Wird geladen" />);
    const status = screen.getByRole("status", { name: "Wird geladen" });
    expect(status.getAttribute("aria-label")).toBe("Wird geladen");
    expect(status.className).toContain("motion-reduce:");
  });

  it("requires the label", () => {
    // @ts-expect-error -- `label` is required (D30: atoms take every string as a prop).
    render(<Spinner />);
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(<Spinner label={strings.helpText} />);
    expect(screen.getByRole("status", { name: strings.helpText })).toBeTruthy();
  });
});
