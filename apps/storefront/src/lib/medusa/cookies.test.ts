import { createHmac } from "node:crypto";
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

describe("the pending customer (signed, PR 81 review)", () => {
  beforeEach(() => vi.stubEnv("PAYLOAD_SECRET", "test-secret"));

  /** A value signed as `setPendingCustomer` signs one, for any body. */
  const sign = (body: string) => {
    const encoded = Buffer.from(body).toString("base64url");
    return `${encoded}.${createHmac("sha256", "test-secret").update(`pending:${encoded}`).digest("base64url")}`;
  };

  it("reads back what was written", async () => {
    await cookies.setPendingCustomer({ email: "a@example.com", firstName: "Άννα", sentAt: 5 });
    jar.reset({ _medusa_pending_customer: jar.writes[0]!.value });
    expect(await cookies.getPendingCustomer()).toEqual({
      email: "a@example.com",
      firstName: "Άννα",
      sentAt: 5,
    });
  });

  it("is null for an unsigned value, a forged signature, and an edited time", async () => {
    await cookies.setPendingCustomer({ email: "a@example.com", sentAt: Date.now() });
    const [body, signature] = jar.writes[0]!.value.split(".");
    const earlier = Buffer.from(JSON.stringify({ email: "a@example.com", sentAt: 0 })).toString(
      "base64url",
    );
    for (const value of [
      '{"email":"a@example.com","sentAt":0}',
      `${body}.forged`,
      `${earlier}.${signature}`,
    ]) {
      jar.reset({ _medusa_pending_customer: value });
      expect(await cookies.getPendingCustomer()).toBeNull();
    }
  });

  it("is null for a signed value that is not a registration", async () => {
    for (const body of ["not json", "null", '"text"', '{"firstName":"x"}', '{"email":""}']) {
      jar.reset({ _medusa_pending_customer: sign(body) });
      expect(await cookies.getPendingCustomer()).toBeNull();
    }
  });

  it("keeps only the fields it knows, as text", async () => {
    jar.reset({
      _medusa_pending_customer: sign('{"email":"a@example.com","lastName":7,"admin":true}'),
    });
    expect(await cookies.getPendingCustomer()).toEqual({ email: "a@example.com" });
  });

  it("writes nothing without a secret to sign with", async () => {
    vi.stubEnv("PAYLOAD_SECRET", " ");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await cookies.setPendingCustomer({ email: "a@example.com" });
    expect(jar.writes).toEqual([]);
    error.mockRestore();
  });
});

describe("the receipt (D65)", () => {
  beforeEach(() => vi.stubEnv("PAYLOAD_SECRET", "test-secret"));

  /** The signed value `setReceipt` wrote, for building forged ones from. */
  async function signed(orderId: string): Promise<string> {
    jar.reset();
    await cookies.setReceipt(orderId);
    return jar.writes[0]!.value;
  }

  it("is written as the order's id and its signature, httpOnly, lax, for 7 days, secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await cookies.setReceipt("order_1");
    expect(jar.writes).toMatchObject([
      {
        name: "_shopblok_receipt",
        value: expect.stringMatching(/^order_1\.[\w-]+$/) as unknown,
        options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604_800 },
      },
    ]);
  });

  it("reads back the id of a cookie this server signed", async () => {
    await cookies.setReceipt("order_1");
    expect(await cookies.getReceiptOrderId()).toBe("order_1");
  });

  it("is undefined for a forged signature, another order's signature and a malformed value", async () => {
    const [, signature] = (await signed("order_1")).split(".");
    for (const value of [
      "order_1.forged",
      `order_2.${signature}`,
      `order_1.${signature}x`,
      "order_1",
      ".nothing",
      "",
    ]) {
      jar.reset({ _shopblok_receipt: value });
      expect(await cookies.getReceiptOrderId()).toBeUndefined();
    }
  });

  it("is undefined when the secret changed since it was written", async () => {
    const value = await signed("order_1");
    vi.stubEnv("PAYLOAD_SECRET", "another-secret");
    jar.reset({ _shopblok_receipt: value });
    expect(await cookies.getReceiptOrderId()).toBeUndefined();
  });

  it("writes nothing without a secret to sign with", async () => {
    vi.stubEnv("PAYLOAD_SECRET", " ");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await cookies.setReceipt("order_1");
    expect(jar.writes).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("the flash (T52)", () => {
  it("is strict and lasts a minute", () => {
    expect(cookies.cookieAttributes("_shopblok_flash")).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      maxAge: 60,
    });
  });

  it("reads back what was written, and nothing when there is nothing", async () => {
    expect(await cookies.getFlash()).toBeUndefined();
    await cookies.setFlash('{"key":"k"}');
    expect(jar.writes[0]).toMatchObject({ name: "_shopblok_flash", options: { maxAge: 60 } });
    expect(await cookies.getFlash()).toBe('{"key":"k"}');
  });
});
