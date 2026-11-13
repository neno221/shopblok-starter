import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";

import { rebuildIncompleteLocaleIndexes } from "../lib/search-locale-indexes";

/**
 * Every five minutes: a store locale without a whole Meilisearch index of its own (one the store
 * added, or dropped and added back) gets one through a rebuild of the product index; until then it
 * searches the default locale's index (`src/lib/search-locale-indexes.ts`, T94). Nothing on Postgres.
 */
export default async function searchLocaleIndexes(container: MedusaContainer) {
  try {
    await rebuildIncompleteLocaleIndexes(container);
  } catch (error) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(
        `[Search] search-locale-indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
  }
}

export const config = {
  name: "search-locale-indexes",
  schedule: "*/5 * * * *",
};
