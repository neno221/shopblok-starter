import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { OUTAGE_SUBJECTS } from "./support/catalog";

// T49, O5: run after `ci.yml` has started Medusa again through `start-medusa`, against the same
// `next start` (no restart): the page that could not be made during the outage is made now, and
// the status route is green again.

test("the shop recovers once Medusa is back (O5)", async ({ request }) => {
  const { o3, market } = JSON.parse(readFileSync(OUTAGE_SUBJECTS, "utf8")) as {
    o3: string;
    market: string;
  };
  await expect
    .poll(async () => (await request.get("/next/status")).status(), {
      timeout: 30_000,
    })
    .toBe(200);
  expect((await request.get(`${market}/products/${o3}`)).status()).toBe(200);
});
