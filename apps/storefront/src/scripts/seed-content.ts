/**
 * The content seed (T59, `pnpm bootstrap` step 11), run with the storefront's `.env` loaded and
 * the database migrated:
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/seed-content.ts
 *
 * Each content type's module is in `src/payload/seed/`, the globals' in `seed/globals.ts` (T61),
 * the forms' in `seed/forms.ts` (T67: created once, before the footer that names one);
 * `ui-strings` (T62, D77) has its own run, since its 798 documents are read and compared in one
 * query. Safe to repeat: a second run changes nothing, and an editor's change is kept
 * (`seededUpdate`, `changeFor`), a pending draft too (`kept`). Its result is one line of JSON,
 * `{"seedContent":{"created":…,"updated":…,"unchanged":…,"kept":[…],"uiStrings":{…}}}`, among
 * Payload's log lines.
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { seedAllContent } from "../payload/seed/content";

const payload = await getPayload({ config });
console.log(JSON.stringify({ seedContent: await seedAllContent(payload) }));
