import { Module } from "@medusajs/framework/utils";

import MarketsModuleService from "./service";

export const MARKETS_MODULE = "markets";

export default Module(MARKETS_MODULE, {
  service: MarketsModuleService,
});

export { MarketsModuleService };
