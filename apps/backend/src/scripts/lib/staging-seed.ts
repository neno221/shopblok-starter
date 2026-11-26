import { deployEnv } from "../../config/deploy-env";

/**
 * The decisions of the staging seed's Medusa half (M7 D148, 5; `../seed-staging.ts`), as pure
 * functions, so that "a second run changes nothing and prints no secret" is tested without a
 * database.
 */

/** Why the staging seed must not run here, or `undefined` when it may. */
export function stagingSeedRefusal(env: Record<string, string | undefined>): string | undefined {
  const stage = deployEnv(env);
  if (stage === "production")
    return "seed-staging is staging's first deployment only (D148); production's first admin is GO-LIVE.md's (T117).";
  if (stage !== "staging")
    return "seed-staging runs on staging only (DEPLOY_ENV=staging); in development, `pnpm bootstrap` seeds and makes the admin.";
  if (adminEmail(env) === undefined)
    return "SEED_ADMIN_EMAIL is not an e-mail address, so there is nobody to invite to Medusa Admin.";
  // Without Resend, notification-local prints the invite's link, token and all, in the log.
  if ((env.RESEND_API_KEY ?? "").trim() === "" || (env.RESEND_FROM_EMAIL ?? "").trim() === "")
    return "seed-staging needs RESEND_API_KEY and RESEND_FROM_EMAIL: without them the invite's link, which carries its token, would be printed in the log instead of e-mailed.";
  return undefined;
}

/** `SEED_ADMIN_EMAIL`, trimmed and lowercased, when it looks like an address. */
export function adminEmail(env: Record<string, string | undefined>): string | undefined {
  const email = (env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export type InviteRow = {
  id: string;
  email: string;
  accepted: boolean;
  expires_at: Date | string;
};

/**
 * What to do about Medusa Admin's invite for the seed's address:
 *
 * - `user-exists`: the address is a user already (the invite was accepted, or someone made it):
 *   nothing to send;
 * - `send`: an open invite exists and has not expired: its e-mail is sent again, which the e-mail's
 *   idempotency key (the token's hash) turns into nothing when it already went out;
 * - `refresh`: the open invite expired: a new token (`invite.resent`), then its e-mail;
 * - `create`: no invite yet.
 */
export type InviteAction =
  | { action: "user-exists" }
  | { action: "send"; inviteId: string }
  | { action: "refresh"; inviteId: string }
  | { action: "create" };

export function inviteAction(input: {
  email: string;
  userEmails: readonly string[];
  invites: readonly InviteRow[];
  now: Date;
}): InviteAction {
  const email = input.email.toLowerCase();
  if (input.userEmails.some((each) => each.toLowerCase() === email))
    return { action: "user-exists" };
  const open = input.invites
    .filter((invite) => invite.email.toLowerCase() === email && !invite.accepted)
    .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime());
  const [latest] = open;
  if (latest === undefined) return { action: "create" };
  return new Date(latest.expires_at).getTime() > input.now.getTime()
    ? { action: "send", inviteId: latest.id }
    : { action: "refresh", inviteId: latest.id };
}

/**
 * The run's one result line, `{"seedStaging":{…}}`, which `shopblok seed-staging` waits for
 * (`medusa exec` exits 0 even when the app could not load). It holds the steps' outcomes and the
 * store's publishable key, which is public (the storefront's bundle carries it) and the one value
 * T115 copies to Vercel. Never the invite's token, the admin's address or any other value.
 */
export function resultLine(result: {
  demo: "seeded" | "skipped";
  invite: InviteAction["action"];
  publishableKey: string;
}): string {
  return JSON.stringify({ seedStaging: result });
}
