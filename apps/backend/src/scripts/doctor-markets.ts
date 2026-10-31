/**
 * The markets half of `pnpm run doctor` (T14, M4b D97): what the markets plugin holds, as
 * `GET /admin/markets` answers it, read straight from the database so that no server has to run.
 * Run by doctor:
 *
 *   pnpm --filter @shopblok/backend exec medusa exec ./src/scripts/doctor-markets.ts
 *
 * It only reads. Its result is one line of JSON, `{"doctorMarkets":{…}}`, among Medusa's log
 * lines: the map (`GET /store/markets`), the regions with their countries, the store's locales and
 * the warnings of D91 (`problems`). Doctor compares the first three with each other
 * (`scripts/lib/markets-check.ts`) and reports the last.
 */
import type { ExecArgs } from "@medusajs/framework/types";
import { readOverview } from "@shopblok/medusa-markets/lib/overview";

export default async function doctorMarkets({ container }: ExecArgs) {
  const { map, regions, locales, default_region_id, problems } = await readOverview(container);
  console.log(
    JSON.stringify({ doctorMarkets: { map, regions, locales, default_region_id, problems } }),
  );
}
