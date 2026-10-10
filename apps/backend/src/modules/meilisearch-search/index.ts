/**
 * S2 prototype (not for main, D13). Registers the provider with the Search Module:
 *
 *   { resolve: "@medusajs/medusa/search",
 *     options: { providers: [{ resolve: "./src/modules/meilisearch-search", id: "meilisearch",
 *                              options: { host, api_key } }] } }
 */
import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { MeilisearchSearchService } from "./service";

export default ModuleProvider(Modules.SEARCH, {
  services: [MeilisearchSearchService],
});
