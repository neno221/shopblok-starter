import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./support/csp";
import { catalogHandles, OUTAGE_SUBJECTS, prerenderCap } from "./support/catalog";
import { stopMedusa } from "./support/medusa-process";
import { api } from "./support/payload-rest";
import { adminToken } from "./support/server";

// T49, D67 item 2, ADR 0004: what the shop answers while Medusa is down, against `next start` built
// with STOREFRONT_PRERENDER_PRODUCTS (4 in CI). The subjects are taken from past the cap, so they were not
// prerendered: O2's page is rendered once here before the stop, O3's never is. `catalog.spec.ts`
// visits the first of them (the hoodie, in the demo catalog), so O3 is the last. The spec leaves
// Medusa down; `ci.yml` starts it again and `outage-recovery.spec.ts` checks O5.
//
// M7 D142 (T108): the storefront's limits are Medusa's, so with Medusa down a form still sends (the
// limit lets it through, with one log line a minute in the storefront's log, which CI names in
// `E2E_STOREFRONT_LOG`). The form's page is drawn once before the stop, so it is served from the
// cache during the outage, as O2's product page is.

const MARKET = "/us";
const stamp = Date.now().toString(36);
const formSlug = `e2e-outage-form-${stamp}`;
let token = "";
let formPage: number | undefined;
let contact = 0;

test.beforeAll(async ({ request }) => {
  token = await adminToken();
  const forms = await api<{ docs: { id: number }[] }>(
    token,
    "GET",
    "/api/forms?where[seedKey][equals]=contact&limit=1&depth=0",
  );
  contact = forms.docs[0]?.id ?? 0;
  const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
    title: `Outage form ${stamp}`,
    slug: formSlug,
    layout: [{ blockType: "formBlock", variant: "standard", heading: "Write", form: contact }],
    _status: "published",
  });
  formPage = created.doc.id;
  expect((await request.get(`${MARKET}/${formSlug}`)).status()).toBe(200);
});

test.afterAll(async () => {
  if (formPage !== undefined)
    await api(token, "DELETE", `/api/pages/${formPage}`).catch(() => undefined);
  const { docs } = await api<{ docs: { id: number; submissionData: { value: string }[] }[] }>(
    token,
    "GET",
    `/api/form-submissions?where[form][equals]=${contact}&sort=-createdAt&limit=20&depth=0`,
  ).catch(() => ({ docs: [] }));
  for (const doc of docs)
    if (doc.submissionData.some((row) => row.value.includes(stamp)))
      await api(token, "DELETE", `/api/form-submissions/${doc.id}`).catch(() => undefined);
});
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

test("a form still sends with Medusa down: its rate limit lets it through, with one log line", async ({
  page,
}) => {
  const log = process.env["E2E_STOREFRONT_LOG"];
  const lines = () =>
    log !== undefined && existsSync(log)
      ? readFileSync(log, "utf8")
          .split("\n")
          .filter((line) => line.includes("rate-limit: Medusa did not answer"))
      : [];
  const before = lines().length;
  for (const n of [1, 2]) {
    await page.goto(`${MARKET}/${formSlug}`);
    const form = page.locator("[data-slot=form-block]");
    const email = `outage-${n}-${stamp}@example.com`;
    await form.locator("input[name=name]").fill("Ann Example");
    await form.locator("input[name=email]").fill(email);
    await form.locator("select[name=topic]").selectOption("returns");
    await form.locator("textarea[name=message]").fill(`A question from ${email}.`);
    await form.locator("input[name=consent]").check();
    await form.locator("button[type=submit]").click();
    await expect(form.locator("[data-slot=form-block-status]")).toContainText(
      "Thank you for writing.",
    );
  }
  const { docs } = await api<{ docs: { submissionData: { value: string }[] }[] }>(
    token,
    "GET",
    `/api/form-submissions?where[form][equals]=${contact}&sort=-createdAt&limit=20&depth=0`,
  );
  expect(
    docs.filter((doc) => doc.submissionData.some((row) => row.value.includes(stamp))),
  ).toHaveLength(2);
  // Two sendings in a minute, one line (the log is throttled), when CI names the log.
  if (log !== undefined) expect(lines().length - before).toBe(1);
});
