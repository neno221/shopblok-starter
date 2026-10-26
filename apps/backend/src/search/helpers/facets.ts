/**
 * The facets of the product index are ids (D63, ADR 0002 decision 2): one
 * multilingual index cannot hold a label per locale, so the storefront labels
 * the ids with the categories, collections and option values it fetches in the
 * visitor's locale.
 */
export type FacetRow = {
  categories?: ({ id?: string | null } | null)[] | null;
  collection_id?: string | null;
  options?: ({
    values?: ({ id?: string | null } | null)[] | null;
  } | null)[] | null;
};

const ids = (values: (string | null | undefined)[]) => [
  ...new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  ),
];

export function toFacetIds(row: FacetRow) {
  return {
    category_ids: ids((row.categories ?? []).map((category) => category?.id)),
    collection_ids: ids([row.collection_id]),
    option_value_ids: ids(
      (row.options ?? []).flatMap((option) =>
        (option?.values ?? []).map((value) => value?.id),
      ),
    ),
  };
}
