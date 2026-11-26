/**
 * The staging seed's Payload half (M7 D148, 5; T114), run by `scripts/vercel-build.sh` in staging's
 * Production build while `SEED_ON_BUILD=payload` is set, after `payload migrate`:
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/seed-staging.ts
 *
 * Each step is safe to repeat, so a second build changes nothing:
 *
 * 1. Only while `users` is empty: the first admin, for `SEED_ADMIN_EMAIL`, with a random password
 *    nobody sees, then Payload's password-reset e-mail to that address, whose link (valid for
 *    `RESET_LINK_HOURS`) is the only copy of its token. If the e-mail cannot be sent, the user is
 *    removed again and the build fails, so the next build tries again and no deployment ever
 *    answers with a `users` table that only a lost e-mail could open. Payload's own "Forgot
 *    password?" on `/admin/login` sends a new link later.
 * 2. The `integrations` user with `PAYLOAD_API_KEY` (`ensureIntegrationsUser`).
 * 3. The demo's Payload content (`seedAllContent`), which keeps an editor's change.
 *
 * It refuses outside staging, in a preview, without Resend (the e-mail would be printed in the
 * log) and without the two variables (`stagingPayloadSeedRefusal`). Its result is one line of
 * JSON, `{"seedStagingPayload":{…}}`, with the outcomes only: never the password, the token, the
 * key or the address. It writes no file.
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { SEED_CONTEXT } from "../payload/collections/users";
import { seedAllContent } from "../payload/seed/content";
import { ensureIntegrationsUser } from "../payload/seed/integrations-user";
import {
  RESET_LINK_HOURS,
  seedAdminEmail,
  stagingPayloadSeedRefusal,
  stagingResultLine,
  unusablePassword,
} from "../payload/seed/staging";

const refusal = stagingPayloadSeedRefusal(process.env);
if (refusal !== undefined) throw new Error(refusal);
const email = seedAdminEmail(process.env) as string;
const apiKey = (process.env.PAYLOAD_API_KEY ?? "").trim();

const payload = await getPayload({ config });

// 1. The first admin. `SEED_CONTEXT` passes `closedFirstUser`, which refuses any other first user
// on a deployment; `firstUserIsAdmin` makes it an admin.
let admin: "created" | "exists" = "exists";
const { totalDocs: users } = await payload.count({ collection: "users", overrideAccess: true });
if (users === 0) {
  const created = await payload.create({
    collection: "users",
    data: { email, password: unusablePassword(), role: "admin" },
    context: { [SEED_CONTEXT]: true },
    overrideAccess: true,
  });
  try {
    const token = await payload.forgotPassword({
      collection: "users",
      data: { email },
      expiration: RESET_LINK_HOURS * 60 * 60 * 1000,
      overrideAccess: true,
    });
    // `null` when Payload found nobody to send it to: the e-mail did not go out.
    if (typeof token !== "string" || token === "") throw new Error("Payload sent no reset e-mail.");
  } catch (error) {
    // Straight through the adapter: `keepOneAdminOnDelete` would refuse to delete the only admin.
    await payload.db.deleteOne({ collection: "users", where: { id: { equals: created.id } } });
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `seed-staging: the first admin's reset e-mail could not be sent, so the admin was removed again and the next build retries (${reason}).`,
    );
  }
  admin = "created";
}

// 2. The machine user Medusa's sync signs in as.
const integration = await ensureIntegrationsUser(payload, apiKey);

// 3. The demo's content.
const content = await seedAllContent(payload);

console.log(
  stagingResultLine({
    admin,
    integration,
    content: {
      created: content.created,
      updated: content.updated,
      unchanged: content.unchanged,
      kept: content.kept.length,
    },
  }),
);
