import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { catalogHandles, OUTAGE_SUBJECTS, prerenderCap } from "./support/catalog";
import { stopMedusa } from "./support/medusa-process";

// T49, D67 item 2, ADR 0004: what the shop answers while Medusa is down, against `next start` built
// with STOREFRONT_PRERENDER_PRODUCTS (4 in CI). The subjects are taken from past the cap, so they were not
// prerendered: O2's page is rendered once here before the stop, O3's never is. `catalog.spec.ts`
// visits the first of them (the hoodie, in the demo catalog), so O3 is the last. The spec leaves
// Medusa down; `ci.yml` starts it again and `outage-recovery.spec.ts` checks O5.

const MARKET = "/us";
/** The map's `revalidate` (D58): past it a route's own entry is stale, and still answers. */
const ROUTE_REVALIDATE_MS = 30_000;

test("the catalog rides out a Medusa outage (O2 to O4, the status route, D58's revalidate)", async ({
  request,
}) => {
  test.setTimeout(120_000);
  const handles = await catalogHandles();
  const pastCap = handles.slice(prerenderCap());
  expect(
    pastCap.length,
    "the build must leave two products to render on request",
  ).toBeGreaterThanOrEqual(2);
  const o2 = pastCap[0] as string;
  const o3 = pastCap.at(-1) as string;
  const missing = "no-such-product-t49";

  const before = await request.get(`${MARKET}/products/${o2}`);
  expect(before.status()).toBe(200);
  const title = /<title>([^<]*)<\/title>/.exec(await before.text())?.[1];
  expect(title).toBeTruthy();
  expect((await request.get(`${MARKET}/products/${missing}`)).status()).toBe(404);

  mkdirSync(path.dirname(OUTAGE_SUBJECTS), { recursive: true });
  writeFileSync(OUTAGE_SUBJECTS, JSON.stringify({ o2, o3, market: MARKET }));

  const stopped = await stopMedusa();
  const stoppedAt = Date.now();
  console.log(`Medusa stopped; /health refused after ${stopped.waitedMs} ms`);

  // O2: a page rendered before the outage answers as it was.
  const during = await request.get(`${MARKET}/products/${o2}`);
  expect(during.status()).toBe(200);
  expect(await during.text()).toContain(`<title>${title}</title>`);
  // O3: a page never rendered cannot be made without Medusa.
  expect((await request.get(`${MARKET}/products/${o3}`)).status()).toBeGreaterThanOrEqual(500);
  // O4: a missing product visited before is still a 404.
  expect((await request.get(`${MARKET}/products/${missing}`)).status()).toBe(404);

  // ADR 0004 reading 5: the status route says so, within its 2 s per check.
  const started = Date.now();
  const status = await request.get("/next/status");
  const took = Date.now() - started;
  expect(status.status()).toBe(503);
  expect(await status.json()).toMatchObject({ checks: { medusa: "down" } });
  expect(took).toBeLessThanOrEqual(2_010);

  // D58: past the route's `revalidate`, the regeneration fails and the page is served stale.
  const wait = ROUTE_REVALIDATE_MS + 1_000 - (Date.now() - stoppedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const late = await request.get(`${MARKET}/products/${o2}`);
    expect(late.status()).toBe(200);
    expect(await late.text()).toContain(`<title>${title}</title>`);
  }
});
