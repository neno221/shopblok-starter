import "server-only";
import { draftMode } from "next/headers";
import { env } from "../env";
import { getMarketMap } from "../markets/get-market-map";
import type { PreviewDeps } from "./preview";
import { staffFromHeaders } from "./read";

/** The preview routes' real world: Payload's session, the market map and Next's Draft Mode. */
export const previewDeps: PreviewDeps = {
  get secret() {
    return env.PREVIEW_SECRET;
  },
  staffSignedIn: async (headers) => (await staffFromHeaders(headers)) !== null,
  marketMap: getMarketMap,
  draftMode,
};
