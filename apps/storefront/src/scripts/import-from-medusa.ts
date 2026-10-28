/**
 * `pnpm bootstrap` step 10, second half (D75): writes the file the backend's
 * `export-for-payload.ts` made into Payload, as the `medusa-sync` integration the backend's key
 * signs in as (`src/payload/sync/import.ts`). Run with the storefront's `.env` loaded and the
 * database migrated:
 *
 *   PAYLOAD_SYNC_FILE=/tmp/sync.json BOOTSTRAP_PAYLOAD_API_KEY=… pnpm --filter @shopblok/storefront exec payload run src/scripts/import-from-medusa.ts
 *
 * Its result is one line of JSON, `{"importFromMedusa":{…counts}}`, among Payload's log lines.
 */
import { readFileSync } from "node:fs";
import config from "@payload-config";
import { getPayload } from "payload";
import { importFromMedusa, type SyncExport } from "../payload/sync/import";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

const exported = JSON.parse(readFileSync(required("PAYLOAD_SYNC_FILE"), "utf8")) as SyncExport;
const payload = await getPayload({ config });
// The same principal as the backend's REST writes: the integration the key belongs to.
const { user } = await payload.auth({
  headers: new Headers({
    Authorization: `integrations API-Key ${required("BOOTSTRAP_PAYLOAD_API_KEY")}`,
  }),
});
if (user?.collection !== "integrations" || user.role !== "medusa-sync") {
  throw new Error(
    "The API key does not sign in as the medusa-sync integration (bootstrap step 8).",
  );
}
const counts = await importFromMedusa(payload, user, exported);
console.log(JSON.stringify({ importFromMedusa: counts }));
