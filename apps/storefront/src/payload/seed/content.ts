import type { Payload } from "payload";
import { SEED_GLOBALS, SEED_MODULES } from ".";
import { seedForms } from "./forms";
import { runGlobalSeeds, runSeeds } from "./run";
import { seedUiStrings } from "./ui-strings";

/**
 * The demo's Payload content (T59, T61, T62, T67): the documents, the forms (before the footer
 * that names one), the globals, then the UI strings. Safe to repeat: a second run changes nothing,
 * and an editor's change is kept. `pnpm bootstrap` (`seed-content.ts`) and the staging seed's
 * Payload half (`seed-staging.ts`, M7 D148) both run it.
 */
export async function seedAllContent(payload: Payload) {
  const documents = await runSeeds(payload, SEED_MODULES);
  const forms = await seedForms(payload);
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
  return { ...counts, uiStrings: { ...uiStrings, seconds } };
}
