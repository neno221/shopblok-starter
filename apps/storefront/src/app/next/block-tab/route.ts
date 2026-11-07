import { blockTabResponse } from "../../../lib/cms/block-tab";

// T81: a `tabs` product collection's tab, for its island: the published page's block, the tab's
// stored source in the market's region (`lib/cms/block-tab.ts`). Under `/next`, which the proxy's
// matcher skips; the catalog's, so a shared cache may keep it a minute.
export async function GET(request: Request) {
  return blockTabResponse(request);
}
