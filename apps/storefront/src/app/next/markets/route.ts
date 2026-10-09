import { getRenderMarketMap } from "../../../lib/markets/cached-market-map";

// The market map for `proxy.ts`. Importing Payload into the proxy costs about 550 ms on the first
// request of a process (T11 measured it; the plan's limit is 150 ms), so the proxy fetches the map
// from here instead and never loads Payload. This route is prerendered at build and refreshed from
// the `use cache` entry of `getRenderMarketMap()` (tag `global:markets`, revalidated after 30 s),
// so the first request after a start is answered from the build's copy. It sits under `/next`,
// which the proxy's matcher leaves alone. The map is what the hreflang tags will say anyway.
export async function GET() {
  return Response.json(await getRenderMarketMap());
}
