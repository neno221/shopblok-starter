import { z } from "zod";
import { Id } from "./content";
import { Image } from "./image";
import { CurrencyCode } from "./money";

// A listing's filters (FilterGroup, FilterSidebar; SPEC §8.4: category, collection, option swatches,
// price in the region's currency, in stock, on sale). A group's label is an option's title or a
// category's name (content); for price, in stock and on sale the resolver takes it from the copy.

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

export const CheckboxFacet = z.object({
  kind: z.literal("checkbox"),
  id: Id,
  label: z.string().min(1),
  options: z.array(FacetOption).min(1),
});

export const SwatchFacet = z.object({
  kind: z.literal("swatch"),
  id: Id,
  label: z.string().min(1),
  options: z.array(SwatchFacetOption).min(1),
});

/** A price range in the region's currency, with the chosen bounds once a visitor sets them. */
export const RangeFacet = z
  .object({
    kind: z.literal("range"),
    id: Id,
    label: z.string().min(1),
    currencyCode: CurrencyCode,
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    selected: z.object({ min: z.number(), max: z.number() }).optional(),
  })
  .refine((facet) => facet.min <= facet.max, "min is more than max");

/** One switch with its count (in stock, on sale). */
export const ToggleFacet = z.object({
  kind: z.literal("toggle"),
  id: Id,
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
