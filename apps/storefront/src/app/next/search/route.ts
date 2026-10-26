import { searchResponse } from "../../../lib/listing/handlers";

// D63, D66 (T50): the search overlay's results for a query (`search-overlay-island.tsx`).
export async function GET(request: Request) {
  return searchResponse(request);
}
