import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";
import { appEnv } from "../support/app-env";
import { catalogs } from "../support/catalogs";
import { doctorOnline, skipWithoutKeys } from "../support/integration-keys";
import {
  decodeBody,
  eventsIn,
  SINK_KEY,
  startSink,
  type Sink,
  type SinkEvent,
} from "../support/posthog-sink";
import { addToCart, checkOut, orderIdOf } from "../support/purchase";

// M6 D124 (T97): PostHog, live. Nothing is sent before analytics consent; after it, page views and
// the shop's events go through the site's own `/ingest` (a POST to `/ingest/e/` with its body, which
// Next's rewrite forwards without a trailing-slash redirect first), each with `market` and `locale`;
// a withdrawal stops it at once and removes PostHog's cookie and storage. On the server, Medusa's
// subscribers send `cart_created` and `order_placed` for a consented cart and order only: an order
// placed without consent, or whose consent was withdrawn on the review page, sends nothing.
//
// With CI's sink (both apps' keys are `SINK_KEY` and their host the sink when the PostHog secrets are
// not set) the spec reads what arrived upstream: the browser's events through Next's rewrite, and
// Medusa's batches. With a real key PostHog's answer is all it sees: the browser's requests are read
// on their way out (each a POST that PostHog takes), and `doctor --online` finds the keys accepted;
// the server's events are looked at in PostHog's Activity page (W8).

skipWithoutKeys(test, "posthog");
test.describe.configure({ mode: "serial" });

const en = catalogs.en;
const ADDRESS = {
  firstName: "Ada",
  lastName: "Lovelace",
  address1: "350 Fifth Avenue",
  city: "New York",
  province: "NY",
  postalCode: "10118",
};

const keyOf = (app: "backend" | "storefront", name: string) => {
  try {
    return appEnv(app, name).trim();
  } catch {
    return "";
  }
};
const browserKey = () => keyOf("storefront", "NEXT_PUBLIC_POSTHOG_KEY");
const sinkMode = () =>
  browserKey() === SINK_KEY && keyOf("backend", "POSTHOG_EVENTS_API_KEY") === SINK_KEY;

let sink: Sink | undefined;
test.beforeAll(async () => {
  if (sinkMode()) sink = await startSink();
});
test.afterAll(async () => {
  await sink?.close();
});

/** The browser's requests to the site's `/ingest`, and the events each held. */
function watchIngest(context: BrowserContext) {
  const requests: Request[] = [];
  const events: SinkEvent[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/ingest")) return;
    requests.push(request);
    const body = request.postDataBuffer();
    if (body === null || body.length === 0) return;
    const path = `${url.pathname}${url.search}`;
    try {
      events.push(...eventsIn(decodeBody(path, request.headers(), body), path, request.method()));
    } catch {
      // Not an event batch.
    }
  });
  return { requests, events };
}

const named = (events: SinkEvent[], name: string) => events.filter((each) => each.event === name);
const banner = (page: Page) => page.locator('[data-slot="cookie-consent"]');

/** Says yes to analytics alone, from the banner's dialog. */
async function consentToAnalytics(page: Page) {
  await expect(banner(page)).toBeVisible();
  await page.locator('[data-slot="cookie-consent-choose"]').click();
  await page
    .locator('[data-slot="cookie-consent-dialog"]')
    .getByRole("switch", { name: en.organisms.cookieConsent.analytics })
    .click();
  await page.locator('[data-slot="cookie-consent-dialog-save"]').click();
  await expect(banner(page)).toHaveCount(0);
}

/** Withdraws from the footer's "Cookie settings". */
async function withdraw(page: Page) {
  await page.locator('[data-slot="footer-cookie-settings"]:visible').click();
  await page.locator('[data-slot="cookie-consent-dialog-reject"]').click();
  await expect(page.locator('[data-slot="cookie-consent-dialog"]')).toHaveCount(0);
}

/** PostHog's cookies and storage entries in `page`'s browser (`ph_…`, `__ph…`). */
async function posthogStorage(page: Page): Promise<string[]> {
  const cookies = (await page.context().cookies())
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith("ph_") || name.startsWith("__ph"));
  const stored = await page.evaluate(() =>
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(
      (name) => name.startsWith("ph_") || name.startsWith("__ph"),
    ),
  );
  return [...cookies, ...stored];
}

/** The visitor's PostHog distinct id, from PostHog's cookie. */
async function distinctIdOf(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find(
    (each) => each.name === `ph_${browserKey()}_posthog`,
  );
  expect(cookie, "PostHog's cookie").toBeDefined();
  return (JSON.parse(decodeURIComponent(cookie!.value)) as { distinct_id: string }).distinct_id;
}

test("sends nothing before consent", async ({ page, context }) => {
  const ingest = watchIngest(context);
  await page.goto("/us");
  await expect(banner(page)).toBeVisible();
  await addToCart(page, "/us");
  await page.waitForTimeout(4_000);
  expect(ingest.requests.map((request) => request.url())).toEqual([]);
  expect(await posthogStorage(page)).toEqual([]);
});

test("after analytics consent, page views and the shop's events go through /ingest, then stop at a withdrawal", async ({
  page,
  context,
}) => {
  const ingest = watchIngest(context);
  await page.goto("/us");
  await consentToAnalytics(page);
  await addToCart(page, "/us");
  await expect
    .poll(() => named(ingest.events, "product_added_to_cart").length, { timeout: 20_000 })
    .toBe(1);
  await expect
    .poll(() => named(ingest.events, "$pageview").length, { timeout: 20_000 })
    .toBeGreaterThan(0);

  // Each event carries the market and its Medusa locale; the add, what was added.
  for (const event of [
    ...named(ingest.events, "$pageview"),
    ...named(ingest.events, "product_added_to_cart"),
  ])
    expect(event.properties, event.event).toMatchObject({ market: "en-us", locale: "en-US" });
  expect(named(ingest.events, "product_added_to_cart")[0]!.properties).toMatchObject({
    quantity: 1,
    source: "product_page",
  });
  expect(named(ingest.events, "product_viewed")).toHaveLength(1);
  // A POST with its body, and PostHog (or the sink behind Next's rewrite) took it: no redirect.
  const sent = ingest.requests.filter(
    (request) => new URL(request.url()).pathname === "/ingest/e/",
  );
  expect(sent.length).toBeGreaterThan(0);
  for (const request of sent) {
    expect(request.method()).toBe("POST");
    const answer = await request.response();
    expect(answer?.status(), request.url()).toBe(200);
    expect(request.redirectedFrom()).toBeNull();
  }
  if (sink !== undefined) {
    await expect
      .poll(() => named(sink!.events, "product_added_to_cart").length, { timeout: 20_000 })
      .toBeGreaterThan(0);
    expect(sink.requests.some((line) => /^POST \/e\/?(\?|$)/.test(line))).toBe(true);
  }

  // Withdrawn: PostHog's cookie and storage go at once, and nothing more is sent.
  expect(await posthogStorage(page)).not.toEqual([]);
  await withdraw(page);
  await expect.poll(() => posthogStorage(page)).toEqual([]);
  const before = ingest.requests.length;
  await page.goto("/us/store");
  await addToCart(page, "/us", 2);
  await page.waitForTimeout(5_000);
  expect(ingest.requests.slice(before).map((request) => request.url())).toEqual([]);
  expect(await posthogStorage(page)).toEqual([]);
});

test("Medusa sends cart_created and order_placed for a consented order, as the visitor", async ({
  page,
  context,
}) => {
  test.skip(
    sink === undefined,
    "With a real key, the server's events are checked in PostHog (W8).",
  );
  await page.goto("/us");
  await consentToAnalytics(page);
  // PostHog has made the visitor's id before the first add, so the new cart carries it.
  await expect
    .poll(async () =>
      (await context.cookies()).some((c) => c.name === `ph_${browserKey()}_posthog`),
    )
    .toBe(true);
  const id = await distinctIdOf(context);
  await addToCart(page, "/us");
  await page.goto("/us/checkout/contact");
  const receipt = await checkOut(page, {
    words: en,
    email: `posthog-${Date.now()}@example.com`,
    address: ADDRESS,
  });
  const orderId = orderIdOf(receipt);
  // posthog-node sends its queue every 10 s.
  await expect
    .poll(
      () =>
        named(sink!.events, "order_placed").filter((e) => e.properties["order_id"] === orderId)
          .length,
      {
        timeout: 40_000,
      },
    )
    .toBe(1);
  const placed = named(sink!.events, "order_placed").find(
    (e) => e.properties["order_id"] === orderId,
  )!;
  expect(placed.distinctId).toBe(id);
  expect(placed.properties).toMatchObject({ market: "en-us", locale: "en-US", currency: "usd" });
  expect(JSON.stringify(placed)).not.toContain("@example.com");
  expect(named(sink!.events, "cart_created").some((e) => e.distinctId === id)).toBe(true);
});

test("Medusa sends nothing for an order placed without consent, or withdrawn on the review page", async ({
  browser,
}) => {
  test.skip(
    sink === undefined,
    "With a real key, the server's events are checked in PostHog (W8).",
  );
  const orders: string[] = [];
  // No consent at all: the banner's "Reject all".
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/us");
    await page.locator('[data-slot="cookie-consent-reject"]').click();
    await addToCart(page, "/us");
    await page.goto("/us/checkout/contact");
    orders.push(
      orderIdOf(
        await checkOut(page, {
          words: en,
          email: `posthog-no-${Date.now()}@example.com`,
          address: ADDRESS,
        }),
      ),
    );
    await context.close();
  }
  // Consent given, then withdrawn on the review page before "Place order".
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/us");
    await consentToAnalytics(page);
    await addToCart(page, "/us");
    await page.goto("/us/checkout/contact");
    orders.push(
      orderIdOf(
        await checkOut(page, {
          words: en,
          email: `posthog-withdrawn-${Date.now()}@example.com`,
          address: ADDRESS,
          onStep: async (step) => {
            if (step === "review") await withdraw(page);
          },
        }),
      ),
    );
    await context.close();
  }
  // Longer than posthog-node's 10 s: anything queued has been sent by now.
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  for (const orderId of orders)
    expect(
      sink!.events.filter((event) => event.properties["order_id"] === orderId),
      orderId,
    ).toEqual([]);
});

test("doctor --online finds the keys accepted", async () => {
  const checks = (await doctorOnline()).checks.filter((check) => check.id.startsWith("posthog"));
  expect(checks.length).toBeGreaterThan(0);
  expect(checks.map((check) => [check.id, check.level])).toEqual(
    checks.map((check) => [check.id, "ok"]),
  );
});
