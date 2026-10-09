import type { SearchTypes } from "@medusajs/framework/types";

import { resolveProductIds } from "../resolve-product-ids";

/** A context whose `query.graph` answers with the given rows and records its calls. */
function contextWith(rows: unknown[]) {
  const graph = jest.fn().mockResolvedValue({ data: rows });
  const context = {
    container: { query: { graph } },
  } as unknown as SearchTypes.SearchIngestionContext;

  return { context, graph };
}

describe("resolveProductIds", () => {
  it("maps a shared option to every product that uses it", async () => {
    const { context, graph } = contextWith([
      { id: "opt_size", products: [{ id: "prod_1" }, { id: "prod_2" }] },
    ]);

    const ids = await resolveProductIds(
      { name: "product-option.created", data: { id: "opt_size" } },
      context,
    );

    expect(ids).toEqual(["prod_1", "prod_2"]);
    // Options have `products` (a shared option has many) and no `product_id`.
    expect(graph).toHaveBeenCalledWith({
      entity: "product_option",
      fields: ["id", "products.id"],
      filters: { id: ["opt_size"] },
      withDeleted: false,
    });
  });

  it("returns nothing, and does not throw, for an option no product uses yet", async () => {
    const { context } = contextWith([
      { id: "opt_new", products: [] },
      { id: "opt_unlinked" },
      null,
      undefined,
    ]);

    await expect(
      resolveProductIds({ name: "product-option.created", data: [{ id: "opt_new" }] }, context),
    ).resolves.toEqual([]);
  });

  it("maps an option value through its option's products", async () => {
    const { context, graph } = contextWith([
      { id: "optval_1", option: { products: [{ id: "prod_1" }] } },
      { id: "optval_2", option: null },
    ]);

    const ids = await resolveProductIds(
      {
        name: "product-option-value.updated",
        data: [{ id: "optval_1" }, { id: "optval_2" }],
      },
      context,
    );

    expect(ids).toEqual(["prod_1"]);
    expect(graph).toHaveBeenCalledWith({
      entity: "product_option_value",
      fields: ["id", "option.products.id"],
      filters: { id: ["optval_1", "optval_2"] },
      withDeleted: false,
    });
  });

  it("reads deleted options and values with `withDeleted`", async () => {
    const { context, graph } = contextWith([]);

    await resolveProductIds({ name: "product-option.deleted", data: { id: "opt_gone" } }, context);

    expect(graph).toHaveBeenCalledWith(expect.objectContaining({ withDeleted: true }));
  });

  it("still maps variants, tags and categories as before", async () => {
    const variants = contextWith([{ product_id: "prod_1" }]);
    const tags = contextWith([{ products: [{ id: "prod_2" }, null] }]);

    await expect(
      resolveProductIds(
        { name: "product-variant.updated", data: { id: "variant_1" } },
        variants.context,
      ),
    ).resolves.toEqual(["prod_1"]);
    await expect(
      resolveProductIds({ name: "product-tag.updated", data: { id: "ptag_1" } }, tags.context),
    ).resolves.toEqual(["prod_2"]);
  });

  it("passes product events through and ignores empty or unknown ones", async () => {
    const { context, graph } = contextWith([]);

    await expect(
      resolveProductIds(
        { name: "product.updated", data: [{ id: "prod_1" }, { id: "prod_2" }] },
        context,
      ),
    ).resolves.toEqual(["prod_1", "prod_2"]);
    await expect(
      resolveProductIds({ name: "product-option.created", data: {} }, context),
    ).resolves.toEqual([]);
    await expect(
      resolveProductIds({ name: "other.created", data: { id: "x" } }, context),
    ).resolves.toEqual([]);
    expect(graph).not.toHaveBeenCalled();
  });
});
