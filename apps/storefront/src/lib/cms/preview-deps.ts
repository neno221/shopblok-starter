import "server-only";
import { draftMode } from "next/headers";
import { env } from "../env";
import { getMarketMap } from "../markets/get-market-map";
import { getPayloadClient } from "./payload";
import type { PreviewDeps } from "./preview";

/** The preview routes' real world: Payload's session, the market map and Next's Draft Mode. */
export const previewDeps: PreviewDeps = {
  get secret() {
    return env.PREVIEW_SECRET;
  },
  staffSignedIn: async (headers) => {
    const payload = await getPayloadClient();
    const { user } = await payload.auth({ headers });
    return user?.collection === "users";
  },
  marketMap: getMarketMap,
  draftMode,
};
