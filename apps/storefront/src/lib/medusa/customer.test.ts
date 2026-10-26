import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";
import { PUBLISHABLE_KEY, stubMedusaFetch, type MedusaCall } from "../../test-support/medusa-fetch";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));

/** Medusa for a customer who exists already; `transfer` is what moving the guest cart answers. */
function medusa(transfer: { status: number; body: unknown }) {
  return stubMedusaFetch((call: MedusaCall) => {
    const path = call.url.pathname;
    if (path === "/auth/customer/emailpass") return { body: { token: "jwt_1" } };
    if (path === "/store/customers/me")
      return { body: { customer: { id: "cus_1", email: "anna@example.com" } } };
    if (path === "/store/carts/cart_1/customer") return transfer;
    return { status: 404, body: { message: `no route ${path}` } };
  });
}

beforeEach(() => {
  vi.resetModules();
  jar.reset({ _medusa_cart_id: "cart_1" });
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("login (D64)", () => {
  it("signs in and moves the guest cart to the customer", async () => {
    const calls = medusa({ status: 200, body: { cart: { id: "cart_1" } } });
    const { login } = await import("./customer");
    expect(await login("anna@example.com", "secret", "")).toEqual({ state: "signed-in" });
    expect(jar.values.get("_medusa_jwt")).toBe("jwt_1");
    expect(jar.values.get("_medusa_cart_id")).toBe("cart_1");
    expect(calls.some((call) => call.url.pathname === "/store/carts/cart_1/customer")).toBe(true);
  });

  it("is still signed in when Medusa will not move the guest cart, which is dropped (PR 73 review)", async () => {
    medusa({ status: 400, body: { message: "Cannot transfer cart to a different customer" } });
    const { login } = await import("./customer");
    expect(await login("anna@example.com", "secret", "")).toEqual({ state: "signed-in" });
    expect(jar.values.get("_medusa_jwt")).toBe("jwt_1");
    expect(jar.values.has("_medusa_cart_id")).toBe(false);
  });
});

describe("the verification link on an unverified sign-in (PR 81 review, item 6)", () => {
  /** Medusa for an identity whose e-mail is not verified: the customer cannot be created yet. */
  function unverified() {
    return stubMedusaFetch((call: MedusaCall) => {
      const path = call.url.pathname;
      if (path === "/auth/customer/emailpass") return { body: { token: "restricted_1" } };
      if (path === "/store/customers/me") return { status: 401, body: { message: "no customer" } };
      if (path === "/store/customers") return { status: 403, body: { message: "not verified" } };
      if (path === "/auth/verification/request") return { body: {} };
      return { status: 404, body: { message: `no route ${path}` } };
    });
  }

  /** Carries the cookies a response wrote into the next request, as a browser would. */
  const nextRequest = () => jar.reset(Object.fromEntries(jar.values));

  beforeEach(() => vi.stubEnv("PAYLOAD_SECRET", "test-secret"));
  afterEach(() => vi.useRealTimers());

  it("sends a link once within the wait, however often the sign-in is tried, and again after it", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-26T12:00:00Z"), toFake: ["Date"] });
    const calls = unverified();
    const { login, RESEND_WAIT_MS } = await import("./customer");
    const sent = () =>
      calls.filter((call) => call.url.pathname === "/auth/verification/request").length;
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(await login("anna@example.com", "secret", "/us")).toMatchObject({
        state: "verification-required",
      });
      nextRequest();
    }
    expect(sent()).toBe(1);
    expect(jar.values.has("_medusa_jwt")).toBe(false);
    vi.setSystemTime(Date.now() + RESEND_WAIT_MS);
    await login("anna@example.com", "secret", "/us");
    expect(sent()).toBe(2);
  });
});
