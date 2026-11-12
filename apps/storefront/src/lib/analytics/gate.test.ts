// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M6 D124 (T97): the gate starts PostHog after consent, once, stops it on a withdrawal, and
// follows the customer.
vi.mock("../actions/consent", () => ({ syncCartConsent: vi.fn(async () => true) }));

const loader = {
  startAnalytics: vi.fn(),
  stopAnalytics: vi.fn(),
  syncIdentity: vi.fn(),
};
const context = {
  key: "phc_test",
  host: "https://eu.i.posthog.com",
  market: "en-us",
  locale: "en-US",
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.resetModules();
  for (const fn of Object.values(loader)) fn.mockClear();
});
afterEach(() => {
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
  document.cookie = "ph_phc_test_posthog=; Path=/; Max-Age=0";
});

async function setup(givenHere = false) {
  const { watchAnalytics } = await import("./gate");
  const { chooseConsent } = await import("../visitor/consent");
  const store = await import("../visitor/store");
  const { syncCartConsent } = await import("../actions/consent");
  const load = vi.fn(async () => loader as never);
  const stop = watchAnalytics(context, vi.mocked(syncCartConsent), givenHere, load);
  return { load, stop, chooseConsent, store, syncCartConsent: vi.mocked(syncCartConsent) };
}

describe("watchAnalytics (D124)", () => {
  it("loads nothing without consent", async () => {
    const { load, chooseConsent } = await setup();
    chooseConsent({ analytics: false, marketing: true });
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  it("loads PostHog once after a yes, and tells the cart its id", async () => {
    const { load, chooseConsent, syncCartConsent } = await setup();
    chooseConsent({ analytics: true, marketing: false });
    chooseConsent({ analytics: true, marketing: true });
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(loader.startAnalytics).toHaveBeenCalledWith(context);
    expect(syncCartConsent).toHaveBeenCalled();
  });

  it("imported for a yes given on this page, starts and tells the cart its id", async () => {
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    const { load, syncCartConsent } = await setup(true);
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(loader.startAnalytics).toHaveBeenCalledWith(context);
    expect(syncCartConsent).toHaveBeenCalledTimes(1);
  });

  it("starts at once on a page opened with consent, without a cart write", async () => {
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    const { load, syncCartConsent } = await setup();
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(loader.startAnalytics).toHaveBeenCalledTimes(1);
    expect(syncCartConsent).not.toHaveBeenCalled();
  });

  it("stops PostHog at once when analytics is withdrawn", async () => {
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    const { chooseConsent } = await setup();
    await flush();
    chooseConsent({ analytics: false, marketing: false });
    await flush();
    expect(loader.stopAnalytics).toHaveBeenCalledTimes(1);
  });

  it("clears PostHog's leftovers on a page with no consent (a withdrawal in another tab)", async () => {
    document.cookie = "ph_phc_test_posthog=%7B%7D; Path=/";
    await setup();
    expect(document.cookie).not.toContain("ph_phc_test_posthog=%7B%7D");
  });

  it("identifies the store's customer, and nobody while the store does not know", async () => {
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    const { store } = await setup();
    await flush();
    expect(loader.syncIdentity).not.toHaveBeenCalled();
    store.setVisitor({ cartCount: 0, consent: null, customer: { id: "cus_1", firstName: "Ada" } });
    await flush();
    expect(loader.syncIdentity).toHaveBeenLastCalledWith("cus_1");
    store.setVisitor({ cartCount: 0, consent: null });
    await flush();
    expect(loader.syncIdentity).toHaveBeenLastCalledWith(null);
  });

  it("stops watching, and leaves PostHog running, when the island unmounts", async () => {
    const { stop, chooseConsent, load } = await setup();
    stop();
    chooseConsent({ analytics: true, marketing: false });
    await flush();
    expect(load).not.toHaveBeenCalled();
  });
});
