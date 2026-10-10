/**
 * S1: fills the `markets` global of a fresh database and nothing else, so `users` stays empty and
 * the admin's create-first-user form is reachable. Run with:
 *   PAYLOAD_DATABASE_URL=… pnpm --filter @shopblok/storefront exec payload run spike/s1/seed-markets.ts
 */
import config from "@payload-config";
import { markets as seededMarkets } from "@shopblok/fixtures";
import { getPayload } from "payload";
import { marketsGlobalData } from "../../src/scripts/markets-data";

const payload = await getPayload({ config });
await payload.updateGlobal({
  slug: "markets",
  data: marketsGlobalData(seededMarkets),
  overrideAccess: true,
});
const { totalDocs } = await payload.count({ collection: "users", overrideAccess: true });
console.log(JSON.stringify({ s1Seed: { marketsSeeded: true, users: totalDocs } }));
process.exit(0);
