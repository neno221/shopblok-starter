import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";
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
