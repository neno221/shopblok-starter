// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Events from "../analytics/events";

// M6 D124 (T97, PR 138 review): the visitor is asked for once per page load and market, and again
// on the page an auth action redirected to (its mark), so PostHog follows a sign-in or sign-out
// and `signed_up` is sent there.
const path = vi.hoisted(() => ({ current: "/us/login" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));
const loadVisitor = vi.hoisted(() => vi.fn(async () => true));
vi.mock("./source", () => ({ loadVisitor }));
const trackSignedUp = vi.hoisted(() => vi.fn());
vi.mock("../analytics/events", async (actual) => ({
  ...(await actual<typeof Events>()),
  trackSignedUp,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  loadVisitor.mockClear();
  trackSignedUp.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("VisitorSource", () => {
  it("asks once per market, and again on the page an auth action left its mark for", async () => {
    const { VisitorSource } = await import("./visitor-source");
    const root = createRoot(document.createElement("div"));
    const draw = async (pathname: string, market = "en-us") => {
      path.current = pathname;
      await act(async () => root.render(<VisitorSource market={market} />));
    };
    await draw("/us/login");
    await draw("/us/store");
    expect(loadVisitor).toHaveBeenCalledTimes(1);
    // The sign-in's redirect: the mark is there on the page it lands on, and taken.
    document.cookie = "_shopblok_visitor_changed=1; Path=/";
    await draw("/us/account");
    expect(loadVisitor).toHaveBeenCalledTimes(2);
    expect(document.cookie).not.toContain("_shopblok_visitor_changed=1");
    await draw("/us/store");
    expect(loadVisitor).toHaveBeenCalledTimes(2);
    // Another market asks again, as before.
    await draw("/cy", "el-cy");
    expect(loadVisitor).toHaveBeenCalledTimes(3);
    await act(async () => root.unmount());
    expect(trackSignedUp).toHaveBeenCalledTimes(3);
  });
});
