import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { medusaRequest } from "./sdk";

/** At most this many ids per call (`SALE_ENDS_MAX_IDS` in the backend's route). */
const IDS_PER_REQUEST = 100;

async function fetchSaleEnds(ids: readonly string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].sort().slice(0, IDS_PER_REQUEST);
  if (unique.length === 0) return {};
  const { sale_ends } = await medusaRequest((sdk) =>
    sdk.client.fetch<{ sale_ends: Record<string, string> }>("/store/sale-ends", {
      query: { id: unique },
    }),
  );
  return sale_ends;
}

/**
 * When each active sale among the price lists `ids` ends (M7 D147, T110: `GET /store/sale-ends`,
 * ours, since Medusa's Store API gives no list's dates), as ISO dates by the list's id; a sale
 * without an end is left out. Tagged `medusa:products`, which a price list's change revalidates
 * (`storefront-revalidate.ts` in the backend), so a sale moved to another day reaches the page with
 * its prices. Pass the ids sorted, so equal sets share an entry.
 */
export const getSaleEnds = cached(fetchSaleEnds, {
  name: "medusa:sale-ends",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});
