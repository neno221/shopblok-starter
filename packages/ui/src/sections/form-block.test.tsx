import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormBlockSection, type FormBlockSectionProps } from "./form-block";

function setup(
  props: Partial<FormBlockSectionProps> = {},
  locale: (typeof LOCALES)[number] = "en",
) {
  const { section, note } = sectionFixtures[locale].formBlock;
  return render(
    <FormBlockSection
      {...section}
      copy={{ form: catalogs[locale].sections.form }}
      messages={{ note: <p>{note}</p> }}
      {...props}
    />,
  );
}

const words = catalogs.en.sections.form;

describe("FormBlockSection", () => {
  it.each(LOCALES)("draws each field labelled, in the editor's order, in %s", (locale) => {
    const { section, note } = sectionFixtures[locale].formBlock;
    const { container } = setup({}, locale);
    const form = screen.getByRole("form", { name: section.heading });
    const fields = [...form.querySelectorAll("[data-slot=form-block-field]")].map((each) =>
      each.getAttribute("data-field"),
    );
    expect(fields).toEqual(["name", "email", "topic", "order", "message", "consent"]);
    for (const field of section.form.fields) {
      if (field.kind === "message") continue;
      const control = form.querySelector(`[name=${field.name}]`) as HTMLElement;
      const label = [...(control as HTMLInputElement).labels!].map((each) => each.textContent);
      expect(label.join(" "), field.name).toContain(field.label);
      expect(control.hasAttribute("required"), field.name).toBe(field.required);
    }
    expect(container.querySelector("[data-slot=form-block-message]")?.textContent).toBe(note);
    expect(screen.getByRole("button").textContent).toBe(section.form.submitLabel);
  });

  it("uses each field's native control, its type and its limits", () => {
    const { container } = setup();
    const at = (name: string) => container.querySelector(`[name=${name}]`) as HTMLInputElement;
    expect(at("name").type).toBe("text");
    expect(at("name").maxLength).toBe(200);
    expect(at("email").type).toBe("email");
    expect(at("email").autocomplete).toBe("email");
    expect(at("message").tagName).toBe("TEXTAREA");
    expect(at("message").maxLength).toBe(4000);
    expect(at("consent").type).toBe("checkbox");
    const select = at("topic") as unknown as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect([...select.options].map((option) => option.value)).toEqual([
      "",
      "order",
      "returns",
      "other",
    ]);
    expect(select.options[0]?.textContent).toBe(words.choose);
  });

  it("marks the optional fields, not the required ones", () => {
    const { container } = setup();
    const label = (name: string) =>
      container.querySelector(`[data-field=${name}]`)?.textContent ?? "";
    expect(label("topic")).toContain(words.optional);
    expect(label("order")).toContain(words.optional);
    expect(label("name")).not.toContain(words.optional);
    expect(label("consent")).not.toContain(words.optional);
  });

  it("puts two half fields side by side from 28rem, and a full one across", () => {
    const { container } = setup();
    const span = (name: string) =>
      container.querySelector(`[data-field=${name}]`)?.className.includes("@md:col-span-2");
    expect(span("name")).toBe(false);
    expect(span("email")).toBe(false);
    expect(span("message")).toBe(true);
  });

  it("marks each refused field, ties its error to it and keeps what was typed", () => {
    const { container } = setup({
      status: "error",
      errors: {
        email: "pattern",
        message: "required",
        consent: "required",
        name: "invalid",
      },
      values: {
        name: "Alex",
        email: "alex@",
        topic: "returns",
        message: "",
        consent: "",
      },
    });
    const at = (name: string) => container.querySelector(`[name=${name}]`) as HTMLInputElement;
    const error = (name: string) => {
      const control = at(name);
      expect(control.getAttribute("aria-invalid"), name).toBe("true");
      const id = control.getAttribute("aria-describedby") ?? "";
      return container.querySelector(`[id="${id}"]`)?.textContent;
    };
    expect(error("email")).toBe(words.errors.email);
    expect(error("message")).toBe(words.errors.required);
    expect(error("consent")).toBe(words.errors.checkbox);
    expect(error("name")).toBe(words.errors.invalid);
    expect(at("name").value).toBe("Alex");
    expect(at("email").value).toBe("alex@");
    expect((at("topic") as unknown as HTMLSelectElement).value).toBe("returns");
    expect(at("consent").checked).toBe(false);
    expect(at("order").hasAttribute("aria-invalid")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe(words.invalid);
  });

  it("says the form could not be sent when no field is to blame", () => {
    setup({ status: "error" });
    expect(screen.getByRole("status").textContent).toBe(words.unavailable);
  });

  it("shows the editor's confirmation when sent, or the catalog's line", () => {
    const { unmount } = setup({
      status: "done",
      confirmation: <p>Thanks, Alex.</p>,
    });
    expect(screen.getByRole("status").textContent).toBe("Thanks, Alex.");
    unmount();
    setup({ status: "done" });
    expect(screen.getByRole("status").textContent).toBe(words.done);
  });

  it("keeps the button while sending but blocks a second submit, Enter included", () => {
    const { container } = setup({ status: "sending" });
    const button = screen.getByRole("button", { name: words.sending });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const first = container.querySelector("form button") as HTMLButtonElement;
    expect(first.type).toBe("submit");
    expect(first.disabled).toBe(true);
    expect(within(screen.getByRole("status")).getByText(words.sending)).toBeTruthy();
  });

  it("posts with the shop's hidden inputs first, under its id, and by POST to a URL", () => {
    const { container } = setup({
      action: "/submit",
      formId: "form-1",
      hiddenFields: <input type="hidden" name="trap" />,
    });
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.id).toBe("form-1");
    expect(form.getAttribute("method")).toBe("post");
    expect(form.querySelector("input")?.getAttribute("name")).toBe("trap");
  });

  it("starts each field from the editor's default, the checkbox's too", () => {
    const { section } = sectionFixtures.en.formBlock;
    const fields = section.form.fields.map((field) =>
      field.kind === "text" && field.name === "name"
        ? { ...field, defaultValue: "Guest" }
        : field.kind === "checkbox"
          ? { ...field, defaultChecked: true }
          : field,
    );
    const { container } = setup({ form: { ...section.form, fields } });
    expect((container.querySelector("[name=name]") as HTMLInputElement).value).toBe("Guest");
    expect((container.querySelector("[name=consent]") as HTMLInputElement).checked).toBe(true);
  });
});
