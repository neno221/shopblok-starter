// Lives here, not next to the helpers: Medusa requires every file under src/search at boot.
import type { SearchTypes } from "@medusajs/framework/types";

import { toFacetIds } from "../../search/helpers/facets";
import {
  type ProductTexts,
  readTexts,
  resolveTranslationProductIds,
  storeLocales,
  toSearchText,
} from "../../search/helpers/translations";

const texts = (overrides: Partial<ProductTexts>): ProductTexts => ({
  title: "",
  description: "",
  categories: [],
  collection: "",
  tags: [],
  option_values: [],
  ...overrides,
});

describe("toSearchText", () => {
  it("joins every locale's texts, each line once", () => {
    const byLocale = new Map([
      [
        "en-US",
        texts({
          title: "Ceramic mug",
          description: "A mug.",
          categories: ["Kitchen"],
          collection: "Home",
          tags: ["gift"],
          option_values: ["Color:White"],
        }),
      ],
      // Untranslated fields come back in English: written once.
      ["el-GR", texts({ title: "Κεραμική κούπα", description: "A mug.", categories: ["Κουζίνα"] })],
    ]);

    expect(toSearchText(byLocale).split("\n")).toEqual([
      "Ceramic mug",
      "A mug.",
      "Kitchen",
      "Home",
      "gift",
      "Color:White",
      "Κεραμική κούπα",
      "Κουζίνα",
    ]);
  });

  it("is empty for a product with no texts", () => {
    expect(toSearchText(undefined)).toBe("");
  });
});

describe("toFacetIds", () => {
  it("lists the ids of categories, the collection and option values, each once", () => {
    expect(
      toFacetIds({
        categories: [{ id: "pcat_1" }, { id: "pcat_1" }, null, { id: " " }],
        collection_id: "pcol_1",
        options: [{ values: [{ id: "optval_s" }, { id: "optval_m" }] }, { values: null }, null],
      }),
    ).toEqual({
      category_ids: ["pcat_1"],
      collection_ids: ["pcol_1"],
      option_value_ids: ["optval_s", "optval_m"],
    });
  });

  it("is empty lists for a product with none", () => {
    expect(toFacetIds({})).toEqual({
      category_ids: [],
      collection_ids: [],
      option_value_ids: [],
    });
  });
});

describe("storeLocales", () => {
  it("puts the default locale first, once, and adds the store's", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ supported_locales: [{ locale_code: "el-GR" }, { locale_code: "en-US" }, null] }],
    });

    await expect(storeLocales({ graph } as never)).resolves.toEqual(["en-US", "el-GR"]);
  });
});

describe("readTexts", () => {
  it("reads each locale once for the batch, selecting the nested objects' ids", async () => {
    const graph = jest.fn(async (_input: unknown, { locale }: { locale: string }) => ({
      data: [{ id: "prod_1", title: `title ${locale}`, categories: [{ id: "c", name: `cat ${locale}` }] }],
    }));

    const result = await readTexts({ graph } as never, ["prod_1", "prod_2"], ["en-US", "el-GR"]);

    expect(graph).toHaveBeenCalledTimes(2);
    // Without the ids, `query.graph(…, { locale })` leaves nested objects untranslated.
    const fields = (graph.mock.calls[0]![0] as { fields: string[] }).fields;
    expect(fields).toEqual(
      expect.arrayContaining(["categories.id", "collection.id", "tags.id", "options.id", "options.values.id"]),
    );
    expect(result.get("prod_1")?.get("el-GR")).toMatchObject({
      title: "title el-GR",
      categories: ["cat el-GR"],
    });
  });

  it("reads nothing for an empty batch", async () => {
    const graph = jest.fn();

    await readTexts({ graph } as never, [], ["en-US"]);

    expect(graph).not.toHaveBeenCalled();
  });
});

describe("resolveTranslationProductIds", () => {
  /** A context whose `query.graph` answers per entity and records its calls. */
  function contextWith(rows: Record<string, unknown[]>) {
    const graph = jest.fn(async ({ entity }: { entity: string }) => ({ data: rows[entity] ?? [] }));
    const context = { container: { query: { graph } } } as unknown as SearchTypes.SearchIngestionContext;

    return { context, graph };
  }

  it("maps product, category, collection, option, value and tag translations to products, each once", async () => {
    const { context } = contextWith({
      translations: [
        { reference: "product", reference_id: "prod_1" },
        { reference: "product", reference_id: "prod_1" },
        { reference: "product_category", reference_id: "pcat_1" },
        { reference: "product_collection", reference_id: "pcol_1" },
        { reference: "product_option", reference_id: "opt_1" },
        { reference: "product_option_value", reference_id: "optval_1" },
        { reference: "product_tag", reference_id: "ptag_1" },
        { reference: "region", reference_id: "reg_1" },
      ],
      product_category: [{ products: [{ id: "prod_1" }, { id: "prod_2" }] }],
      product_collection: [{ products: [{ id: "prod_3" }] }],
      product_option: [{ products: [{ id: "prod_4" }] }],
      product_option_value: [{ option: { products: [{ id: "prod_5" }] } }],
      product_tag: [{ products: [{ id: "prod_6" }] }],
    });

    const ids = await resolveTranslationProductIds(
      { name: "translation.created", data: [{ id: "tr_1" }, { id: "tr_2" }] },
      context,
    );

    expect(ids.sort()).toEqual(["prod_1", "prod_2", "prod_3", "prod_4", "prod_5", "prod_6"]);
  });

  it("reads a deleted translation with `withDeleted`, since the row is soft-deleted", async () => {
    const { context, graph } = contextWith({
      translations: [{ reference: "product", reference_id: "prod_1" }],
    });

    await expect(
      resolveTranslationProductIds({ name: "translation.deleted", data: { id: "tr_1" } }, context),
    ).resolves.toEqual(["prod_1"]);
    expect(graph).toHaveBeenCalledWith({
      entity: "translations",
      fields: ["id", "reference", "reference_id"],
      filters: { id: ["tr_1"] },
      withDeleted: true,
    });
  });

  it("reads nothing for an event without ids", async () => {
    const { context, graph } = contextWith({});

    await expect(
      resolveTranslationProductIds({ name: "translation.updated", data: {} }, context),
    ).resolves.toEqual([]);
    expect(graph).not.toHaveBeenCalled();
  });
});
