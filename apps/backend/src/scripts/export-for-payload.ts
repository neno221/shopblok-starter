import { writeFileSync } from "node:fs";

import type { ExecArgs } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";

import { exportAll } from "../lib/payload-sync";

/**
 * `pnpm bootstrap` step 10, first half (D75): Medusa's products, categories and collections, mapped as
 * the sync maps them, written to the file `PAYLOAD_SYNC_FILE`
 * names. `apps/storefront/src/scripts/import-from-medusa.ts` then writes them into Payload through
 * the Local API, so neither server has to run.
 *
 *   PAYLOAD_SYNC_FILE=/tmp/sync.json pnpm --filter @shopblok/backend exec medusa exec ./src/scripts/export-for-payload.ts
 */
export default async function exportForPayload({ container }: ExecArgs) {
  const file = process.env.PAYLOAD_SYNC_FILE;
  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Set PAYLOAD_SYNC_FILE to the file to write.",
    );
  }
  const exported = await exportAll(container);
  writeFileSync(file, JSON.stringify(exported), { mode: 0o600 });
  const counts = Object.fromEntries(
    Object.entries(exported.documents).map(([collection, documents]) => [
      collection,
      documents.length,
    ]),
  );
  console.log(JSON.stringify({ exportForPayload: { file, counts } }));
}
