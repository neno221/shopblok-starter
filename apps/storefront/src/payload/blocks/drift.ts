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

/** A variant field as the drift test reads it (D99): where it is, its family and what it offers. */
export type VariantPicker = {
  /** The block's slug, or the global's path to the field (`templates.cart.miniCart`). */
  where: string;
  family: string;
  /** The options that draw a member of the family, in the field's order. */
  offered: readonly string[];
};

const pickerOf = (where: string, field: Field): VariantPicker | undefined => {
  if (field.type !== "select") return undefined;
  const custom = field.admin?.custom as { family?: unknown; drawsNothing?: unknown } | undefined;
  if (typeof custom?.family !== "string") return undefined;
  const nothing = Array.isArray(custom.drawsNothing) ? (custom.drawsNothing as string[]) : [];
  return {
    where,
    family: custom.family,
    offered: field.options
      .map((option) => (typeof option === "string" ? option : option.value))
      .filter((value) => !nothing.includes(value)),
  };
};

/**
 * The variant fields among `fields` (the variant field's `admin.custom` names its family), through
 * tabs, groups, rows and collapsibles, each named by its path under `where`.
 */
export function variantPickers(where: string, fields: readonly Field[]): VariantPicker[] {
  return fields.flatMap((field): VariantPicker[] => {
    if (field.type === "tabs")
      return field.tabs.flatMap((tab) =>
        variantPickers("name" in tab && tab.name ? `${where}.${tab.name}` : where, tab.fields),
      );
    if (field.type === "row" || field.type === "collapsible")
      return variantPickers(where, field.fields);
    if (field.type === "group")
      return variantPickers(
        "name" in field && field.name ? `${where}.${field.name}` : where,
        field.fields,
      );
    const picker = "name" in field ? pickerOf(`${where}.${field.name}`, field) : undefined;
    return picker === undefined ? [] : [picker];
  });
}

/**
 * The `data-slot` of the element each family's member draws `data-variant` on, its root (D99): a
 * section's frame, the template root of the family's first member, the quick view's and the mini
 * cart's trigger (the dialog and
 * the sheet are not in a server render until they open).
 */
export function familyRoot(
  entry: RegistryEntry,
  entries: readonly RegistryEntry[],
): string | undefined {
  if (entry.group === "sections") return `${entry.family}-section`;
  if (entry.group === "templates") {
    // Every member draws its family's root, which is the first member's (M3's) template slot:
    // `templates/product-detail-grid` draws `product-detail-template`, the receipt's members
    // `order-confirmation-template` (PR 116 review, item 1).
    const first = entries.find(
      (each) =>
        each.family === entry.family && each.variant === variantsOf(entry.family ?? "")[0]?.value,
    );
    return first === undefined
      ? undefined
      : `${first.id.slice(first.id.lastIndexOf("/") + 1)}-template`;
  }
  if (entry.family === "quick-view") return "quick-view-trigger";
  if (entry.family === "mini-cart") return "cart-drawer-trigger";
  return undefined;
}

/** The widths of a DS cell's `en` baseline (D51). */
const BASELINE_WIDTHS = [375, 768, 1440] as const;

/** What `variantDrift` checks against, from the repository and the DS (the test passes them in). */
export type VariantFacts = {
  /** The registry's entries. */
  entries: readonly RegistryEntry[];
  /** The variant fields of the blocks and of the `templates` global (`variantPickers`). */
  pickers: readonly VariantPicker[];
  /** Whether the DS has a story for the entry (`src/design-system/stories/`). */
  hasStory: (id: string) => boolean;
  /** Whether a file exists, by its path from `apps/storefront`. */
  hasFile: (path: string) => boolean;
  /** The server render of the entry's story (its live render), as markup. */
  render: (id: string) => string;
};

/** Each opening tag that carries `data-slot="<slot>"`, and its `data-variant` (null for none). */
const variantsAt = (markup: string, slot: string): (string | null)[] =>
  [...markup.matchAll(/<[a-z][^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes(` data-slot="${slot}"`))
    .map((tag) => / data-variant="([^"]*)"/.exec(tag)?.[1] ?? null);

/**
 * D99's drift check, which D70's grows into: every option of a block's or a template's variant
 * field that draws something is a member of the field's family, and every member is an option, in
 * the registry's order; and each member of those families has a story (whose six cells the DS job
 * draws), three `en` baselines and a thumbnail, and its live render draws the member it is: its
 * family's root carries `data-variant` with its variant, so a family's entry file that ignores the
 * `variant` it is given, or a member that does not say which it is, fails here. Empty when they agree.
 */
export function variantDrift(facts: VariantFacts): string[] {
  const problems: string[] = [];
  const families = [...new Set(facts.pickers.map((picker) => picker.family))];
  for (const picker of facts.pickers) {
    const members = variantsOf(picker.family).map((option) => option.value);
    if (picker.offered.join() !== members.join())
      problems.push(
        `${picker.where} offers [${picker.offered.join(", ")}] of the family "${picker.family}", whose members are [${members.join(", ")}]`,
      );
  }
  for (const family of families) {
    for (const entry of facts.entries.filter((each) => each.family === family)) {
      if (!facts.hasStory(entry.id)) {
        problems.push(`${entry.id} has no story in src/design-system/stories/`);
        continue;
      }
      for (const width of BASELINE_WIDTHS) {
        const path = `e2e/__screenshots__/design-system/${entry.id}/en-${width}.png`;
        if (!facts.hasFile(path)) problems.push(`${entry.id} has no baseline ${path}`);
      }
      const thumbnail = `public/registry/${entry.id}.png`;
      if (!facts.hasFile(thumbnail)) problems.push(`${entry.id} has no thumbnail ${thumbnail}`);
      const root = familyRoot(entry, facts.entries);
      if (root === undefined) {
        problems.push(`${entry.id}: familyRoot() knows no root for the family "${family}"`);
        continue;
      }
      const drawn = variantsAt(facts.render(entry.id), root);
      if (drawn.length === 0)
        problems.push(`${entry.id}'s live render has no [data-slot="${root}"]`);
      else if (drawn.some((variant) => variant !== entry.variant))
        problems.push(
          `${entry.id}'s live render draws [data-slot="${root}"] as [${drawn.map((variant) => variant ?? "no data-variant").join(", ")}], not "${entry.variant}"`,
        );
    }
  }
  return problems;
}
