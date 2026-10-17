import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@shopblok/ui/atoms/checkbox";
import { Input } from "@shopblok/ui/atoms/input";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "./field";

const source = readFileSync(path.join(import.meta.dirname, "field.tsx"), "utf8");

describe("Field", () => {
  it("is a server component: no hook, so no 'use client' (a form needs no JavaScript, D48)", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).not.toMatch(/\buse(?:Memo|State|Effect|Ref|Context)\b/);
  });

  it("names its control through the label, and its description and error through aria-describedby", () => {
    render(
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" aria-describedby="email-help email-error" aria-invalid="true" />
        <FieldDescription id="email-help">We never share it.</FieldDescription>
        <FieldError id="email-error">Enter an email address.</FieldError>
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.getAttribute("aria-describedby")).toBe("email-help email-error");
    expect(screen.getByRole("group")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Enter an email address.");
  });

  it("groups fields in a fieldset with a legend", () => {
    render(
      <FieldSet>
        <FieldLegend>Shipping address</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="street">Street</FieldLabel>
            <Input id="street" />
          </Field>
        </FieldGroup>
      </FieldSet>,
    );
    const group = screen.getByRole("group", { name: "Shipping address" });
    expect(within(group).getByRole("textbox", { name: "Street" })).toBeTruthy();
  });

  it("a label around a choice control toggles it, and its ring is at full strength (D35)", () => {
    render(
      <Field orientation="horizontal">
        <Checkbox id="gift" />
        <FieldLabel htmlFor="gift">Gift wrap</FieldLabel>
      </Field>,
    );
    const label = screen.getByText("Gift wrap");
    expect(label.getAttribute("data-slot")).toBe("field-label");
    expect(label.className).toContain("has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring");
    expect(label.className).not.toMatch(/ring-ring\/\d/);
    expect(screen.getByRole("checkbox", { name: "Gift wrap" })).toBeTruthy();
  });

  it("has no dark variant, no physical direction and no tinted ring in what it renders", () => {
    const { container } = render(
      <FieldSet>
        <FieldLegend>Legend</FieldLegend>
        <Field orientation="responsive">
          <FieldLabel htmlFor="a">A</FieldLabel>
          <FieldContent>
            <Input id="a" />
            <FieldDescription>Help</FieldDescription>
            <FieldError errors={[{ message: "One" }, { message: "Two" }]} />
          </FieldContent>
        </Field>
      </FieldSet>,
    );
    const classes = [...container.querySelectorAll("[class]")]
      .map((element) => element.className)
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
    expect(classes).not.toMatch(/(?:^|\s)(?:text-left|ml-\d|mr-\d|pl-\d|pr-\d)/);
    expect(container.querySelector("[data-slot=field-description]")?.className).toContain(
      "text-start",
    );
  });
});

describe("FieldError", () => {
  it("shows nothing without an error or children", () => {
    const { container } = render(<FieldError />);
    expect(container.firstChild).toBeNull();
    const empty = render(<FieldError errors={[]} />);
    expect(empty.container.firstChild).toBeNull();
  });

  it("shows one error as text, with role alert", () => {
    render(<FieldError errors={[{ message: "Required" }]} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Required");
    expect(within(alert).queryByRole("list")).toBeNull();
  });

  it("lists several errors once each, starting at the inline start (ms-4)", () => {
    render(
      <FieldError
        errors={[{ message: "Too short" }, { message: "Needs a digit" }, { message: "Too short" }]}
      />,
    );
    const items = within(screen.getByRole("alert")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Too short", "Needs a digit"]);
    expect(screen.getByRole("list").className).toContain("ms-4");
  });

  it("prefers its children to the errors", () => {
    render(<FieldError errors={[{ message: "Ignored" }]}>Shown</FieldError>);
    expect(screen.getByRole("alert").textContent).toBe("Shown");
  });
});

describe.each(longLabels)("a long %s label", (_locale, strings) => {
  it("wraps in the label, the description and the error: no clipping class anywhere", () => {
    const { container } = render(
      <Field>
        <FieldLabel htmlFor="long">{strings.fieldLabel}</FieldLabel>
        <Input id="long" placeholder={strings.placeholder} />
        <FieldDescription>{strings.helpText}</FieldDescription>
        <FieldError>{strings.errorText}</FieldError>
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: strings.fieldLabel })).toBeTruthy();
    expect(screen.getByText(strings.helpText)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(strings.errorText);
    for (const element of container.querySelectorAll("[class]")) {
      // The input is the atom's, which truncates nothing either; the field's own parts must wrap.
      expect(element.className).not.toMatch(CLIPPING_CLASSES);
    }
  });
});
