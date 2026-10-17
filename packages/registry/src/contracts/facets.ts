import { z } from "zod";
import { Id } from "./content";
import { Image } from "./image";
import { CurrencyCode } from "./money";

// A listing's filters (FilterGroup, FilterSidebar; SPEC §8.4: category, collection, option swatches,
// price in the region's currency, in stock, on sale). A group's label is an option's title or a
// category's name (content); for price, in stock and on sale the resolver takes it from the copy.
// Beyond their fields, the schemas check what a group would otherwise draw wrong: an option listed
// twice (two checkboxes of one value), and a chosen price range that is empty or outside the
// bounds. `id` is the form field's name and the URL's query parameter (`colour=black&colour=forest`;
// a range adds `.min` and `.max`, `price.min=20`), so it is the same whoever builds the URL.

/** What a checkbox or swatch group lists: no two options with one value. */
const hasUniqueValues = (facet: { options: { value: string }[] }) =>
  new Set(facet.options.map((option) => option.value)).size === facet.options.length;

export const FacetOption = z.object({
  value: z.string().min(1).describe("What the URL carries"),
  label: z.string().min(1),
  count: z.int().nonnegative(),
  selected: z.boolean(),
});

export const SwatchFacetOption = FacetOption.extend({
  hex: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  image: Image.optional(),
});

export const CheckboxFacet = z
  .object({
    kind: z.literal("checkbox"),
    id: Id.describe("The query parameter: each chosen option adds `id=value`"),
    label: z.string().min(1),
    options: z.array(FacetOption).min(1),
  })
  .refine(hasUniqueValues, "an option is listed twice");

export const SwatchFacet = z
  .object({
    kind: z.literal("swatch"),
    id: Id.describe("The query parameter: each chosen colour adds `id=value`"),
    label: z.string().min(1),
    options: z.array(SwatchFacetOption).min(1),
  })
  .refine(hasUniqueValues, "an option is listed twice");

/** A price range in the region's currency, with the chosen bounds once a visitor sets them. */
export const RangeFacet = z
  .object({
    kind: z.literal("range"),
    id: Id.describe("The query parameters are `id.min` and `id.max`, in major units"),
    label: z.string().min(1),
    currencyCode: CurrencyCode,
    min: z
      .number()
      .nonnegative()
      .describe("The slider's lowest bound: the cheapest price, not counting this filter"),
    max: z
      .number()
      .nonnegative()
      .describe("The slider's highest bound: the dearest price, not counting this filter"),
    selected: z
      .object({ min: z.number(), max: z.number() })
      .optional()
      .describe("The bounds the visitor chose; none while the range is untouched"),
  })
  .refine((facet) => facet.min <= facet.max, "min is more than max")
  .refine(
    (facet) =>
      facet.selected === undefined ||
      (facet.selected.min <= facet.selected.max &&
        facet.selected.min >= facet.min &&
        facet.selected.max <= facet.max),
    "the chosen range is empty or outside the bounds",
  );

/** One switch with its count (in stock, on sale). */
export const ToggleFacet = z.object({
  kind: z.literal("toggle"),
  id: Id.describe("The query parameter: on adds `id=1`"),
  label: z.string().min(1),
  count: z.int().nonnegative(),
  selected: z.boolean(),
});

export const FacetGroup = z.discriminatedUnion("kind", [
  CheckboxFacet,
  SwatchFacet,
  RangeFacet,
  ToggleFacet,
]);

export type FacetOption = z.infer<typeof FacetOption>;
export type SwatchFacetOption = z.infer<typeof SwatchFacetOption>;
export type CheckboxFacet = z.infer<typeof CheckboxFacet>;
export type SwatchFacet = z.infer<typeof SwatchFacet>;
export type RangeFacet = z.infer<typeof RangeFacet>;
export type ToggleFacet = z.infer<typeof ToggleFacet>;
export type FacetGroup = z.infer<typeof FacetGroup>;
