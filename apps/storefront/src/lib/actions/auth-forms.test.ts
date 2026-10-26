// The auth pages' forms (T53): `safeNext`, which keeps a sign-in on this host, and `loginForm`,
// which redirects with it. The handler (`loginAction`) is a stand-in that answers what the test
// needs; `next/navigation`'s `redirect` throws its URL as Next's does, and the flash is a stub.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect ${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));
const leaveFlash = vi.fn(async () => "key");
vi.mock("../flash", () => ({ leaveFlash }));
vi.mock("../market-context", () => ({
  getMarketContext: vi.fn(async () => ({ url: (path: string) => `/us${path}` })),
}));
// The sign-in itself is `auth-handlers.test.ts`'s: here the handler answers what the form needs.
const loginAction = vi.fn();
vi.mock("./auth-handlers", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("./auth-handlers")),
  loginAction,
}));
vi.mock("./cart-handlers", () => ({}));
vi.mock("./checkout-handlers", () => ({}));

const { loginForm, safeNext } = await import("./auth-forms");

const signIn = (next?: string) => {
  const data = new FormData();
  data.set("email", "anna@example.com");
  data.set("password", "secret");
  if (next !== undefined) data.set("next", next);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("safeNext (where a sign-in goes on to)", () => {
  const fallback = "/us/account";

  it("accepts a path of this host, with its query", () => {
    expect(safeNext("/us/account/orders?page=2", fallback)).toBe("/us/account/orders?page=2");
  });

  it("refuses a protocol-relative URL, a backslash host and an absolute URL", () => {
    for (const next of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com"])
      expect(safeNext(next, fallback)).toBe(fallback);
  });

  it("refuses whitespace and a backslash anywhere in the path", () => {
    for (const next of ["/ x", "/a b", "/a\tb", "/a\nb", "/a\\b"])
      expect(safeNext(next, fallback)).toBe(fallback);
  });

  it("refuses what is not a string, and a string over 512 characters", () => {
    for (const next of [undefined, null, 42, ["/a"], { path: "/a" }])
      expect(safeNext(next, fallback)).toBe(fallback);
    expect(safeNext(`/${"a".repeat(511)}`, fallback)).toBe(`/${"a".repeat(511)}`);
    expect(safeNext(`/${"a".repeat(512)}`, fallback)).toBe(fallback);
  });
});

describe("loginForm", () => {
  it("goes on to the page the form carried after a sign-in", async () => {
    loginAction.mockResolvedValue({ ok: true, data: { state: "signed-in" } });
    await expect(loginForm("en-us", signIn("/us/account/orders?page=2"))).rejects.toThrow(
      "redirect /us/account/orders?page=2",
    );
  });

  it("goes to the account, not to another host, when next is //evil.com", async () => {
    loginAction.mockResolvedValue({ ok: true, data: { state: "signed-in" } });
    await expect(loginForm("en-us", signIn("//evil.com"))).rejects.toThrow("redirect /us/account");
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/us/account");
  });

  it("goes to the e-mail to check when Medusa wants the address verified, whatever next says", async () => {
    loginAction.mockResolvedValue({
      ok: true,
      data: { state: "check-email", email: "anna@example.com" },
    });
    await expect(loginForm("en-us", signIn("/us/account/orders"))).rejects.toThrow(
      "redirect /us/verify",
    );
  });

  it("goes back to the login page with the error in a flash, typing the e-mail back but not the password", async () => {
    loginAction.mockResolvedValue({
      ok: false,
      errors: {},
      form: "rejected",
      message: "credentials",
    });
    await expect(loginForm("en-us", signIn("/us/account/orders"))).rejects.toThrow(
      "redirect /us/login?f=key",
    );
    expect(leaveFlash).toHaveBeenCalledWith("/us/login", {
      form: "credentials",
      errors: {},
      values: { email: "anna@example.com", next: "/us/account/orders" },
    });
  });
});
