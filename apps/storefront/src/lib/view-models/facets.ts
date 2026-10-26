import type { FacetGroup, FacetOption } from "@shopblok/registry/contracts";
import type { CategoryNode } from "../medusa/categories";
import type { CollectionDto } from "../medusa/collections";
import type { OptionValueLabel } from "../medusa/products";
import type { FacetCount, SearchFilters, SearchResult } from "../medusa/search";
import { toCurrencyCode } from "./common";
import { optionKind } from "./product";

// The search's facets (ids and counts, D63) as FilterSidebar's groups. The ids are labelled in the
// visitor's locale from the category tree, the collections and the option values; a value with no
// label (a category the Store API no longer lists) is left out rather than shown as an id. The
// group ids are the query parameters (`facets.ts` in the registry): `category`, `collection`, each
// option's id, `price` and `sale`; their values are Medusa's ids, the same in every language.

export const FACET_PARAM = {
  category: "category",
  collection: "collection",
  price: "price",
  sale: "sale",
} as const;

export type FacetLabels = {
  categories: readonly CategoryNode[];
  collections: readonly CollectionDto[];
  optionValues: readonly OptionValueLabel[];
  /** The copy's group labels: Category, Collection, Price, On sale. */
  copy: { category: string; collection: string; price: string; onSale: string };
};

function checkbox(
  id: string,
  label: string,
  counts: readonly FacetCount[],
  labelOf: (value: string) => string | undefined,
  selected: readonly string[] = [],
): FacetGroup | null {
  const options: FacetOption[] = counts.flatMap((count) => {
    const text = labelOf(count.value);
    return text === undefined
      ? []
      : [
          {
            value: count.value,
            label: text,
            count: count.count,
            selected: selected.includes(count.value),
          },
        ];
  });
  return options.length === 0 ? null : { kind: "checkbox", id, label, options };
}

/** The groups for one search result, in FilterSidebar's order; a group with nothing to choose is left out. */
export function toFacetGroups(
  result: SearchResult,
  selection: SearchFilters,
  currencyCode: string,
  labels: FacetLabels,
): FacetGroup[] {
  const groups: (FacetGroup | null)[] = [];
  const categoryNames = new Map(labels.categories.map((node) => [node.id, node.name]));
  groups.push(
    checkbox(
      FACET_PARAM.category,
      labels.copy.category,
      result.facets.categoryIds,
      (id) => categoryNames.get(id),
      selection.categoryIds,
    ),
  );
  const collectionTitles = new Map(
    labels.collections.map((collection) => [collection.id, collection.title]),
  );
  groups.push(
    checkbox(
      FACET_PARAM.collection,
      labels.copy.collection,
      result.facets.collectionIds,
      (id) => collectionTitles.get(id),
      selection.collectionIds,
    ),
  );

  // One group per option, in the order the labels list them; colours as swatches.
  const chosen = new Set((selection.optionValueIds ?? []).flat());
  const counts = new Map(result.facets.optionValueIds.map((count) => [count.value, count.count]));
  const options = new Map<string, { title: string; values: OptionValueLabel[] }>();
  for (const label of labels.optionValues)
    if (counts.has(label.valueId)) {
      const entry = options.get(label.optionId) ?? { title: label.optionTitle, values: [] };
      entry.values.push(label);
      options.set(label.optionId, entry);
    }
  for (const [optionId, { title, values }] of options) {
    const facetOptions = values.map((value) => ({
      value: value.valueId,
      label: value.value,
      count: counts.get(value.valueId) ?? 0,
      selected: chosen.has(value.valueId),
    }));
    groups.push(
      optionKind(title) === "color"
        ? { kind: "swatch", id: optionId, label: title, options: facetOptions }
        : { kind: "checkbox", id: optionId, label: title, options: facetOptions },
    );
  }

  if (result.priceRange !== null) {
    const { min, max } = result.priceRange;
    const chosenPrice = selection.price;
    const low = Math.max(min, chosenPrice?.min ?? min);
    const high = Math.min(max, chosenPrice?.max ?? max);
    groups.push({
      kind: "range",
      id: FACET_PARAM.price,
      label: labels.copy.price,
      currencyCode: toCurrencyCode(currencyCode),
      min,
      max,
      ...(chosenPrice !== undefined && low <= high ? { selected: { min: low, max: high } } : {}),
    });
  }
  if (result.facets.onSale > 0 || selection.onSale === true)
    groups.push({
      kind: "toggle",
      id: FACET_PARAM.sale,
      label: labels.copy.onSale,
      count: result.facets.onSale,
      selected: selection.onSale === true,
    });
  return groups.filter((group): group is FacetGroup => group !== null);
}
