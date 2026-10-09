import "server-only";
import { cached } from "../cache";
import { localeHeaders, medusaRequest } from "./sdk";

/** An amount in major units (Medusa v2 returns 12.5 for €12.50: never ÷100) and its currency. */
export type Money = {
  amount: number;
  /** ISO 4217, lowercase as Medusa has it. */
  currencyCode: string;
};

/** What a product card needs; the rest of the Store API's answer is not kept. */
export type ProductSummary = {
  id: string;
  handle: string;
  /** In the language asked for (`x-medusa-locale`), English where Medusa has no translation. */
  title: string;
  thumbnail: string | null;
  /** The lowest price over the variants in the region, or `null` when none is priced. */
  price: Money | null;
};

export type ListProductsInput = {
  /** The region prices are calculated for. */
  regionId: string;
  /** A Medusa locale (`el-GR`): the market's `medusaLocale` (D8). */
  locale: string;
  limit: number;
};

type PricedVariant = {
  calculated_price?: {
    calculated_amount?: number | null;
    currency_code?: string | null;
  } | null;
};

/** The lowest calculated price among the variants; variants without a price are skipped. */
export function lowestPrice(variants: readonly PricedVariant[] | null | undefined): Money | null {
  let lowest: Money | null = null;
  for (const variant of variants ?? []) {
    const price = variant.calculated_price;
    if (
      typeof price?.calculated_amount === "number" &&
      price.currency_code &&
      (lowest === null || price.calculated_amount < lowest.amount)
    ) {
      lowest = { amount: price.calculated_amount, currencyCode: price.currency_code };
    }
  }
  return lowest;
}

const PRODUCT_FIELDS = "id,handle,title,thumbnail,*variants.calculated_price";

async function fetchProducts({
  regionId,
  locale,
  limit,
}: ListProductsInput): Promise<ProductSummary[]> {
  const { products } = await medusaRequest((sdk) =>
    sdk.store.product.list(
      { region_id: regionId, limit, fields: PRODUCT_FIELDS },
      localeHeaders(locale),
    ),
  );
  return products.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    thumbnail: product.thumbnail ?? null,
    price: lowestPrice(product.variants),
  }));
}

/**
 * The first `limit` products, with prices for the region and titles in the language. Region and
 * locale are arguments, so each pair has its own cache entry (SPEC §8.3); tag `medusa:products` is
 * for the webhook that revalidates prices and stock.
 */
export const listProducts = cached(fetchProducts, {
  name: "medusa:products:list",
  tags: ["medusa:products"],
  life: "minutes",
});
