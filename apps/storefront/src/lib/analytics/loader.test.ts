// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M6 D124 (T97): what PostHog is started with, and what start, stop and identity do with it.
const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  opt_in_capturing: vi.fn(),
  clear_opt_in_out_capturing: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  get_distinct_id: vi.fn(() => "anon_1"),
  get_property: vi.fn(() => "anonymous"),
}));
vi.mock("posthog-js/dist/module.slim.no-external", () => ({ default: posthog }));

const context = {
  key: "phc_test",
  host: "https://eu.i.posthog.com",
  market: "en-us",
  locale: "en-US",
};

beforeEach(() => {
  vi.resetModules();
  for (const fn of Object.values(posthog)) fn.mockClear();
  // `init` calls `loaded` at once, as PostHog does once it is ready.
  posthog.init.mockImplementation((_key: string, options: { loaded: () => void }) =>
    options.loaded(),
  );
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
});
afterEach(() => {
  vi.unstubAllEnvs();
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
});

describe("the PostHog loader (D124)", () => {
  it("starts opted out with no storage, through /ingest, with autocapture, replay and flags off", async () => {
    const { posthogOptions, uiHost } = await import("./loader");
    expect(posthogOptions(context)).toMatchObject({
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
    });
    expect(uiHost("https://us.i.posthog.com")).toBe("https://us.posthog.com");
    expect(uiHost("http://127.0.0.1:8971")).toBeUndefined();
    expect(posthogOptions({ ...context, host: "http://127.0.0.1:8971" })).not.toHaveProperty(
      "ui_host",
    );
  });

  it("starts once: market and locale on every event, opted in, the queue sent", async () => {
    const { track } = await import("./track");
    const { startAnalytics, LOADER_MARKER } = await import("./loader");
    track("product_viewed", { product_id: "prod_1" });
    startAnalytics(context);
    startAnalytics(context);
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init.mock.calls[0]?.[0]).toBe("phc_test");
    expect(posthog.register).toHaveBeenCalledWith({ market: "en-us", locale: "en-US" });
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith("product_viewed", { product_id: "prod_1" });
    expect(Reflect.get(window, "__shopblokAnalytics")).toBe(LOADER_MARKER);
  });

  it("stops at once on a withdrawal, clears PostHog's storage, and starts again on a new yes", async () => {
    const { track } = await import("./track");
    const { startAnalytics, stopAnalytics, distinctId } = await import("./loader");
    startAnalytics(context);
    document.cookie = "ph_phc_test_posthog=%7B%7D; Path=/";
    window.localStorage.setItem("ph_phc_test_posthog", "{}");
    stopAnalytics();
    expect(posthog.clear_opt_in_out_capturing).toHaveBeenCalledTimes(1);
    expect(document.cookie).not.toContain("ph_phc_test_posthog=%7B%7D");
    expect(window.localStorage.getItem("ph_phc_test_posthog")).toBeNull();
    expect(distinctId()).toBeNull();
    track("cart_viewed");
    expect(posthog.capture).not.toHaveBeenCalled();
    startAnalytics(context);
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(2);
  });

  it("identifies a customer by their Medusa id, and resets after a sign-out", async () => {
    const { startAnalytics, syncIdentity } = await import("./loader");
    syncIdentity("cus_1");
    expect(posthog.identify).not.toHaveBeenCalled();
    startAnalytics(context);
    syncIdentity("cus_1");
    expect(posthog.identify).toHaveBeenCalledWith("cus_1");
    // A guest who never signed in: nothing to reset.
    syncIdentity(null);
    expect(posthog.reset).not.toHaveBeenCalled();
    posthog.get_property.mockReturnValue("identified");
    syncIdentity(null);
    expect(posthog.reset).toHaveBeenCalledTimes(1);
    expect(posthog.register).toHaveBeenLastCalledWith({ market: "en-us", locale: "en-US" });
  });
});
