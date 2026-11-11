import { describe, expect, it } from "vitest";
import { describeRequest, thirdPartyReason } from "./third-party-hosts";

const SITE = "http://localhost:8000";

describe("thirdPartyReason", () => {
  it("names the integrations' hosts and every host below them", () => {
    for (const [url, domain] of [
      ["https://js.stripe.com/v3/", "stripe.com"],
      ["https://api.stripe.com/v1/payment_intents", "stripe.com"],
      ["https://m.stripe.network/inner.html", "stripe.network"],
      ["https://api.resend.com/emails", "api.resend.com"],
      ["https://o1.ingest.de.sentry.io/api/2/envelope/", "sentry.io"],
      ["https://browser.sentry-cdn.com/x.js", "sentry-cdn.com"],
      ["https://eu.i.posthog.com/e/", "posthog.com"],
      ["https://eu-assets.i.posthog.com/static/array.js", "posthog.com"],
      ["https://acc.r2.cloudflarestorage.com/bucket/a.png", "r2.cloudflarestorage.com"],
      ["https://pub-1.r2.dev/a.png", "r2.dev"],
      ["wss://x.stripe.com/socket", "stripe.com"],
    ] as const) {
      expect(thirdPartyReason(url, SITE), url).toBe(`a third-party host (${domain})`);
    }
  });

  it("names the site's own tunnels, and only on the site's origin", () => {
    expect(thirdPartyReason(`${SITE}/ingest/e/`, SITE)).toBe("the site's /ingest tunnel");
    expect(thirdPartyReason(`${SITE}/ingest`, SITE)).toBe("the site's /ingest tunnel");
    expect(thirdPartyReason(`${SITE}/monitoring?o=1`, SITE)).toBe("the site's /monitoring tunnel");
    expect(thirdPartyReason("http://localhost:9000/ingest/e/", SITE)).toBeUndefined();
  });

  it("lets the shop's own traffic through", () => {
    for (const url of [
      `${SITE}/`,
      `${SITE}/us/products/hoodie`,
      `${SITE}/ingestion-guide`,
      `${SITE}/us/monitoring`,
      `${SITE}/_next/static/chunks/a.js`,
      "http://localhost:9000/store/products",
      "https://notstripe.com/",
      "https://stripe.com.example.org/",
      "data:image/png;base64,AAAA",
      "blob:http://localhost:8000/1",
      "not a url",
    ]) {
      expect(thirdPartyReason(url, SITE), url).toBeUndefined();
    }
  });
});

describe("describeRequest", () => {
  it("keeps the method, origin and path, and drops the query", () => {
    expect(describeRequest("GET", "https://js.stripe.com/v3/?secret=x#y")).toBe(
      "GET https://js.stripe.com/v3/",
    );
  });
});
