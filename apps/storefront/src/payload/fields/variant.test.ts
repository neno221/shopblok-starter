import { variantsOf } from "@shopblok/registry";
import { describe, expect, it } from "vitest";
import { variantField, type VariantPickerCustom } from "./variant";

describe("variantField (D85)", () => {
  it("offers the family's variants from the registry, with their thumbnails for the picker", () => {
    const field = variantField({ family: "footer", name: "design" });
    const variants = variantsOf("footer");
    expect(field).toMatchObject({
      name: "design",
      type: "select",
      required: true,
      defaultValue: variants[0]?.value,
      admin: { components: { Field: "/payload/components/variant-picker#VariantPicker" } },
    });
    expect(field.options).toEqual(variants.map(({ value, label }) => ({ value, label })));
    expect((field.admin?.custom as VariantPickerCustom).thumbnails).toEqual(
      Object.fromEntries(variants.map((variant) => [variant.value, variant.thumbnail])),
    );
  });

  it("leaves out the variants it is told to, and takes a default", () => {
    const field = variantField({
      family: "header",
      exclude: ["transparent"],
      defaultValue: "minimal",
    });
    expect(field.options.map((option) => (option as { value: string }).value)).not.toContain(
      "transparent",
    );
    expect(field.defaultValue).toBe("minimal");
    expect((field.admin?.custom as VariantPickerCustom).thumbnails).not.toHaveProperty(
      "transparent",
    );
  });

  it("fails at once for a family the registry does not have", () => {
    expect(() => variantField({ family: "nope" })).toThrow('the registry has no "nope" family');
  });
});
