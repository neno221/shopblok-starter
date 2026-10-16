import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Label } from "./label";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("is a multi-line field named by its label, taller than 44 px (D32)", () => {
    render(
      <>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" />
      </>,
    );
    const field = screen.getByRole("textbox", { name: "Notes" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field.className).toContain("min-h-16");
  });

  it("takes focus and new lines, with the ring at full strength", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notes" />);
    await user.tab();
    await user.keyboard("one{Enter}two");
    const field = screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement;
    expect(field.value).toBe("one\ntwo");
    expect(field.className).toContain("focus-visible:ring-ring");
  });

  it("ignores typing when disabled", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notes" disabled />);
    const field = screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement;
    await user.type(field, "x");
    expect(field.value).toBe("");
  });

  it("is announced as invalid", () => {
    render(<Textarea aria-label="Notes" aria-invalid="true" />);
    expect(screen.getByRole("textbox").className).toContain("aria-invalid:border-destructive");
  });

  it.each(longLabels)("takes a long %s label and placeholder", (_locale, strings) => {
    render(
      <>
        <Label htmlFor="notes">{strings.fieldLabel}</Label>
        <Textarea id="notes" placeholder={strings.placeholder} />
      </>,
    );
    expect(screen.getByRole("textbox", { name: strings.fieldLabel })).toBeTruthy();
  });
});
