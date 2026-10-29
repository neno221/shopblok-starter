/**
 * The content seed (T59, `pnpm bootstrap` step 11), run with the storefront's `.env` loaded and
 * the database migrated:
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/seed-content.ts
 *
 * Each content type's module is in `src/payload/seed/`; `ui-strings` (T62, D77) has its own run,
 * since its 718 documents are read and compared in one query. Safe to repeat: a second run changes
 * nothing, and an editor's change is kept (`seededUpdate`, `changeFor`), a pending draft too
 * (`kept`). Its result is one line of JSON,
 * `{"seedContent":{"created":…,"updated":…,"unchanged":…,"kept":[…],"uiStrings":{…}}}`, among
 * Payload's log lines.
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { SEED_MODULES } from "../payload/seed";
import { runSeeds } from "../payload/seed/run";
import { seedUiStrings } from "../payload/seed/ui-strings";

const payload = await getPayload({ config });
const counts = await runSeeds(payload, SEED_MODULES);
const started = performance.now();
const uiStrings = await seedUiStrings(payload);
const seconds = Number(((performance.now() - started) / 1000).toFixed(1));
console.log(JSON.stringify({ seedContent: { ...counts, uiStrings: { ...uiStrings, seconds } } }));
