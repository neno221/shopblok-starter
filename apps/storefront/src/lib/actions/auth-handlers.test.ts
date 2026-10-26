// The auth actions (D64, T53): what they send to Medusa (the e-mail trimmed and in lower case, the
// market's prefix) and what the form is told for each answer of `medusa/customer.ts`. That module
// is a set of `vi.fn()` stand-ins and the market a fixed context; the cookies never come into it.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketContext } from "../market-context";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag }));

// The Medusa customer module and the market are stand-ins: these tests are about what the auth
// actions send to Medusa and what the form is told, not about the SDK (`customer.test.ts` covers
// that). `MedusaRequestError` is the real one, as `action()` tells its kinds apart.
const login = vi.fn();
const logout = vi.fn();
const register = vi.fn();
const requestPasswordReset = vi.fn();
const resendVerification = vi.fn();
const resetPassword = vi.fn();
vi.mock("../medusa/customer", () => ({
  login,
  logout,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
}));
const getMarketContext = vi.fn();
vi.mock("../market-context", () => ({ getMarketContext }));
vi.mock("../markets", () => ({ marketPrefix: () => "/de" }));

const { MedusaRequestError } = await import("../medusa/sdk");
const { authFormError, forgotAction, loginAction, resetAction } = await import("./auth-handlers");

const context = { market: { key: "en-de" }, map: {} } as unknown as MarketContext;

beforeEach(() => {
  vi.clearAllMocks();
  getMarketContext.mockResolvedValue(context);
});

describe("loginAction", () => {
  const credentials = { market: "en-de", email: "  Anna@Example.COM ", password: "secret" };

  it("trims and lower-cases the e-mail before Medusa sees it, and updates the cart tag", async () => {
    login.mockResolvedValue({ state: "signed-in" });
    expect(await loginAction(credentials)).toEqual({ ok: true, data: { state: "signed-in" } });
    expect(login).toHaveBeenCalledWith("anna@example.com", "secret", "/de");
    expect(updateTag).toHaveBeenCalledWith("cart");
  });

  it('is rejected with the reason "credentials" for a wrong password, which the form reads', async () => {
    login.mockResolvedValue({ state: "error", reason: "credentials" });
    const result = await loginAction(credentials);
    expect(result).toEqual({ ok: false, errors: {}, form: "rejected", reason: "credentials" });
    if (result.ok) throw new Error("expected a failure");
    expect(authFormError(result)).toBe("credentials");
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("answers the e-mail to check when Medusa wants the address verified", async () => {
    login.mockResolvedValue({ state: "verification-required", email: "anna@example.com" });
    expect(await loginAction(credentials)).toEqual({
      ok: true,
      data: { state: "check-email", email: "anna@example.com" },
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("is unavailable when Medusa cannot be asked, and rejected for an account kind it does not support", async () => {
    login.mockResolvedValue({ state: "error", reason: "unavailable" });
    expect(await loginAction(credentials)).toMatchObject({ ok: false, form: "unavailable" });
    login.mockResolvedValue({ state: "error", reason: "unsupported" });
    expect(await loginAction(credentials)).toMatchObject({ ok: false, form: "rejected" });
  });

  it("refuses an address that is not one, before asking Medusa", async () => {
    expect(await loginAction({ ...credentials, email: "anna" })).toMatchObject({
      ok: false,
      errors: { email: "pattern" },
    });
    expect(login).not.toHaveBeenCalled();
  });
});

describe("authFormError", () => {
  it("reads the two reasons the auth copy has, else the form's own error, else rejected", () => {
    expect(authFormError({ form: "rejected", reason: "exists" })).toBe("exists");
    expect(authFormError({ form: "unavailable", reason: "something else" })).toBe("unavailable");
    expect(authFormError({})).toBe("rejected");
  });
});

describe("forgotAction", () => {
  const forgot = { market: "en-de", email: "Anna@Example.com" };

  it("asks for the reset link with the lower-case e-mail and answers the address", async () => {
    expect(await forgotAction(forgot)).toEqual({ ok: true, data: { email: "anna@example.com" } });
    expect(requestPasswordReset).toHaveBeenCalledWith("anna@example.com", "/de");
  });

  it("answers the same when Medusa refuses, so it tells nobody which addresses have an account", async () => {
    requestPasswordReset.mockRejectedValue(new MedusaRequestError("no account", "rejected", 404));
    expect(await forgotAction(forgot)).toEqual({ ok: true, data: { email: "anna@example.com" } });
  });

  it("is unavailable when Medusa does not answer", async () => {
    requestPasswordReset.mockRejectedValue(new MedusaRequestError("down", "unreachable"));
    expect(await forgotAction(forgot)).toEqual({ ok: false, errors: {}, form: "unavailable" });
  });
});

describe("resetAction", () => {
  const reset = {
    market: "en-de",
    email: "anna@example.com",
    token: "tok",
    password: "a-long-password",
  };

  it("saves the new password with the link's token", async () => {
    expect(await resetAction(reset)).toEqual({ ok: true, data: { email: "anna@example.com" } });
    expect(resetPassword).toHaveBeenCalledWith("anna@example.com", "a-long-password", "tok");
  });

  it("answers not-found for a token Medusa rejects: the link has expired", async () => {
    resetPassword.mockRejectedValue(new MedusaRequestError("bad token", "rejected", 401));
    expect(await resetAction(reset)).toEqual({
      ok: false,
      errors: {},
      form: "not-found",
    });
  });

  it("is unavailable when Medusa does not answer, not expired", async () => {
    resetPassword.mockRejectedValue(new MedusaRequestError("down", "unreachable"));
    expect(await resetAction(reset)).toMatchObject({ ok: false, form: "unavailable" });
  });

  it("refuses a password shorter than the shop takes", async () => {
    expect(await resetAction({ ...reset, password: "short" })).toMatchObject({
      ok: false,
      errors: { password: "invalid" },
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
