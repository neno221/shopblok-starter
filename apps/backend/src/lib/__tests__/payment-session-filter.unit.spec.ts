import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { ACCESS_FIELD, paymentSessionFilter, targetOf } from "../payment-session-filter";

// M7 D144 (T109): the parts of the filter the integration spec cannot reach cheaply. The routes
// themselves are `integration-tests/http/payment-session-filter.spec.ts`.

describe("targetOf (D144)", () => {
  it("reads the cart, collection or order a path names", () => {
    expect(targetOf("POST", "/store/carts/cart_1/line-items", undefined)).toEqual({
      kind: "cart",
      id: "cart_1",
    });
    expect(
      targetOf("POST", "/store/payment-collections/pay_1/payment-sessions", undefined),
    ).toEqual({ kind: "collection", id: "pay_1" });
    expect(targetOf("GET", "/store/orders/order_1", undefined)).toEqual({
      kind: "order",
      id: "order_1",
    });
    expect(targetOf("POST", "/store/payment-collections", { cart_id: "cart_2" })).toEqual({
      kind: "cart",
      id: "cart_2",
    });
    expect(targetOf("GET", "/store/products/prod_1", undefined)).toBeUndefined();
  });

  it("matches the fixed segments in any case, as Medusa's router does, and keeps the id as written", () => {
    expect(targetOf("POST", "/store/Carts/cart_AbC/line-items", undefined)).toEqual({
      kind: "cart",
      id: "cart_AbC",
    });
    expect(targetOf("POST", "/STORE/CARTS/cart_1/LINE-ITEMS", undefined)).toEqual({
      kind: "cart",
      id: "cart_1",
    });
    expect(
      targetOf("POST", "/store/Payment-Collections/pay_1/payment-sessions", undefined),
    ).toEqual({ kind: "collection", id: "pay_1" });
    expect(targetOf("POST", "/store/PAYMENT-COLLECTIONS", { cart_id: "cart_3" })).toEqual({
      kind: "cart",
      id: "cart_3",
    });
    expect(targetOf("GET", "/store/Orders/order_1", undefined)).toEqual({
      kind: "order",
      id: "order_1",
    });
  });
});

describe("paymentSessionFilter's answer when the owner can't be read (D144)", () => {
  const cart = {
    cart: {
      id: "cart_1",
      payment_collection: {
        payment_sessions: [{ id: "ps_1", data: { client_secret: "pi_1_secret_x", id: "pi_1" } }],
      },
    },
  };

  async function answer(graph: () => Promise<unknown>): Promise<Record<string, unknown>> {
    const req = {
      method: "GET",
      originalUrl: "/store/carts/cart_1",
      url: "/store/carts/cart_1",
      headers: {},
      ip: "203.0.113.9",
      scope: { resolve: () => ({ graph }) },
    } as unknown as MedusaRequest;
    let sent: unknown;
    const done = new Promise<void>((resolve) => {
      const res = {
        json: (body: unknown) => {
          sent = body;
          resolve();
          return res;
        },
      } as unknown as MedusaResponse;
      void paymentSessionFilter(req, res, () => {
        res.json(cart);
      });
    });
    await done;
    return sent as Record<string, unknown>;
  }

  const sessionData = (body: Record<string, unknown>) =>
    (body.cart as { payment_collection: { payment_sessions: { data: object }[] } })
      .payment_collection.payment_sessions[0]!.data;

  it("keeps the secrets out and says no access when the lookup fails (not `other`)", async () => {
    const body = await answer(() => Promise.reject(new Error("pool exhausted")));
    expect(sessionData(body)).toEqual({ id: "pi_1" });
    expect(body.cart).not.toHaveProperty(ACCESS_FIELD);
  });

  it("does the same when the lookup finds no row", async () => {
    const body = await answer(() => Promise.resolve({ data: [] }));
    expect(sessionData(body)).toEqual({ id: "pi_1" });
    expect(body.cart).not.toHaveProperty(ACCESS_FIELD);
  });

  it("says `other` to a stranger on a customer's cart", async () => {
    const body = await answer(() =>
      Promise.resolve({
        data: [{ id: "cart_1", customer_id: "cus_1", customer: { has_account: true } }],
      }),
    );
    expect(sessionData(body)).toEqual({ id: "pi_1" });
    expect((body.cart as Record<string, unknown>)[ACCESS_FIELD]).toBe("other");
  });
});
