import {
  clientHeader,
  clientSignature,
  requestPath,
  SKEW_SECONDS,
  verifyClientHeader,
} from "../signature";

const SECRET = "test-signing-secret-0123456789abcdef";
const NOW = 1_764_170_000;
const call = { method: "POST", path: "/auth/customer/emailpass" };

describe("the signed address (D142)", () => {
  // The storefront's `client-signature.test.ts` checks the same vector, so the two copies agree.
  it("signs the version, the address, the time, the method and the path", () => {
    expect(
      clientSignature("vector-secret", {
        address: "203.0.113.7",
        time: 1_764_170_000,
        method: "post",
        path: "/store/carts/cart_1/complete",
      }),
    ).toBe("5bd5e694c290ba6dd227990c58be2ffe98853165c6d87b5f14d57cc9b1bb2d89");
  });

  it("takes a header signed for this call, and `server`", () => {
    for (const address of ["203.0.113.7", "2001:db8::1", "server"]) {
      const header = clientHeader(SECRET, { address, time: NOW, ...call });
      expect(verifyClientHeader(header, call, SECRET, NOW)).toEqual({ address });
    }
  });

  it("accepts 60 s of skew either way, and no more", () => {
    for (const offset of [-SKEW_SECONDS, SKEW_SECONDS]) {
      const header = clientHeader(SECRET, { address: "203.0.113.7", time: NOW + offset, ...call });
      expect(verifyClientHeader(header, call, SECRET, NOW)).toEqual({ address: "203.0.113.7" });
    }
    for (const offset of [-SKEW_SECONDS - 1, SKEW_SECONDS + 1]) {
      const header = clientHeader(SECRET, { address: "203.0.113.7", time: NOW + offset, ...call });
      expect(verifyClientHeader(header, call, SECRET, NOW)).toBeUndefined();
    }
  });

  it("refuses a header replayed on another path or method", () => {
    const header = clientHeader(SECRET, { address: "203.0.113.7", time: NOW, ...call });
    expect(
      verifyClientHeader(header, { method: "POST", path: "/auth/user/emailpass" }, SECRET, NOW),
    ).toBeUndefined();
    expect(verifyClientHeader(header, { ...call, method: "GET" }, SECRET, NOW)).toBeUndefined();
  });

  it("refuses another secret, a changed address, and every other shape", () => {
    const header = clientHeader(SECRET, { address: "203.0.113.7", time: NOW, ...call });
    expect(verifyClientHeader(header, call, "another-secret", NOW)).toBeUndefined();
    expect(
      verifyClientHeader(header.replace("203.0.113.7", "198.51.100.1"), call, SECRET, NOW),
    ).toBeUndefined();
    const signature = header.split(";")[3] ?? "";
    for (const bad of [
      undefined,
      "",
      `v2;203.0.113.7;${NOW};${signature}`,
      `v1;not-an-address;${NOW};${signature}`,
      `v1;203.0.113.7;${NOW};${signature.toUpperCase()}`,
      `v1;203.0.113.7;${NOW};${signature};extra`,
      `v1;203.0.113.7;soon;${signature}`,
      [header],
    ]) {
      expect(verifyClientHeader(bad, call, SECRET, NOW)).toBeUndefined();
    }
  });

  it("refuses everything without a secret", () => {
    const header = clientHeader(SECRET, { address: "203.0.113.7", time: NOW, ...call });
    expect(verifyClientHeader(header, call, undefined, NOW)).toBeUndefined();
    expect(verifyClientHeader(header, call, "  ", NOW)).toBeUndefined();
  });

  it("takes the path without its query string", () => {
    expect(requestPath("/store/products?fields=id&limit=2")).toBe("/store/products");
    expect(requestPath("/store/carts/cart_1/complete")).toBe("/store/carts/cart_1/complete");
    expect(requestPath("/x#y")).toBe("/x");
  });
});
