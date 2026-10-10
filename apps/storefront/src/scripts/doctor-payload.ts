/**
 * The Payload half of `pnpm run doctor` (T14): what the `markets` global holds, read the way
 * `getMarketMap()` reads it. Run by doctor, with the storefront's `.env` loaded:
 *
 *   NODE_ENV=production pnpm --filter @shopblok/storefront exec payload run src/scripts/doctor-payload.ts
 *
 * It only reads. `NODE_ENV=production` is what stops Payload from creating a missing database on
 * connect (`disableCreateDatabase` in payload.config.ts): doctor must never write, and a wrong
 * `PAYLOAD_DATABASE_URL` would otherwise create an empty database on whichever server answers (D18).
 *
 * Doctor can't import the app (T10 item 8), and the global can't be read over REST with an
 * `integrations` key (staff only, T09), so this is the read. Its result is one line of JSON,
 * `{"doctorPayload":{…}}`, among Payload's log lines: the map, and the reasons `marketMapProblems`
 * gives for a map that cannot serve a shop (empty, a country with no language, a language with no
 * Medusa locale, …).
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { mapFromGlobal, marketMapProblems } from "../lib/markets/global";

const payload = await getPayload({ config });
// A system read, as in `filterAvailableLocales` (T09): which markets exist is the shop's setting, and
// nobody is signed in here.
const markets = await payload.findGlobal({ slug: "markets", depth: 0, overrideAccess: true });
const map = mapFromGlobal(markets);

console.log(JSON.stringify({ doctorPayload: { map, problems: marketMapProblems(map) } }));
