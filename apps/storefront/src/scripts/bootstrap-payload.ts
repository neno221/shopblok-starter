/**
 * The Payload half of `pnpm bootstrap` (T13, step 8: "Payload users"). Run by bootstrap, with the storefront's `.env`
 * loaded and the database migrated (`payload migrate`, step 7):
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/bootstrap-payload.ts
 *
 * It reads three variables, set by bootstrap: BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD
 * (optional) and BOOTSTRAP_PAYLOAD_API_KEY. It does two things and each one is safe to repeat:
 *
 * 1. The first Payload admin, with the development credentials, only while `users` is empty. A
 *    `beforeChange` hook makes the first user an admin whatever the data says (T09).
 * 2. The `integrations` user "Medusa sync", whose API key is the one in the backend's `.env`.
 *    Payload keeps a hash of the key and never returns it, so the check is to authenticate with it.
 *    A key that doesn't authenticate (a wiped database, a new PAYLOAD_SECRET) is set again.
 *
 * The market map is not Payload's any more (M4b, D95): `pnpm bootstrap` seeds Medusa's markets
 * module in step 4.
 *
 * Its result is one line of JSON, `{"bootstrapPayload":{…}}`, among Payload's log lines.
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { ensureIntegrationsUser } from "../payload/seed/integrations-user";

type Outcome = {
  admin: "created" | "exists";
  generatedAdminPassword?: string;
  integration: "created" | "unchanged" | "rekeyed";
};

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is not set: this script is run by \`pnpm bootstrap\`.`);
  }
  return value;
}

const adminEmail = required("BOOTSTRAP_ADMIN_EMAIL");
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || undefined;
const apiKey = required("BOOTSTRAP_PAYLOAD_API_KEY");

const payload = await getPayload({ config });
const outcome: Outcome = {
  admin: "exists",
  integration: "unchanged",
};

// 1. The first admin. Nobody is signed in, so this is a system call that skips access control.
const { totalDocs: users } = await payload.count({ collection: "users", overrideAccess: true });
if (users === 0) {
  const generated = adminPassword === undefined;
  const password = adminPassword ?? crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  await payload.create({
    collection: "users",
    data: { email: adminEmail, password, role: "admin" },
    overrideAccess: true,
  });
  outcome.admin = "created";
  if (generated) outcome.generatedAdminPassword = password;
}

// 2. The machine user (`ensureIntegrationsUser`: authenticating is the real test of "this key
// works").
outcome.integration = await ensureIntegrationsUser(payload, apiKey);

console.log(JSON.stringify({ bootstrapPayload: outcome }));
