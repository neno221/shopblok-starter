import { afterEach, describe, expect, it, vi } from "vitest";
import { NONCE_PLACEHOLDER } from "./csp";
import { staticCsp } from "./static-csp";

// M7 D139 (T107; PR 151's review, item 5): the build's frozen policies win; a missing nonce
// template is computed without replacing the frozen header and policy.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("staticCsp", () => {
  it("keeps all three frozen values", () => {
    vi.stubEnv("SHOPBLOK_CSP_HEADER", "Content-Security-Policy-Report-Only");
    vi.stubEnv("SHOPBLOK_CSP_POLICY", "default-src 'self'; frozen");
    vi.stubEnv("SHOPBLOK_CSP_NONCE_POLICY", `script-src 'nonce-${NONCE_PLACEHOLDER}'; frozen`);
    expect(staticCsp()).toEqual({
      header: "Content-Security-Policy-Report-Only",
      policy: "default-src 'self'; frozen",
      noncePolicy: `script-src 'nonce-${NONCE_PLACEHOLDER}'; frozen`,
    });
  });

  it("keeps the frozen header and policy when only the nonce template is missing", () => {
    vi.stubEnv("CSP_MODE", "");
    vi.stubEnv("SHOPBLOK_CSP_HEADER", "Content-Security-Policy-Report-Only");
    vi.stubEnv("SHOPBLOK_CSP_POLICY", "default-src 'self'; frozen");
    vi.stubEnv("SHOPBLOK_CSP_NONCE_POLICY", "");
    const csp = staticCsp();
    expect(csp.header).toBe("Content-Security-Policy-Report-Only");
    expect(csp.policy).toBe("default-src 'self'; frozen");
    expect(csp.noncePolicy).toContain(`'nonce-${NONCE_PLACEHOLDER}'`);
  });

  it("computes all three when nothing is frozen", () => {
    vi.stubEnv("SHOPBLOK_CSP_HEADER", "");
    vi.stubEnv("SHOPBLOK_CSP_POLICY", "");
    vi.stubEnv("SHOPBLOK_CSP_NONCE_POLICY", "");
    vi.stubEnv("CSP_MODE", "report-only");
    const csp = staticCsp();
    expect(csp.header).toBe("Content-Security-Policy-Report-Only");
    expect(csp.policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp.noncePolicy).toContain("'strict-dynamic'");
  });
});
