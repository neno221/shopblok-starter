/**
 * The content seed (T59, `pnpm bootstrap` step 11), run with the storefront's `.env` loaded and
 * the database migrated:
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/seed-content.ts
 *
 * Each content type's module is in `src/payload/seed/`, the globals' in `seed/globals.ts` (T61),
 * the forms' in `seed/forms.ts` (T67: created once, before the footer that names one);
 * `ui-strings` (T62, D77) has its own run, since its 733 documents are read and compared in one
 * query. Safe to repeat: a second run changes nothing, and an editor's change is kept
 * (`seededUpdate`, `changeFor`), a pending draft too (`kept`). Its result is one line of JSON,
 * `{"seedContent":{"created":…,"updated":…,"unchanged":…,"kept":[…],"uiStrings":{…}}}`, among
 * Payload's log lines.
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { SEED_GLOBALS, SEED_MODULES } from "../payload/seed";
import { seedForms } from "../payload/seed/forms";
import { runGlobalSeeds, runSeeds } from "../payload/seed/run";
import { seedUiStrings } from "../payload/seed/ui-strings";

const payload = await getPayload({ config });
const documents = await runSeeds(payload, SEED_MODULES);
// T67: the forms, before the footer's seed looks up the newsletter's.
const forms = await seedForms(payload);
// T61: the globals, counted with the documents (a global is one document here).
const globals = await runGlobalSeeds(payload, SEED_GLOBALS);
const runs = [documents, forms, globals];
const counts = {
  created: runs.reduce((sum, run) => sum + run.created, 0),
  updated: runs.reduce((sum, run) => sum + run.updated, 0),
  unchanged: runs.reduce((sum, run) => sum + run.unchanged, 0),
  kept: runs.flatMap((run) => run.kept),
};
const started = performance.now();
const uiStrings = await seedUiStrings(payload);
const seconds = Number(((performance.now() - started) / 1000).toFixed(1));
console.log(JSON.stringify({ seedContent: { ...counts, uiStrings: { ...uiStrings, seconds } } }));
