/**
 * The Meilisearch provider of the Search Module (D126), registered by `src/config/modules.ts` when
 * MEILISEARCH_HOST and MEILISEARCH_API_KEY are set:
 *
 *   { resolve: "@medusajs/medusa/search",
 *     options: { default_provider: "meilisearch",
 *                providers: [{ resolve: "@medusajs/medusa/search-postgres", id: "postgres" },
 *                            { resolve: "./src/modules/meilisearch-search", id: "meilisearch",
 *                              options: { host, api_key } }] } }
 */
import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { MeilisearchSearchService } from "./service";

export default ModuleProvider(Modules.SEARCH, {
  services: [MeilisearchSearchService],
});
