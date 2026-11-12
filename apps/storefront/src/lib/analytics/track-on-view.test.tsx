// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M6 D124 (T97): a page's event, and `once` per tab, used up only when it is sent.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
});

async function mount(element: React.ReactNode) {
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(element));
  await act(async () => root.unmount());
}

describe("TrackOnView (D124)", () => {
  it("sends the event with its properties, and a `once` event once per tab", async () => {
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    const { attachSink } = await import("./track");
    const { TrackOnView } = await import("./track-on-view");
    const sink = vi.fn();
    attachSink(sink);
    await mount(<TrackOnView event="cart_viewed" properties={{ items: 2 }} />);
    await mount(<TrackOnView event="checkout_started" once="cart_1" />);
    await mount(<TrackOnView event="checkout_started" once="cart_1" />);
    await mount(<TrackOnView event="checkout_started" once="cart_2" />);
    expect(sink.mock.calls).toEqual([
      ["cart_viewed", { items: 2 }],
      ["checkout_started", {}],
      ["checkout_started", {}],
    ]);
  });

  it("does not use up `once` before consent", async () => {
    const { attachSink } = await import("./track");
    const { TrackOnView } = await import("./track-on-view");
    const sink = vi.fn();
    attachSink(sink);
    await mount(<TrackOnView event="checkout_started" once="cart_1" />);
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    await mount(<TrackOnView event="checkout_started" once="cart_1" />);
    expect(sink.mock.calls).toEqual([["checkout_started", {}]]);
  });

  it("sends one view however often the page draws it again with new properties (the cart's edits)", async () => {
    document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
    const { attachSink } = await import("./track");
    const { TrackOnView } = await import("./track-on-view");
    const sink = vi.fn();
    attachSink(sink);
    const root = createRoot(document.createElement("div"));
    for (const items of [2, 3, 1])
      await act(async () =>
        root.render(<TrackOnView event="cart_viewed" properties={{ items }} />),
      );
    // A new search is a new view: the page gives it a new key.
    for (const query of ["shirt", "shirt", "mug"])
      await act(async () =>
        root.render(<TrackOnView key={query} event="search_performed" properties={{ query }} />),
      );
    await act(async () => root.unmount());
    expect(sink.mock.calls).toEqual([
      ["cart_viewed", { items: 2 }],
      ["search_performed", { query: "shirt" }],
      ["search_performed", { query: "mug" }],
    ]);
  });
});
