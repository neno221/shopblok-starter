import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));

const cookies = await import("./cookies");

beforeEach(() => jar.reset());
afterEach(() => vi.unstubAllEnvs());

describe("getAuthHeaders (SPEC §8.2's fix)", () => {
  it("is undefined when nobody is signed in, never an empty object (dtc-starter's {} was truthy)", async () => {
    expect(await cookies.getAuthHeaders()).toBeUndefined();
    jar.reset({ _medusa_jwt: "" });
    expect(await cookies.getAuthHeaders()).toBeUndefined();
  });

  it("is the bearer token when there is one", async () => {
    jar.reset({ _medusa_jwt: "jwt.token" });
    expect(await cookies.getAuthHeaders()).toEqual({ authorization: "Bearer jwt.token" });
  });
});

describe("the cookies' attributes (D60)", () => {
  it("sets the JWT and the cart httpOnly, lax, for 7 days, secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await cookies.setAuthToken("t");
    await cookies.setCartId("cart_1");
    expect(jar.writes).toEqual([
      {
        name: "_medusa_jwt",
        value: "t",
        options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604_800 },
      },
      {
        name: "_medusa_cart_id",
        value: "cart_1",
        options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604_800 },
      },
    ]);
  });

  it("is not secure in development, where next dev serves http", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await cookies.setCartId("cart_1");
    expect(jar.writes[0]?.options.secure).toBe(false);
  });

  it("keeps the pending registration strict for a day, and the market choice lax for a year", () => {
    expect(cookies.cookieAttributes("_medusa_pending_customer")).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      maxAge: 86_400,
    });
    expect(cookies.cookieAttributes("_shopblok_market")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 31_536_000,
    });
  });

  it("clears a cookie with the same attributes and no life left", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    await cookies.removeCartId();
    expect(jar.writes[0]).toMatchObject({
      name: "_medusa_cart_id",
      value: "",
      options: { maxAge: 0, path: "/" },
    });
    expect(await cookies.getCartId()).toBeUndefined();
  });
});

describe("the pending customer", () => {
  it("reads back what was written", async () => {
    await cookies.setPendingCustomer({ email: "a@example.com", firstName: "Άννα" });
    expect(await cookies.getPendingCustomer()).toEqual({
      email: "a@example.com",
      firstName: "Άννα",
    });
  });

  it("is null for a value that is not a registration (tampered, or another app's)", async () => {
    for (const value of ["not json", "null", '"text"', '{"firstName":"x"}', '{"email":""}']) {
      jar.reset({ _medusa_pending_customer: value });
      expect(await cookies.getPendingCustomer()).toBeNull();
    }
  });

  it("keeps only the fields it knows, as text", async () => {
    jar.reset({ _medusa_pending_customer: '{"email":"a@example.com","lastName":7,"admin":true}' });
    expect(await cookies.getPendingCustomer()).toEqual({ email: "a@example.com" });
  });
});
