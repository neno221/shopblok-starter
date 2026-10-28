// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const field = vi.hoisted(() => ({ value: "classic" as string | undefined, setValue: vi.fn() }));
vi.mock("@payloadcms/ui", () => ({
  useField: () => ({
    path: "design",
    value: field.value,
    setValue: field.setValue,
    showError: false,
    disabled: false,
  }),
  FieldLabel: ({ label }: { label: string }) => <span>{label}</span>,
  FieldError: () => null,
  FieldDescription: ({ description }: { description?: string }) =>
    description ? <p>{description}</p> : null,
}));
vi.mock("./variant-picker.css", () => ({}));

import { variantField } from "../fields/variant";
import { VariantPicker } from "./variant-picker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const config = variantField({
  family: "header",
  name: "design",
  label: "Design",
  exclude: ["transparent"],
});

let container: HTMLDivElement;
let root: Root;

async function render(readOnly = false) {
  await act(async () =>
    root.render(<VariantPicker field={config as never} path="design" readOnly={readOnly} />),
  );
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  field.value = "classic";
  field.setValue.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("VariantPicker (D85)", () => {
  it("is a radio group named by the field's label, a radio per variant with its thumbnail", async () => {
    await render();
    const group = container.querySelector('[role="radiogroup"]');
    const labelId = group?.getAttribute("aria-labelledby");
    expect(labelId && document.getElementById(labelId)?.textContent).toBe("Design");
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map((radio) => radio.value)).toEqual([
      "classic",
      "centered",
      "two-tier",
      "mega-menu",
      "minimal",
    ]);
    expect(new Set(radios.map((radio) => radio.name))).toEqual(new Set(["design"]));
    expect(radios.find((radio) => radio.checked)?.value).toBe("classic");
    const images = [...container.querySelectorAll("img")];
    expect(images.map((image) => image.getAttribute("src"))).toContain(
      "/registry/headers-footers/header-two-tier.png",
    );
    // The name under the picture says what it shows.
    expect(images.every((image) => image.getAttribute("alt") === "")).toBe(true);
    expect(container.textContent).toContain("Two-tier");
  });

  it("sets the field's value when a card is chosen", async () => {
    await render();
    const minimal = container.querySelector<HTMLInputElement>('input[value="minimal"]');
    await act(async () => minimal?.click());
    expect(field.setValue).toHaveBeenCalledWith("minimal");
  });

  it("cannot be changed when the field is read-only", async () => {
    await render(true);
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.every((radio) => radio.disabled)).toBe(true);
  });
});
