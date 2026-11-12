import { expect, test, type Page } from "@playwright/test";
import { appEnv } from "../support/app-env";
import { doctorOnline, skipWithoutKeys } from "../support/integration-keys";
import { medusaUrl } from "../support/medusa-admin";
import { SINK_DSN, startSink, type Sink, type SinkEvent } from "../support/sentry-sink";

// M6 D125, D131 (T96): Sentry, live. Four errors, one from each place that reports: a storefront
// route handler (`/next/e2e/throw`, through `onRequestError`), a Medusa route (`/e2e/throw`, through
// the error handler), a Payload endpoint (`/api/e2e/throw`, through `afterError`) and the browser,
// thrown before the SDK has loaded (the queue in `instrumentation-client.ts`). Each request carries a
// cookie, an authorization header and `token`, `code` and `email` in its URL.
//
// With CI's sink (both DSNs are `SINK_DSN` when the Sentry secrets are not set) the spec reads the
// events back: each error arrives exactly once, and none of the secrets is in it. With a real DSN
// the events go to Sentry, which this spec cannot read back (that needs a user's API token, which
// G10 does not ask for): it checks that each error answers 500, that the browser's envelope went
// through `/monitoring` and Sentry took it, and that `doctor --online` finds the DSNs accepted; the
// events are looked at in Sentry's Issues page (W8).

skipWithoutKeys(test, "sentry");
test.describe.configure({ mode: "serial" });

const storefront = "http://localhost:8000";
const SECRETS = ["s3cr3t-t0ken", "c0de-4242", "ann@example.com", "ann%40example.com", "sid-s3cr3t"];
const query = "token=s3cr3t-t0ken&code=c0de-4242&email=ann%40example.com";
const headers = { cookie: "_shopblok_session=sid-s3cr3t", authorization: "Bearer s3cr3t-t0ken" };

/** An app's DSN, blank when it has none (`appEnv` throws then). */
const dsnOf = (app: "backend" | "storefront", name: string) => {
  try {
    return appEnv(app, name).trim();
  } catch {
    return "";
  }
};
const sinkMode = () =>
  dsnOf("storefront", "NEXT_PUBLIC_SENTRY_DSN") === SINK_DSN &&
  dsnOf("backend", "SENTRY_DSN") === SINK_DSN;

let sink: Sink | undefined;
const marker = `t96-${Date.now().toString(36)}`;

test.beforeAll(async () => {
  if (sinkMode()) sink = await startSink();
});
test.afterAll(async () => {
  await sink?.close();
});

const mentions = (event: SinkEvent, text: string) =>
  (event.exception?.values ?? []).some((value) => value.value?.includes(text));

/** The sink's events for `text`: waits for the first, then a little more, so a second would show. */
async function arrived(text: string): Promise<SinkEvent[]> {
  await expect
    .poll(() => sink!.events.filter((event) => mentions(event, text)).length, { timeout: 20_000 })
    .toBeGreaterThan(0);
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  return sink!.events.filter((event) => mentions(event, text));
}

function expectScrubbed(event: SinkEvent) {
  const text = JSON.stringify(event);
  expect(SECRETS.filter((secret) => text.includes(secret))).toEqual([]);
  const sent = Object.keys(event.request?.headers ?? {}).map((name) => name.toLowerCase());
  expect(sent.filter((name) => ["cookie", "authorization"].includes(name))).toEqual([]);
  expect(event.request?.cookies).toBeUndefined();
  expect(event.request?.data).toBeUndefined();
}

async function checkServerError(url: string, text: string) {
  const answer = await fetch(url, { headers });
  expect(answer.status, url.replace(/\?.*$/, "")).toBe(500);
  if (sink === undefined) return;
  const events = await arrived(text);
  expect(events, `${text}: one event`).toHaveLength(1);
  expectScrubbed(events[0]!);
  return events[0]!;
}

test("a storefront route's error reaches Sentry once, scrubbed", async () => {
  const event = await checkServerError(
    `${storefront}/next/e2e/throw?marker=${marker}-shop&${query}`,
    `${marker}-shop`,
  );
  if (event) expect(event.request?.url).toContain(`marker=${marker}-shop&token=[Filtered]`);
});

test("a Medusa 500 reaches Sentry once, scrubbed", async () => {
  const event = await checkServerError(
    `${medusaUrl()}/e2e/throw?marker=${marker}-medusa&${query}`,
    `${marker}-medusa`,
  );
  if (event) {
    expect(event.tags).toMatchObject({ app: "medusa", "medusa.route": "/e2e/throw" });
    expect(event.request?.url).toContain("token=[Filtered]");
  }
});

test("a Payload 500 reaches Sentry once, scrubbed", async () => {
  const event = await checkServerError(
    `${storefront}/api/e2e/throw?marker=${marker}-payload&${query}`,
    `${marker}-payload`,
  );
  if (event) expect(event.tags).toMatchObject({ app: "payload" });
});

/** Throws `text` in the page as soon as its HTML is parsed, and notes whether Sentry was there. */
async function throwBeforeTheSdk(page: Page, text: string) {
  await page.addInitScript((message) => {
    addEventListener("DOMContentLoaded", () => {
      (window as { sdkBefore?: boolean }).sdkBefore = "__SENTRY__" in window;
      setTimeout(() => {
        throw new Error(message);
      });
    });
  }, text);
}

test("a browser error thrown before the SDK loaded reaches Sentry once, through /monitoring", async ({
  page,
}) => {
  const text = `${marker}-browser`;
  await throwBeforeTheSdk(page, text);
  const tunnel = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/monitoring" && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.goto(`/us?${query}#email=ann@example.com`);
  expect(await page.evaluate(() => (window as { sdkBefore?: boolean }).sdkBefore)).toBe(false);
  expect((await tunnel).status()).toBe(200);
  if (sink === undefined) return;
  const events = await arrived(text);
  expect(events).toHaveLength(1);
  expectScrubbed(events[0]!);
  expect(events[0]!.tags).toMatchObject({ loader: "shopblok:sentry-browser" });
});

test("doctor --online finds both DSNs accepted", () => {
  const checks = doctorOnline().checks.filter((check) => check.id.startsWith("sentry-envelope"));
  expect(checks.map((check) => [check.level, check.message])).toEqual(
    checks.map((check) => ["ok", check.message]),
  );
  expect(checks.length).toBeGreaterThan(0);
});
