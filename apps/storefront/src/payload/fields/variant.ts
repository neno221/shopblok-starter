import { variantsOf } from "@shopblok/registry";
import type { SelectField } from "payload";

/** What the picker gets in `admin.custom` (it reaches the client): each option's thumbnail. */
export type VariantPickerCustom = { thumbnails: Record<string, string> };

export type VariantFieldOptions = {
  /** The registry's family (`header`, `footer`, a block's: D46, D79). */
  family: string;
  /** The field's name: `variant` on a block, `design` on the header and footer (SPEC §7.3, §7.4). */
  name?: string;
  label?: string;
  /** The value a new document starts with; the family's first variant unless given. */
  defaultValue?: string;
  /**
   * Variants the field does not offer, with the reason in the code: the transparent header needs a
   * page that knows it starts with a hero (T61's SETUP.md, "Globals (T61)").
   */
  exclude?: readonly string[];
  description?: string;
};

/**
 * The variant field (D85, SPEC §7.4 and §7.6): a `select` whose options are `variantsOf(family)`'s
 * values and labels, drawn by `components/variant-picker.tsx` as image cards with the registry's
 * thumbnails (D52, `/registry/{id}.png`) in a radio group. The value is the variant (`classic`). A
 * variant added to the registry shows in the picker at once, but Payload stores a `select` as a
 * Postgres enum, so the new option needs its saved migration too (D88), as any select's does.
 */
export function variantField({
  family,
  name = "variant",
  label,
  defaultValue,
  exclude = [],
  description,
}: VariantFieldOptions): SelectField {
  const variants = variantsOf(family).filter((variant) => !exclude.includes(variant.value));
  const [first] = variants;
  if (first === undefined) throw new Error(`variantField: the registry has no "${family}" family.`);
  const custom: VariantPickerCustom = {
    thumbnails: Object.fromEntries(variants.map((variant) => [variant.value, variant.thumbnail])),
  };
  return {
    name,
    type: "select",
    required: true,
    defaultValue: defaultValue ?? first.value,
    options: variants.map(({ value, label: optionLabel }) => ({ value, label: optionLabel })),
    ...(label === undefined ? {} : { label }),
    admin: {
      custom,
      ...(description === undefined ? {} : { description }),
      components: { Field: "/payload/components/variant-picker#VariantPicker" },
    },
  };
}
