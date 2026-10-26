import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";
import type { OrderLineDto } from "./orders";
import { PUBLISHABLE_KEY, stubMedusaFetch, type MedusaCall } from "../../test-support/medusa-fetch";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));

/** An order as the Store API answers it, owned by `customerId` (null for a guest's). */
const wireOrder = (customerId: string | null) => ({
  id: "order_1",
  display_id: 7,
  email: "guest@example.com",
  customer_id: customerId,
  currency_code: "eur",
  total: 25,
  items: [],
});

/** Medusa as the receipt meets it: any order by id to anyone, and `cus_1` behind the token. */
function medusa(order = wireOrder(null)) {
  return stubMedusaFetch((call: MedusaCall) => {
    const path = call.url.pathname;
    if (path === "/store/customers/me")
      return { body: { customer: { id: "cus_1", email: "anna@example.com" } } };
    if (path === "/store/orders/order_1") return { body: { order } };
    return { status: 404, body: { message: `no route ${path}` } };
  });
}

beforeEach(() => {
  vi.resetModules();
  jar.reset();
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
  vi.stubEnv("PAYLOAD_SECRET", "test-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getReceiptOrder (D65)", () => {
  it("is the order the browser's receipt cookie names, for a guest", async () => {
    const calls = medusa();
    const { setReceipt } = await import("./cookies");
    await setReceipt("order_1");
    const { getReceiptOrder } = await import("./orders");
    expect(await getReceiptOrder("order_1", "en-US")).toMatchObject({
      id: "order_1",
      displayId: 7,
      customerId: null,
    });
    expect(calls.find((call) => call.url.pathname === "/store/orders/order_1")).toBeDefined();
  });

  it("is the order of the signed-in customer who owns it, without a receipt", async () => {
    medusa(wireOrder("cus_1"));
    jar.reset({ _medusa_jwt: "jwt.token" });
    const { getReceiptOrder } = await import("./orders");
    expect(await getReceiptOrder("order_1")).toMatchObject({ id: "order_1", customerId: "cus_1" });
  });

  it("is null for a guest's order when the browser has no receipt for it, and asks Medusa nothing", async () => {
    const calls = medusa();
    const { getReceiptOrder } = await import("./orders");
    expect(await getReceiptOrder("order_1")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("is null for an order of another customer, signed in or not, and for a receipt that names another order", async () => {
    medusa(wireOrder("cus_other"));
    jar.reset({ _medusa_jwt: "jwt.token" });
    const { getReceiptOrder } = await import("./orders");
    expect(await getReceiptOrder("order_1")).toBeNull();

    // A guest order is not shown to a customer it does not belong to, either.
    medusa(wireOrder(null));
    expect(await getReceiptOrder("order_1")).toBeNull();

    // The receipt names order_2, not the one asked for.
    const { setReceipt } = await import("./cookies");
    jar.reset();
    await setReceipt("order_2");
    expect(await getReceiptOrder("order_1")).toBeNull();
  });

  it("is null when Medusa does not know the order", async () => {
    stubMedusaFetch(() => ({ status: 404, body: { message: "Order id not found" } }));
    const { setReceipt } = await import("./cookies");
    await setReceipt("order_1");
    const { getReceiptOrder } = await import("./orders");
    expect(await getReceiptOrder("order_1")).toBeNull();
  });
});

describe("returnableOf (T53)", () => {
  const line = (fields: Record<string, number>) =>
    ({ fulfilled: 0, returnRequested: 0, returnReceived: 0, ...fields }) as OrderLineDto;

  it("is what was packed and is not asked back or received back already", async () => {
    const { returnableOf } = await import("./orders");
    expect(returnableOf(line({ fulfilled: 3 }))).toBe(3);
    expect(returnableOf(line({ fulfilled: 3, returnRequested: 1 }))).toBe(2);
    expect(returnableOf(line({ fulfilled: 3, returnRequested: 1, returnReceived: 1 }))).toBe(1);
  });

  it("is nothing before it is packed, and never below zero", async () => {
    const { returnableOf } = await import("./orders");
    expect(returnableOf(line({}))).toBe(0);
    expect(returnableOf(line({ fulfilled: 1, returnRequested: 1, returnReceived: 1 }))).toBe(0);
  });
});

describe("listReturnReasons (T53)", () => {
  it("reads the store's reasons, with the id for a reason that has no label", async () => {
    const calls = stubMedusaFetch(() => ({
      body: {
        return_reasons: [
          { id: "rr_damaged", label: "Damaged" },
          { id: "rr_other", label: "" },
          { id: "rr_wrong" },
        ],
      },
    }));
    const { listReturnReasons } = await import("./orders");
    expect(await listReturnReasons()).toEqual([
      { id: "rr_damaged", label: "Damaged" },
      { id: "rr_other", label: "rr_other" },
      { id: "rr_wrong", label: "rr_wrong" },
    ]);
    expect(calls[0]?.url.pathname).toBe("/store/return-reasons");
  });
});

describe("createCustomerReturn (T53)", () => {
  const input = {
    orderId: "order_1",
    items: [{ id: "item_1", quantity: 2 }],
    reasonId: "rr_damaged",
    note: "Broke in the post",
  };

  it("posts the return to /store/customers/me/returns with the customer's token", async () => {
    const calls = stubMedusaFetch(() => ({ body: {} }));
    jar.reset({ _medusa_jwt: "jwt.token" });
    const { createCustomerReturn } = await import("./orders");
    await createCustomerReturn(input);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST" });
    expect(calls[0]?.url.pathname).toBe("/store/customers/me/returns");
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer jwt.token");
    expect(calls[0]?.body).toEqual({
      order_id: "order_1",
      items: [{ id: "item_1", quantity: 2 }],
      reason_id: "rr_damaged",
      note: "Broke in the post",
    });
  });

  it("leaves the note out when there is none", async () => {
    const calls = stubMedusaFetch(() => ({ body: {} }));
    jar.reset({ _medusa_jwt: "jwt.token" });
    const { createCustomerReturn } = await import("./orders");
    await createCustomerReturn({ ...input, note: undefined });
    expect(calls[0]?.body).not.toHaveProperty("note");
  });

  it("throws a 401 MedusaRequestError when nobody is signed in, and asks Medusa nothing", async () => {
    const calls = stubMedusaFetch(() => ({ body: {} }));
    const { createCustomerReturn } = await import("./orders");
    const { MedusaRequestError } = await import("./sdk");
    const failure = await createCustomerReturn(input).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(MedusaRequestError);
    expect(failure).toMatchObject({ kind: "rejected", status: 401 });
    expect(calls).toEqual([]);
  });
});

describe("claimOrder (T53, D64)", () => {
  it("posts the number, the e-mail and the market's prefix to /store/customers/me/order-transfers", async () => {
    const calls = stubMedusaFetch(() => ({ body: {} }));
    jar.reset({ _medusa_jwt: "jwt.token" });
    const { claimOrder } = await import("./orders");
    await claimOrder(1042, "anna@example.com", "/de");
    expect(calls[0]).toMatchObject({ method: "POST" });
    expect(calls[0]?.url.pathname).toBe("/store/customers/me/order-transfers");
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer jwt.token");
    expect(calls[0]?.body).toEqual({
      display_id: 1042,
      email: "anna@example.com",
      market: "/de",
    });
  });

  it("throws a 401 MedusaRequestError when nobody is signed in", async () => {
    const calls = stubMedusaFetch(() => ({ body: {} }));
    const { claimOrder } = await import("./orders");
    await expect(claimOrder(1042, "anna@example.com", "/de")).rejects.toMatchObject({
      kind: "rejected",
      status: 401,
    });
    expect(calls).toEqual([]);
  });

  it("passes on Medusa's 404 for a number and an e-mail that match no order", async () => {
    stubMedusaFetch(() => ({ status: 404, body: { message: "Order not found" } }));
    jar.reset({ _medusa_jwt: "jwt.token" });
    const { claimOrder } = await import("./orders");
    await expect(claimOrder(1042, "anna@example.com", "/de")).rejects.toMatchObject({
      kind: "rejected",
      status: 404,
    });
  });
});

describe("getOrderNumber (T53)", () => {
  it("is the order's number, asked without a token", async () => {
    const calls = medusa(wireOrder(null));
    const { getOrderNumber } = await import("./orders");
    expect(await getOrderNumber("order_1")).toBe(7);
    expect(calls[0]?.headers.get("authorization")).toBeNull();
  });

  it("is null for an order without a number", async () => {
    medusa({ ...wireOrder(null), display_id: 0 });
    const { getOrderNumber } = await import("./orders");
    expect(await getOrderNumber("order_1")).toBeNull();
  });

  it("is null when Medusa does not know the order", async () => {
    stubMedusaFetch(() => ({ status: 404, body: { message: "Order id not found" } }));
    const { getOrderNumber } = await import("./orders");
    expect(await getOrderNumber("order_1")).toBeNull();
  });
});
