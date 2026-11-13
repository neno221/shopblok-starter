// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M6 D124 (T97): `track()` sends nothing without a key or without consent, at the moment of the
// call. The mutation "send without consent" fails here.
const given = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
const refused = "_shopblok_consent=v1.0.0.2026-11-12; Path=/";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
});

describe("track() (D124)", () => {
  it("sends nothing without consent, nor once it is withdrawn", async () => {
    const { attachSink, track } = await import("./track");
    const sink = vi.fn();
    attachSink(sink);
    track("cart_viewed");
    document.cookie = refused;
    track("cart_viewed");
    expect(sink).not.toHaveBeenCalled();
  });

  it("sends nothing in a build without a key, even with consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    document.cookie = given;
    const { attachSink, track } = await import("./track");
    const sink = vi.fn();
    attachSink(sink);
    track("cart_viewed");
    expect(sink).not.toHaveBeenCalled();
  });

  it("with consent, holds events until the loader takes them, then sends at once", async () => {
    document.cookie = given;
    const { attachSink, detachSink, track, QUEUE_LIMIT } = await import("./track");
    for (let index = 0; index < QUEUE_LIMIT + 5; index++) track("product_viewed", { index });
    const sink = vi.fn();
    attachSink(sink);
    expect(sink).toHaveBeenCalledTimes(QUEUE_LIMIT);
    expect(sink.mock.calls[0]).toEqual(["product_viewed", { index: 0 }]);
    track("cart_viewed", { items: 2 });
    expect(sink).toHaveBeenLastCalledWith("cart_viewed", { items: 2 });
    detachSink();
    track("cart_viewed");
    expect(sink).toHaveBeenCalledTimes(QUEUE_LIMIT + 1);
  });

  it("drops what waited when consent is withdrawn before the loader came", async () => {
    document.cookie = given;
    const { attachSink, track } = await import("./track");
    track("product_viewed");
    document.cookie = refused;
    track("product_viewed");
    document.cookie = given;
    const sink = vi.fn();
    attachSink(sink);
    expect(sink).not.toHaveBeenCalled();
  });
});
