import "server-only";
import { cached } from "../cache";
import { env } from "../env";
import { lowestPrice, type ProductSummary } from "../medusa/products";
import { localeHeaders, medusaRequest } from "../medusa/sdk";

// THROWAWAY spike code (plan M1 §6, S4). The commit that adds it is removed by the next one.

/**
 * Shorter than the catalog's real life, so the spike can pass `revalidate` (60 s) and `expire`
 * (300 s) in minutes. `ensureStatic = "navigation"` refuses an `expire` under 5 minutes and a
 * `stale` under 30 seconds, so these are the smallest values variant B accepts.
 */
export const SPIKE_LIFE = { stale: 30, revalidate: 60, expire: 300 } as const;

/**
 * The param a build with no backend prerenders, because Cache Components refuses an empty
 * `generateStaticParams`. Pages answer 404 for it before they ask Medusa anything.
 */
export const BUILD_STAND_IN = "__build-stand-in";

/**
 * True only while `next build` runs and no Medusa is configured (CI's `check` build has no `.env`).
 * D10's rule for the market map (`defaultAllowFallback` in `markets/source.ts`): a stand-in is
 * fine while building without the dependency, and never at run time, where `NEXT_PHASE` is not the
 * build's. A blank `MEDUSA_BACKEND_URL` (`KEY=` in `.env`) counts as unset, as it does in
 * `medusaEnv()`.
 */
export function buildWithoutBackend(): boolean {
  const building = env.NEXT_PHASE === "phase-production-build";
  return building && (env.MEDUSA_BACKEND_URL ?? "").trim() === "";
}

// Copied from `medusa/products.ts`, which does not export it.
const PRODUCT_FIELDS = "id,handle,title,thumbnail,*variants.calculated_price";

export type SpikeProduct = Pick<ProductSummary, "id" | "handle" | "title" | "price">;

export type ProductByHandleInput = {
  handle: string;
  /** The region prices are calculated for. */
  regionId: string;
  /** A Medusa locale (`el-GR`): the market's `medusaLocale`. */
  locale: string;
};

export type ProductByHandle = {
  /** `null` when Medusa has no product with that handle. */
  product: SpikeProduct | null;
  /** When this entry was read from Medusa, so a page can show how old its data is. */
  fetchedAt: string;
};

async function fetchProductByHandle({
  handle,
  regionId,
  locale,
}: ProductByHandleInput): Promise<ProductByHandle> {
  const { products } = await medusaRequest((sdk) =>
    sdk.store.product.list(
      { handle, region_id: regionId, limit: 1, fields: PRODUCT_FIELDS },
      localeHeaders(locale),
    ),
  );
  const [found] = products;
  return {
    product:
      found === undefined
        ? null
        : {
            id: found.id,
            handle: found.handle,
            title: found.title,
            price: lowestPrice(found.variants),
          },
    // Taken here, inside `use cache`: `new Date()` in a prerendered component is an error, and
    // the page should show when the cached data was read, not when it was rendered.
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * One product by handle. A missing product is cached as `null` like any other answer, so for the
 * life of the entry it is a 404 without asking Medusa again. A Medusa failure throws and caches
 * nothing.
 */
export const getProductByHandle = cached(fetchProductByHandle, {
  name: "spike-s4:product-by-handle",
  tags: ["medusa:products"],
  life: SPIKE_LIFE,
});

async function fetchSpikeHandles(): Promise<string[]> {
  const { products } = await medusaRequest((sdk) =>
    sdk.store.product.list({ limit: 2, fields: "handle", order: "created_at" }),
  );
  return products.map((product) => product.handle);
}

/**
 * The handles to prerender: exactly two, so that the store's other products stay unrendered for
 * the test of a handle that was never rendered.
 */
export const listSpikeHandles = cached(fetchSpikeHandles, {
  name: "spike-s4:handles",
  tags: ["medusa:products"],
  life: SPIKE_LIFE,
});

/**
 * `generateStaticParams` of variant B and B2. A build with no backend prerenders the stand-in only
 * (O6). A build that has `MEDUSA_BACKEND_URL` and cannot reach Medusa fails here, with the
 * `MedusaRequestError` naming Medusa and its URL (O7): a deployment's build needs its backend, as
 * D10's needs its database.
 */
export async function spikeStaticParams(): Promise<{ handle: string }[]> {
  if (buildWithoutBackend()) {
    console.warn("[spike-s4] no MEDUSA_BACKEND_URL while building: prerendering the stand-in only");
    return [{ handle: BUILD_STAND_IN }];
  }
  const handles = await listSpikeHandles();
  if (handles.length === 0) {
    console.warn("[spike-s4] Medusa has no products: prerendering the stand-in only");
    return [{ handle: BUILD_STAND_IN }];
  }
  return handles.map((handle) => ({ handle }));
}
