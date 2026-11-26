import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";
import { createInvitesWorkflow, refreshInviteTokensWorkflow } from "@medusajs/medusa/core-flows";

import inviteCreated from "../subscribers/invite-created";
import { PUBLISHABLE_KEY_TITLE } from "./lib/markets";
import { adminEmail, inviteAction, resultLine, stagingSeedRefusal } from "./lib/staging-seed";
import seedDemoCatalog from "./seed-demo-catalog";
import seedMarkets from "./seed-markets";
import syncStripeRegionsScript from "./sync-stripe-regions";

/**
 * The staging seed's Medusa half (M7 D148, 5), a one-off run of Medusa's image inside Railway with
 * the server's variables (`shopblok seed-staging`, or the predeploy while `SEED_ON_DEPLOY=medusa`,
 * DEPLOY.md):
 *
 *   medusa exec ./src/scripts/seed-staging.js
 *
 * 1. the markets (`seed-markets`), 2. Stripe on the regions (`sync-stripe-regions`), 3. with
 * `SEED_DEMO=true`, the demo catalog (`seed-demo-catalog`), and 4. Medusa Admin's invite for
 * `SEED_ADMIN_EMAIL`, whose e-mail (T99's `admin-invite`) carries the only copy of its token.
 * Each step is idempotent, so a second run changes nothing and sends no second e-mail (the e-mail's
 * idempotency key is the token's hash). Staging only. It prints one line, `{"seedStaging":{…}}`,
 * with the store's publishable key (public: the storefront's bundle carries it), and never the
 * token, the address or any other value.
 *
 * The invite's e-mail is sent here, not through `invite.created`: a short `medusa exec` with Redis
 * exits before the event bus queues a workflow's events (seed-demo-catalog.ts, "Search").
 */
export default async function seedStaging({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const refusal = stagingSeedRefusal(process.env);
  if (refusal !== undefined) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, refusal);
  const email = adminEmail(process.env)!;

  await seedMarkets({ container, args: [] });
  await syncStripeRegionsScript({ container, args: [] });
  const demo = (process.env.SEED_DEMO ?? "").trim().toLowerCase() === "true";
  if (demo) await seedDemoCatalog({ container, args: args.filter((arg) => arg !== "skip") });
  else logger.info("seed-staging: demo catalog skipped (SEED_DEMO is not true).");

  const users = container.resolve(Modules.USER);
  const [existing, invites] = await Promise.all([
    users.listUsers({ email }, { select: ["email"] }),
    users.listInvites({ email }, { select: ["id", "email", "accepted", "expires_at"] }),
  ]);
  const decision = inviteAction({
    email,
    userEmails: existing.map((user) => user.email),
    invites,
    now: new Date(),
  });
  let inviteId: string | undefined;
  if (decision.action === "create") {
    const { result } = await createInvitesWorkflow(container).run({
      input: { invites: [{ email }] },
    });
    inviteId = result[0]?.id;
  } else if (decision.action === "refresh") {
    await refreshInviteTokensWorkflow(container).run({
      input: { invite_ids: [decision.inviteId] },
    });
    inviteId = decision.inviteId;
  } else if (decision.action === "send") {
    inviteId = decision.inviteId;
  }
  if (inviteId !== undefined) {
    // The subscriber's own lookup reads the token, builds the link and sends once per token.
    await inviteCreated({
      event: { name: "invite.created", data: { id: inviteId } },
      container,
      pluginOptions: {},
    } as unknown as Parameters<typeof inviteCreated>[0]);
  }
  logger.info(`seed-staging: Medusa Admin invite: ${decision.action}.`);

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["token", "revoked_at"],
    filters: { type: "publishable", title: PUBLISHABLE_KEY_TITLE },
  });
  const key = keys.find((each) => !each.revoked_at)?.token;
  if (typeof key !== "string" || !key.startsWith("pk_"))
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "seed-markets left no publishable key.");
  console.log(
    resultLine({ demo: demo ? "seeded" : "skipped", invite: decision.action, publishableKey: key }),
  );
}
