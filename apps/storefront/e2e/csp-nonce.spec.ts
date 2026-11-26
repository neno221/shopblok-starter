import type { APIResponse, Page } from "@playwright/test";
import { appEnvOrBlank } from "./support/app-env";
import { catalogHandles } from "./support/catalog";
import { expect, test } from "./support/csp";

// M7 D139 (T107): the nonce policy on the nine routes (`src/lib/security/nonce-routes.ts`), in the
// default market (`/`, Cyprus) and a prefixed one (`/us`), against `next start` as e2e-smoke runs
// it. Each response has exactly one policy header, with a nonce of its own (two requests, two
// nonces) and no `'unsafe-inline'` for scripts; every `<script>` in its HTML carries that nonce;
// it is never cached (`Cache-Control: private, no-store`); and in the browser the page hydrates
// with no violation (the CSP fixture), its islands and the chunks Next inserts later loading under
// `'strict-dynamic'`. The static routes keep the static policy. Then the mutation: a script
// without the nonce, written into a cart page's HTML, is blocked and fails the fixture.

const POLICY_HEADERS = ["content-security-policy", "content-security-policy-report-only"];

const expectedPolicy =
  appEnvOrBlank("storefront", "CSP_MODE") === "report-only"
    ? "content-security-policy-report-only"
    : "content-security-policy";

/** A page of each of the nine routes that renders without a signed-in customer or an order. */
const NONCE_PAGES = [
  "/cart",
  "/checkout/contact",
  "/account",
  "/account/orders/order_t107_missing",
  "/order/lookup",
  "/order/order_t107_missing/confirmed",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify",
];

const MARKETS = ["", "/us"];

const PAGES = MARKETS.flatMap((prefix) => NONCE_PAGES.map((path) => `${prefix}${path}`));

/** Every value of every policy header, so a header sent twice shows twice. */
function policies(response: APIResponse): { name: string; value: string }[] {
  return response
    .headersArray()
    .filter(({ name }) => POLICY_HEADERS.includes(name.toLowerCase()))
    .map(({ name, value }) => ({ name: name.toLowerCase(), value }));
}

const nonceOf = (policy: string): string | undefined => /'nonce-([^']+)'/.exec(policy)?.[1];

/** Each `<script …>` start tag in the HTML. */
const scriptTags = (html: string): string[] => html.match(/<script\b[^>]*>/gi) ?? [];

test("each nonce route answers one policy with a fresh nonce on every script, never cached", async ({
  request,
}) => {
  for (const path of PAGES) {
    const first = await request.get(path, { maxRedirects: 0 });
    const second = await request.get(path, { maxRedirects: 0 });
    expect(first.status(), path).toBeLessThan(500);
    for (const response of [first, second]) {
      const sent = policies(response);
      expect(
        sent.map((p) => p.name),
        `${path}: exactly one policy header`,
      ).toEqual([expectedPolicy]);
      const policy = sent[0]!.value;
      expect(policy, path).toMatch(
        /script-src 'self' 'nonce-[A-Za-z0-9+/]{22}==' 'strict-dynamic'/,
      );
      expect(policy, path).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(policy, path).not.toContain("'unsafe-eval'");
      expect(policy, path).toContain("frame-ancestors 'self'");
      const cache = response.headers()["cache-control"] ?? "";
      expect(cache, `${path}: Cache-Control`).toContain("private");
      expect(cache, `${path}: Cache-Control`).toContain("no-store");
      if (response.status() !== 200) continue;
      const nonce = nonceOf(policy)!;
      const tags = scriptTags(await response.text());
      expect(tags.length, `${path}: scripts`).toBeGreaterThan(0);
      expect(
        tags.filter((tag) => !tag.includes(`nonce="${nonce}"`)),
        `${path}: every script carries this response's nonce`,
      ).toEqual([]);
    }
    expect(nonceOf(policies(second)[0]!.value), `${path}: a fresh nonce`).not.toBe(
      nonceOf(policies(first)[0]!.value),
    );
  }
});

test("the static routes keep the static policy", async ({ request }) => {
  const [handle] = await catalogHandles();
  for (const path of ["/", "/us", "/us/store", `/us/products/${handle}`, "/us/search?q=shirt"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const sent = policies(response);
    expect(
      sent.map((p) => p.name),
      path,
    ).toEqual([expectedPolicy]);
    expect(sent[0]!.value, path).toContain("script-src 'self' 'unsafe-inline'");
    expect(sent[0]!.value, path).not.toContain("'nonce-");
  }
  // A path under the nine that is no page is the CMS catch-all's 404, whose prerendered shell has
  // no nonce (T107's spike): it keeps the static policy too.
  const missing = await request.get("/us/cart/t107-no-such-page", { maxRedirects: 0 });
  expect(missing.status()).toBe(404);
  expect(policies(missing)[0]?.value).toContain("'unsafe-inline'");
});

/** The nonce each script element got, as the browser holds it (the attribute is hidden once parsed). */
async function scriptNonces(page: Page): Promise<{ src: string; nonce: string }[]> {
  return page.evaluate(() =>
    [...document.scripts].map((script) => ({
      src: script.src || "(inline)",
      nonce: script.nonce ?? "",
    })),
  );
}

test("in the browser each nonce route hydrates with no violation, its scripts all nonced", async ({
  page,
}) => {
  for (const path of PAGES) {
    const response = await page.goto(path);
    const policy = (await response?.allHeaders())?.[expectedPolicy] ?? "";
    const nonce = nonceOf(policy);
    expect(nonce, path).toBeDefined();
    // Hydrated: React's root is attached and Next's router answers.
    await page.waitForFunction(() => typeof (window as { next?: unknown }).next === "object");
    const unnonced = (await scriptNonces(page)).filter((script) => script.nonce !== nonce);
    // Scripts that the nonced ones insert later (Next's chunks, Stripe.js) are allowed by
    // `'strict-dynamic'` and carry no nonce of their own; every script the server wrote does.
    expect(
      unnonced.filter((script) => script.src === "(inline)"),
      `${path}: inline scripts`,
    ).toEqual([]);
  }
});

test("a client-side navigation between two nonce routes loads its chunks under 'strict-dynamic'", async ({
  page,
}) => {
  await page.goto("/us/login");
  await page.waitForFunction(() => typeof (window as { next?: unknown }).next === "object");
  await page.evaluate(() => {
    (window as { t107Marker?: boolean }).t107Marker = true;
  });
  const register = page.locator('a[href="/us/register"]').first();
  await expect(register).toBeVisible();
  await register.click();
  await page.waitForURL(/\/us\/register$/);
  await expect(page.getByRole("heading", { level: 1, name: "Create an account" })).toBeVisible();
  // The same document: no full load, so the chunks came in through the nonced scripts.
  expect(await page.evaluate(() => (window as { t107Marker?: boolean }).t107Marker)).toBe(true);
});

test("a script without the nonce written into a cart page is blocked and fails the CSP fixture", async ({
  page,
}) => {
  // T107's mutation: an inline script in the HTML the server sends, without the nonce, the way an
  // injection would arrive. `test.fail` turns the fixture's failure at the end into the outcome.
  test.fail(true, "the fixture fails this test on the violation it provokes");
  await page.route("**/us/cart", async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      "</body>",
      "<script>window.t107Injected = true</script></body>",
    );
    await route.fulfill({ response, body: html });
  });
  // Only the fixture may fail this test: with the nonce policy in place it sees the block; without
  // it (the static policy's `'unsafe-inline'`) nothing is blocked, the test passes, and `test.fail`
  // reports that.
  await page.goto("/us/cart");
  await page.waitForTimeout(500);
});
