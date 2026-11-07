import { quickViewResponse } from "../../../lib/listing/quick-view";

// D101, D102 (T83): the quick view's product for the listing's dialog, loaded on the first press.
// Under `/next`, which the proxy's matcher skips; the catalog's, so a shared cache may keep it a
// minute (`lib/listing/quick-view.ts`).
export async function GET(request: Request) {
  return quickViewResponse(request);
}
