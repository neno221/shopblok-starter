/**
 * The Payload half of `pnpm bootstrap` (T13, step 8). Run by bootstrap, with the storefront's `.env`
 * loaded and the database migrated (`payload migrate`, step 7):
 *
 *   pnpm --filter @shopblok/storefront exec payload run src/scripts/bootstrap-payload.ts
 *
 * It reads three variables, set by bootstrap: BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD
 * (optional) and BOOTSTRAP_PAYLOAD_API_KEY. It does three things and each one is safe to repeat:
 *
 * 1. The first Payload admin, with the development credentials, only while `users` is empty. A
 *    `beforeChange` hook makes the first user an admin whatever the data says (T09).
 * 2. The `integrations` user "Medusa sync", whose API key is the one in the backend's `.env`.
 *    Payload keeps a hash of the key and never returns it, so the check is to authenticate with it.
 *    A key that doesn't authenticate (a wiped database, a new PAYLOAD_SECRET) is set again.
 * 3. The `markets` global, from `@shopblok/fixtures`, only while it has no country (T10 item 7:
 *    production has no fallback for an empty global). An editor's map is never overwritten.
 *
 * Its result is one line of JSON, `{"bootstrapPayload":{…}}`, among Payload's log lines.
 */
import config from "@payload-config";
import { markets as seededMarkets } from "@shopblok/fixtures";
import { getPayload } from "payload";
import { mapFromGlobal, marketMapProblems } from "../lib/markets/global";
import { marketsGlobalData } from "./markets-data";

const INTEGRATION_NAME = "Medusa sync";

type Outcome = {
  admin: "created" | "exists";
  generatedAdminPassword?: string;
  integration: "created" | "unchanged" | "rekeyed";
  markets: "seeded" | "unchanged";
  problems: string[];
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
  markets: "unchanged",
  problems: [],
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

// 2. The machine user. Authenticating is the real test of "this key works", through the same
// strategy a request would use.
const { user: keyOwner } = await payload.auth({
  headers: new Headers({ Authorization: `integrations API-Key ${apiKey}` }),
});
if (keyOwner?.collection !== "integrations") {
  const { docs } = await payload.find({
    collection: "integrations",
    where: { name: { equals: INTEGRATION_NAME } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  const existing = docs[0];
  if (existing) {
    await payload.update({
      collection: "integrations",
      id: existing.id,
      data: { enableAPIKey: true, apiKey },
      overrideAccess: true,
    });
    outcome.integration = "rekeyed";
  } else {
    await payload.create({
      collection: "integrations",
      data: { name: INTEGRATION_NAME, role: "medusa-sync", enableAPIKey: true, apiKey },
      overrideAccess: true,
    });
    outcome.integration = "created";
  }
}

// 3. The market map. Only an empty global is filled: after that it belongs to the shop's owner.
const markets = await payload.findGlobal({ slug: "markets", depth: 0, overrideAccess: true });
if ((markets.countries ?? []).length === 0) {
  const seeded = marketMapProblems(seededMarkets);
  if (seeded.length > 0) {
    throw new Error(`The seeded market map in @shopblok/fixtures is not usable: ${seeded.join("; ")}`);
  }
  await payload.updateGlobal({
    slug: "markets",
    data: marketsGlobalData(seededMarkets),
    overrideAccess: true,
  });
  outcome.markets = "seeded";
} else {
  outcome.problems = marketMapProblems(mapFromGlobal(markets));
}

console.log(JSON.stringify({ bootstrapPayload: outcome }));
