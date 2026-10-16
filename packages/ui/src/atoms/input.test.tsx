import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Input } from "./input";
import { Label } from "./label";

describe("Input", () => {
  it("is a text field named by its label, 44 px tall (D32)", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" />
      </>,
    );
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field.className).toContain("h-11");
  });

  it("takes focus and typing, with the ring at full strength", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Email" />);
    await user.tab();
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(document.activeElement).toBe(field);
    await user.keyboard("anna@example.com");
    expect((field as HTMLInputElement).value).toBe("anna@example.com");
    expect(field.className).toContain("focus-visible:ring-ring");
  });

  it("marks an invalid field with its border and keeps the focus ring at full strength", () => {
    render(<Input aria-label="Email" aria-invalid />);
    const classes = screen.getByRole("textbox", { name: "Email" }).className;
    expect(classes).toContain("aria-invalid:border-destructive");
    expect(classes).toContain("focus-visible:ring-ring");
    expect(classes).not.toMatch(/aria-invalid:ring-/);
  });

  it("ignores typing when disabled", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Email" disabled />);
    const field = screen.getByRole("textbox", { name: "Email" });
    await user.type(field, "x");
    expect((field as HTMLInputElement).value).toBe("");
    expect(field.className).toContain("disabled:opacity-50");
  });

  it("is announced as invalid and draws the destructive border", () => {
    render(<Input aria-label="Email" aria-invalid="true" />);
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.className).toContain("aria-invalid:border-destructive");
  });

  it.each(longLabels)("takes a long %s label and placeholder", (_locale, strings) => {
    render(
      <>
        <Label htmlFor="notes">{strings.fieldLabel}</Label>
        <Input id="notes" placeholder={strings.placeholder} />
      </>,
    );
    const field = screen.getByRole("textbox", { name: strings.fieldLabel });
    expect(field.getAttribute("placeholder")).toBe(strings.placeholder);
  });
});
