import { Module } from "@medusajs/framework/utils";

import PayloadModuleService from "./service";

/** The container key: `container.resolve(PAYLOAD_MODULE)`. */
export const PAYLOAD_MODULE = "payload";

export default Module(PAYLOAD_MODULE, { service: PayloadModuleService });

export type { PayloadModuleOptions, RunCounts, SyncRun } from "./service";
export { PayloadModuleService };
