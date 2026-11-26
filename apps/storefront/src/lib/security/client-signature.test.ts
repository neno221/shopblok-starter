import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_HEADER,
  clientHeader,
  clientSignature,
  e2eClientIpAllowed,
  signedClientHeader,
  visitorAddress,
} from "./client-signature";

const headersOf = (entries: Record<string, string>) => new Headers(entries);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("clientSignature (M7 D142)", () => {
  // The same vector as the backend's `signature.unit.spec.ts`: the two copies of the scheme agree.
  it("matches the backend's vector", () => {
    const input = {
      address: "203.0.113.7",
      time: 1764170000,
      method: "post",
      path: "/store/carts/cart_1/complete",
    };
    expect(clientSignature("vector-secret", input)).toBe(
      "5bd5e694c290ba6dd227990c58be2ffe98853165c6d87b5f14d57cc9b1bb2d89",
    );
    expect(clientHeader("vector-secret", input)).toBe(
      "v1;203.0.113.7;1764170000;5bd5e694c290ba6dd227990c58be2ffe98853165c6d87b5f14d57cc9b1bb2d89",
    );
  });

  it("binds the method and the path", () => {
    const base = { address: "203.0.113.7", time: 1764170000, method: "POST", path: "/store/carts" };
    const signature = clientSignature("s", base);
    expect(clientSignature("s", { ...base, method: "GET" })).not.toBe(signature);
    expect(clientSignature("s", { ...base, path: "/store/carts/x" })).not.toBe(signature);
    expect(clientSignature("s", { ...base, address: "203.0.113.8" })).not.toBe(signature);
  });
});

describe("visitorAddress (M7 D142)", () => {
  it("is 127.0.0.1 on a PC, whatever the request says", () => {
    expect(visitorAddress(headersOf({ "x-forwarded-for": "203.0.113.7" }), {})).toBe("127.0.0.1");
    expect(visitorAddress(headersOf({ "x-e2e-client-ip": "203.0.113.7" }), {})).toBe("127.0.0.1");
  });

  it("takes CI's test header only with E2E_TEST_ROUTES and no deployment", () => {
    const named = headersOf({ "x-e2e-client-ip": "203.0.113.7" });
    expect(visitorAddress(named, { E2E_TEST_ROUTES: "true" })).toBe("203.0.113.7");
    expect(
      visitorAddress(headersOf({ "x-e2e-client-ip": "nope" }), { E2E_TEST_ROUTES: "true" }),
    ).toBe("127.0.0.1");
    expect(e2eClientIpAllowed({ E2E_TEST_ROUTES: "true", DEPLOY_ENV: "staging" })).toBe(false);
    expect(visitorAddress(named, { E2E_TEST_ROUTES: "true", DEPLOY_ENV: "staging" })).toBe(
      "127.0.0.1",
    );
    expect(e2eClientIpAllowed({ E2E_TEST_ROUTES: "true", VERCEL_ENV: "preview" })).toBe(false);
  });

  it("on Vercel, what Vercel's edge saw: x-real-ip, then x-forwarded-for's first hop", () => {
    const vercel = { VERCEL_ENV: "production", E2E_TEST_ROUTES: "true" };
    expect(
      visitorAddress(
        headersOf({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }),
        vercel,
      ),
    ).toBe("203.0.113.7");
    expect(visitorAddress(headersOf({ "x-forwarded-for": "2001:db8::1, 10.0.0.1" }), vercel)).toBe(
      "2001:db8::1",
    );
    // The test header never counts there, and no address is no address.
    expect(visitorAddress(headersOf({ "x-e2e-client-ip": "203.0.113.7" }), vercel)).toBe(undefined);
  });
});

describe("signedClientHeader (M7 D142)", () => {
  it("is nothing without the secret", () => {
    expect(signedClientHeader({ method: "GET", path: "/store/regions" }, undefined, {})).toBe(
      undefined,
    );
  });

  it("signs a call with no visitor as `server`, and a visitor's for their address", () => {
    const source = { STOREFRONT_SIGNING_SECRET: "s" };
    const call = { method: "POST", path: "/shopblok/rate-limit" };
    const server = signedClientHeader(call, undefined, source)!.split(";");
    expect([server[0], server[1]]).toEqual(["v1", "server"]);
    expect(server[3]).toBe(
      clientSignature("s", { address: "server", time: Number(server[2]), ...call }),
    );
    const visitor = signedClientHeader(call, headersOf({}), source)!.split(";");
    expect(visitor[1]).toBe("127.0.0.1");
    expect(Math.abs(Number(visitor[2]) - Date.now() / 1000)).toBeLessThan(5);
    expect(CLIENT_HEADER).toBe("x-shopblok-client");
  });

  it("goes unsigned on Vercel when Vercel names no address", () => {
    const source = { STOREFRONT_SIGNING_SECRET: "s", VERCEL_ENV: "production" };
    expect(signedClientHeader({ method: "GET", path: "/store" }, headersOf({}), source)).toBe(
      undefined,
    );
  });
});
