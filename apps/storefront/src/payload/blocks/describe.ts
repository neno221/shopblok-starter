import type { Block, Field } from "payload";
import { BLOCKS } from ".";

/** One field of a block as the DS's "Payload block" panel lists it (D70). */
export type BlockFieldRow = {
  /** Its path in the block: `items.title` for an array's field. */
  path: string;
  type: string;
  localized: boolean;
  required: boolean;
  /** Shown only when another field has a value (`admin.condition`); Payload checks it only then. */
  conditional: boolean;
  /** A select's or a radio's values (the variant's among them). */
  options?: string[];
};

/** The fields Payload adds to a block and an array row when it sanitizes the config. */
const PAYLOAD_OWN = new Set(["id", "blockName"]);

const optionValue = (option: string | { value: string }) =>
  typeof option === "string" ? option : option.value;

function rows(fields: readonly Field[], prefix: string): BlockFieldRow[] {
  return fields.flatMap((field): BlockFieldRow[] => {
    if (!("name" in field)) return "fields" in field ? rows(field.fields, prefix) : [];
    if (PAYLOAD_OWN.has(field.name)) return [];
    const path = `${prefix}${field.name}`;
    const row: BlockFieldRow = {
      path,
      type:
        field.type === "upload" || field.type === "relationship"
          ? `${field.type} (${String(field.relationTo)})`
          : field.type,
      localized: "localized" in field && field.localized === true,
      required: "required" in field && field.required === true,
      conditional: field.admin?.condition !== undefined,
      ...("options" in field ? { options: field.options.map(optionValue) } : {}),
    };
    const children = "fields" in field ? rows(field.fields, `${path}.`) : [];
    return [row, ...children];
  });
}

/**
 * The fields of the block `slug`, in order, with their nested fields after them; without the `id`
 * and `blockName` Payload adds once the config is loaded, so the panel lists the same rows either way.
 */
export function describeBlock(
  slug: string,
  blocks: readonly Block[] = BLOCKS,
): BlockFieldRow[] | null {
  const block = blocks.find((each) => each.slug === slug);
  return block === undefined ? null : rows(block.fields, "");
}
