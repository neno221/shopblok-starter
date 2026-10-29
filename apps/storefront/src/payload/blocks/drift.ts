import { variantsOf, type RegistryEntry } from "@shopblok/registry";
import type { Block, Field } from "payload";

const variantOptions = (block: Block): string[] | undefined => {
  const field = block.fields.find(
    (each: Field) => "name" in each && each.name === "variant" && each.type === "select",
  );
  return field !== undefined && "options" in field
    ? field.options.map((option) => (typeof option === "string" ? option : option.value))
    : undefined;
};

/**
 * D70's drift check: what differs between the registry's Sections and Payload's blocks. A Sections
 * entry without a block of its `block` slug, a block without an entry, and a block whose `variant`
 * options are not `variantsOf(family)`'s values, in order. Empty when they agree.
 */
export function blockDrift(entries: readonly RegistryEntry[], blocks: readonly Block[]): string[] {
  const problems: string[] = [];
  const slugs = new Set(blocks.map((block) => block.slug));
  const named = new Set(entries.map((entry) => entry.block));
  for (const entry of entries)
    if (!slugs.has(entry.block ?? ""))
      problems.push(
        `${entry.id} names the block "${entry.block}", which src/payload/blocks/ lacks`,
      );
  for (const block of blocks) {
    if (!named.has(block.slug)) {
      problems.push(`the block "${block.slug}" has no Sections entry in the registry`);
      continue;
    }
    const entry = entries.find((each) => each.block === block.slug);
    const wanted = variantsOf(entry?.family ?? "").map((option) => option.value);
    const offered = variantOptions(block);
    if (offered === undefined || offered.join() !== wanted.join())
      problems.push(
        `the block "${block.slug}" offers the variants [${offered?.join(", ") ?? "none"}], the registry [${wanted.join(", ")}]`,
      );
  }
  return problems;
}
