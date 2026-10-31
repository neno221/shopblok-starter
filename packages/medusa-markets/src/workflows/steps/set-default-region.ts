import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

/** What the compensation needs; no `storeId` when the step changed nothing. */
type Undo = { storeId: string | null; previous: string | null };

const UNCHANGED: Undo = { storeId: null, previous: null };

/**
 * Sets the store's `default_region_id` (Medusa's own field on the Store page, used when a cart is
 * created without a region) to the primary country's region, so the two cannot disagree after a
 * settings save. `null` (a save with no primary country) and a store that already has this region
 * change nothing. Its compensation puts the old value back.
 */
export const setDefaultRegionStep = createStep(
  "set-default-region",
  async (input: { regionId: string | null }, { container }) => {
    if (input.regionId === null) return new StepResponse({ changed: false }, UNCHANGED);
    const stores = container.resolve(Modules.STORE);
    const [store] = await stores.listStores({}, { take: 1, select: ["id", "default_region_id"] });
    if (!store || store.default_region_id === input.regionId) {
      return new StepResponse({ changed: false }, UNCHANGED);
    }
    await stores.updateStores(store.id, { default_region_id: input.regionId });
    return new StepResponse(
      { changed: true },
      { storeId: store.id, previous: store.default_region_id ?? null },
    );
  },
  async (undo: Undo | undefined, { container }) => {
    if (!undo?.storeId) return;
    await container.resolve(Modules.STORE).updateStores(undo.storeId, {
      default_region_id: undo.previous,
    });
  },
);
