/**
 * The content seed (T59, `pnpm bootstrap` step 11), run with the storefront's `.env` loaded and
 * the database migrated:
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/seed-content.ts
 *
 * Each content type's module is in `src/payload/seed/`. Safe to repeat: a second run changes
 * nothing, and an editor's change is kept (`seededUpdate`), a pending draft too (`kept`). Its
 * result is one line of JSON, `{"seedContent":{"created":…,"updated":…,"unchanged":…,"kept":[…]}}`,
 * among Payload's log lines.
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { SEED_MODULES } from "../payload/seed";
import { runSeeds } from "../payload/seed/run";

const payload = await getPayload({ config });
const counts = await runSeeds(payload, SEED_MODULES);
console.log(JSON.stringify({ seedContent: counts }));
