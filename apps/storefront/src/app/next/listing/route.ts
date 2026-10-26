import { listingResponse } from "../../../lib/listing/handlers";

// D59 (T50): a listing's results with the URL's filters and sort, for the listing island. Under
// `/next`, which the proxy's matcher skips; the catalog's, so a shared cache may keep it a minute.
export async function GET(request: Request) {
  return listingResponse(request);
}
