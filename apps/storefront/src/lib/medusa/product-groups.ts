import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { medusaRequest } from "./sdk";

// T64: the two `productSource` modes the search index cannot answer alone (SPEC §7.5). An editor
// names a tag or a product type by its value, as Medusa Admin shows it (`summer`, `Hoodie`), since
// Payload has no copy of either (D75 syncs products, categories and collections); these reads turn
// the value into what the search filters by. The index has the tags' ids (`tag_ids`) but not the
// types', so a type's products are listed by the Store API's `type_id` and then searched by id.

/** How many of a type's products a source looks at: more than a block shows (24), by far. */
export const TYPE_PRODUCTS = 100;

type WireNamed = { id: string; value?: string | null };

async function fetchTagId(value: string): Promise<string | null> {
  const { product_tags } = await medusaRequest((sdk) =>
    sdk.client.fetch<{ product_tags: WireNamed[] }>("/store/product-tags", {
      query: { value, fields: "id,value", limit: 1 },
    }),
  );
  return product_tags.find((tag) => tag.value === value)?.id ?? null;
}

/** The tag whose value is `value` exactly, or `null`: a tag `productSource` filters the search by. */
export const findProductTagId = cached(fetchTagId, {
  name: "medusa:product-tags:by-value",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});

async function fetchTypeProductIds(value: string): Promise<string[]> {
  const { product_types } = await medusaRequest((sdk) =>
    sdk.client.fetch<{ product_types: WireNamed[] }>("/store/product-types", {
      query: { value, fields: "id,value", limit: 1 },
    }),
  );
  const type = product_types.find((each) => each.value === value);
  if (type === undefined) return [];
  const { products } = await medusaRequest((sdk) =>
    sdk.client.fetch<{ products: { id: string }[] }>("/store/products", {
      query: { type_id: [type.id], fields: "id", order: "-created_at", limit: TYPE_PRODUCTS },
    }),
  );
  return products.map((product) => product.id);
}

/**
 * The ids of the newest products (at most `TYPE_PRODUCTS`) of the product type whose value is
 * `value`, or none when no type has it. The key's sales channel decides which products are listed,
 * as for every Store API read.
 */
export const listProductIdsOfType = cached(fetchTypeProductIds, {
  name: "medusa:product-types:products",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});
