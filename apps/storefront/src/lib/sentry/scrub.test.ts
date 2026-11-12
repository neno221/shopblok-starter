import { readFileSync } from "node:fs";
import type { Breadcrumb, ErrorEvent, Event } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import {
  FILTERED,
  scrubBreadcrumb,
  scrubEvent,
  scrubHooks,
  scrubSpan,
  scrubText,
  scrubUrl,
} from "./scrub";

// The cases both apps run (the backend's copy of the rules reads the same file).
const cases = JSON.parse(
  readFileSync(
    new URL("../../../../../packages/integrations/src/sentry-scrub-cases.json", import.meta.url),
    "utf8",
  ),
) as { url: [string, string][]; text: [string, string][] };

// The secrets the plan's step 4 feeds in: none of them may come back out of any hook.
const SECRETS = ["s3cr3t-token", "c0de-42", "ann@example.com", "ann%40example.com", "sid=abc"];
const leaks = (value: unknown) => {
  const text = JSON.stringify(value);
  return SECRETS.filter((secret) => text.includes(secret));
};

describe("scrubUrl and scrubText (the shared cases)", () => {
  it.each(cases.url)("scrubUrl(%j)", (input, expected) => {
    expect(scrubUrl(input)).toBe(expected);
  });
  it.each(cases.text)("scrubText(%j)", (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });
});

describe("beforeSend", () => {
  const event: ErrorEvent = {
    type: undefined,
    message: "Failed for ann@example.com",
    transaction: "/reset-password?token=s3cr3t-token&email=ann%40example.com",
    request: {
      url: "https://shop.example/reset-password?token=s3cr3t-token&email=ann%40example.com",
      method: "POST",
      query_string: "token=s3cr3t-token&email=ann%40example.com",
      cookies: { _shopblok_session: "sid=abc" },
      headers: {
        Cookie: "sid=abc",
        Authorization: "Bearer s3cr3t-token",
        Referer: "https://shop.example/verify?code=c0de-42",
        "User-Agent": "Mozilla/5.0",
      },
      data: { email: "ann@example.com", password: "s3cr3t-token" },
    },
    user: { id: "cus_1", email: "ann@example.com", ip_address: "203.0.113.9" },
    exception: { values: [{ type: "Error", value: "GET /verify?code=c0de-42 failed" }] },
    breadcrumbs: [{ category: "navigation", data: { from: "/us", to: "/us/verify?code=c0de-42" } }],
  };

  it("keeps no cookie, authorization, body, token, code or e-mail anywhere", () => {
    const out = scrubHooks.beforeSend(event);
    expect(leaks(out)).toEqual([]);
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.data).toBeUndefined();
    expect(out.request?.headers).toEqual({ "User-Agent": "Mozilla/5.0" });
    expect(out.user).toEqual({ id: "cus_1" });
  });

  it("keeps the URL's path and the names of the parameters, without their values", () => {
    // The mutation of the plan's Verify list: a beforeSend that keeps the query string fails here.
    const out = scrubEvent(event);
    expect(out.request?.url).toBe(
      `https://shop.example/reset-password?token=${FILTERED}&email=${FILTERED}`,
    );
    expect(out.request?.query_string).toBe(`token=${FILTERED}&email=${FILTERED}`);
    expect(out.exception?.values?.[0]?.value).toBe(`GET /verify?code=${FILTERED} failed`);
  });

  it("scrubs a query string given as pairs or as an object", () => {
    const pairs = scrubEvent({
      request: {
        query_string: [
          ["code", "c0de-42"],
          ["page", "2"],
        ],
      },
    });
    expect(pairs.request?.query_string).toEqual([
      ["code", FILTERED],
      ["page", "2"],
    ]);
    const object = scrubEvent({ request: { query_string: { token: "s3cr3t-token", q: "x" } } });
    expect(object.request?.query_string).toEqual({ token: FILTERED, q: "x" });
  });
});

describe("beforeBreadcrumb", () => {
  it.each<[string, Breadcrumb]>([
    [
      "a navigation to the password reset",
      {
        category: "navigation",
        data: { from: "/us", to: "/reset-password?token=s3cr3t-token&email=ann%40example.com" },
      },
    ],
    [
      "a fetch to the verification",
      { category: "fetch", data: { method: "GET", url: "/verify?code=c0de-42", status_code: 200 } },
    ],
    ["an xhr", { category: "xhr", data: { url: "https://x.test/a?email=ann@example.com" } }],
    [
      "a console message",
      { category: "console", message: "token=s3cr3t-token for ann@example.com" },
    ],
  ])("scrubs %s", (_, breadcrumb) => {
    // The mutation of the plan's Verify list: a scrubber that skips breadcrumbs fails here.
    expect(leaks(scrubHooks.beforeBreadcrumb(breadcrumb))).toEqual([]);
  });

  it("keeps what is harmless", () => {
    const crumb = scrubBreadcrumb({
      category: "fetch",
      data: { url: "/us/store?page=2", status_code: 500 },
    });
    expect(crumb.data).toEqual({ url: "/us/store?page=2", status_code: 500 });
  });
});

describe("transactions and spans", () => {
  it("beforeSendTransaction scrubs a transaction named after such a URL", () => {
    const transaction: Event = {
      type: "transaction",
      transaction: "GET /verify?code=c0de-42",
      spans: [
        {
          span_id: "1",
          trace_id: "2",
          start_timestamp: 0,
          description: "GET /reset-password?token=s3cr3t-token",
          data: { "url.full": "/reset-password?token=s3cr3t-token&email=ann%40example.com" },
          origin: "manual",
          status: "ok",
        },
      ],
    };
    expect(leaks(scrubHooks.beforeSendTransaction(transaction))).toEqual([]);
  });

  it("beforeSendSpan scrubs a streamed span's name and attributes", () => {
    const span = {
      name: "GET /verify?code=c0de-42",
      attributes: {
        "url.full": "https://shop.example/verify?code=c0de-42",
        "http.query": "token=s3cr3t-token",
        "sentry.op": "http.server",
      },
    };
    const out = scrubSpan(span);
    expect(leaks(out)).toEqual([]);
    expect(out.attributes["sentry.op"]).toBe("http.server");
  });
});
