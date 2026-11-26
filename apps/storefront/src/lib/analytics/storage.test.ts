// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPosthogStorage, hasPosthogStorage } from "./storage";

// M6 D123 (T97, PR 138 review): PostHog's leftovers found and removed, the shop's own kept, and a
// browser that blocks site data (`localStorage` throws) never breaks the page.
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  // An `Expires` in the past, not `Max-Age=0`: happy-dom expires a `Max-Age=0` cookie at `Date.now()`
  // and keeps it within that millisecond, so the next test could still see it.
  document.cookie = "ph_phc_test_posthog=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("PostHog's storage", () => {
  it("finds and removes PostHog's entries only", () => {
    localStorage.setItem("ph_phc_test_posthog", "{}");
    localStorage.setItem("shopblok:recent", "[]");
    sessionStorage.setItem("__ph_opt_in_out_phc_test", "1");
    document.cookie = "ph_phc_test_posthog=%7B%7D; Path=/";
    expect(hasPosthogStorage()).toBe(true);
    clearPosthogStorage();
    expect(hasPosthogStorage()).toBe(false);
    expect(localStorage.getItem("shopblok:recent")).toBe("[]");
    expect(document.cookie).not.toContain("ph_phc_test_posthog=%7B");
  });

  it("counts storage the browser refuses as none, and never throws", () => {
    const refuse = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    vi.spyOn(window, "localStorage", "get").mockImplementation(refuse);
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(refuse);
    expect(hasPosthogStorage()).toBe(false);
    expect(() => clearPosthogStorage()).not.toThrow();
  });
});
