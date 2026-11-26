import type { Payload } from "payload";

/** The `integrations` user Medusa's sync signs in as (T13, T60). */
export const INTEGRATION_NAME = "Medusa sync";

/**
 * Makes sure `apiKey` signs in as the `integrations` user (`pnpm bootstrap`'s step 8, and the
 * staging seed's Payload half, M7 D148, 5): Payload keeps only a hash of the key and never returns
 * it, so the check is to authenticate with it, through the strategy a request uses. A key that
 * does not authenticate (a wiped database, a new `PAYLOAD_SECRET`, a rotated key) is set again on
 * the existing user, or the user is created. Safe to repeat.
 */
export async function ensureIntegrationsUser(
  payload: Payload,
  apiKey: string,
): Promise<"created" | "unchanged" | "rekeyed"> {
  const { user: keyOwner } = await payload.auth({
    headers: new Headers({ Authorization: `integrations API-Key ${apiKey}` }),
  });
  if (keyOwner?.collection === "integrations") return "unchanged";
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
    return "rekeyed";
  }
  await payload.create({
    collection: "integrations",
    data: { name: INTEGRATION_NAME, role: "medusa-sync", enableAPIKey: true, apiKey },
    overrideAccess: true,
  });
  return "created";
}
