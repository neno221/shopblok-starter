/**
 * T100 (M6 D117, D118): Stripe in the checkout, on the backend.
 *
 * - The guard: "Pay later" (`pp_system_default`) is refused on a total above zero while Stripe is
 *   on, and still completes a zero total (a 100% promotion on the lines and on the shipping).
 * - The session's `data`: only the keys the shop sends.
 * - The two-way region sync: Stripe on every region while it is registered, the system payment
 *   always.
 * - The webhook (`/hooks/payment/stripe_stripe`), signed with the stand-in secret: an event without
 *   Medusa's `session_id` changes nothing, and one with a bad signature neither.
 * - With a real test key (`STRIPE_API_KEY`, `sk_test_…`; CI's `backend-integration` gets it from
 *   GitHub's secrets, and skips these without it): a PaymentIntent authorised outside the shop and
 *   its signed `payment_intent.amount_capturable_updated` complete a cart nobody came back to; the
 *   shipment captures it (D118); and `POST /store/carts/:id/payment-token` keeps a ConfirmationToken's
 *   preview and refuses one a PaymentIntent used.
 *
 * Without a key the provider is registered with a stand-in (`sk_test_fake`, never sent: every test
 * that reaches Stripe is skipped), so the guard and the `data` check run on every machine.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http stripe.spec
 */
import { createHmac } from "node:crypto";

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createOrderFulfillmentWorkflow,
  createOrderShipmentWorkflow,
  createPromotionsWorkflow,
} from "@medusajs/medusa/core-flows";

import seedMarkets from "../../src/scripts/seed-markets";
import seedDemoCatalog from "../../src/scripts/seed-demo-catalog";
import { stripeRegistered, syncStripeRegions } from "../../src/lib/stripe-regions";
import { until } from "./search-locale.fixtures";

jest.setTimeout(240_000);

// A real test key from the shell (CI's secret), or a stand-in that registers the provider and is
// never sent. The webhook secret is the stand-in CI uses (D115), not `whsec_`-shaped.
const SHELL_KEY = (process.env.STRIPE_API_KEY ?? "").trim();
const LIVE = /^sk_test_\w{16,}$/.test(SHELL_KEY);
const WEBHOOK_SECRET = "ci-stand-in-webhook-secret";
process.env.STRIPE_API_KEY = LIVE ? SHELL_KEY : "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
const live = LIVE ? it : it.skip;
if (!LIVE)
  // eslint-disable-next-line no-console
  console.warn(
    "stripe.spec: STRIPE_API_KEY (a test key) is not set; the tests that call Stripe are skipped.",
  );

const STRIPE = "pp_stripe_stripe";
const SYSTEM = "pp_system_default";

/** Stripe's REST API with the test key (the provider's own client is not reachable from a test). */
async function stripeApi<T>(method: "GET" | "POST", path: string, form?: Record<string, string>) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${SHELL_KEY}`,
      ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
  });
  const body = (await response.json()) as T & { error?: { message: string } };
  if (!response.ok) throw new Error(`Stripe ${path}: ${body.error?.message ?? response.status}`);
  return body;
}

/** A webhook event signed as Stripe signs one (`t=…,v1=HMAC-SHA256(secret, "t.payload")`). */
function signed(event: unknown, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return { payload, header: `t=${t},v1=${v1}` };
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T100: Stripe in the checkout (backend)", () => {
      let store: Record<string, string>;
      const anyStatus = { validateStatus: () => true };

      beforeEach(async () => {
        const container = getContainer();
        // Medusa's `db:migrate` script makes the default shipping profile; the test runner's does not.
        const fulfillment = container.resolve(Modules.FULFILLMENT);
        if ((await fulfillment.listShippingProfiles({ type: "default" })).length === 0)
          await fulfillment.createShippingProfiles({
            name: "Default Shipping Profile",
            type: "default",
          });
        await seedMarkets({ container, args: [] } as never);
        await seedDemoCatalog({ container, args: [] } as never);
        await syncStripeRegions(container);
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: keys } = await query.graph({
          entity: "api_key",
          fields: ["token"],
          filters: { type: "publishable" },
        });
        store = { "x-publishable-api-key": keys[0]!.token };
      });

      /** A cart in Europe (EUR) with one line, an address in Germany and its shipping method. */
      const readyCart = async () => {
        const { data: regions } = await api.get("/store/regions", { headers: store });
        const europe = regions.regions.find(
          (r: { currency_code: string }) => r.currency_code === "eur",
        );
        const { data: products } = await api.get(`/store/products?region_id=${europe.id}&limit=1`, {
          headers: store,
        });
        const variant = products.products[0].variants[0];
        const { data: created } = await api.post(
          "/store/carts",
          { region_id: europe.id, email: "stripe@example.com" },
          { headers: store },
        );
        const id = created.cart.id as string;
        await api.post(
          `/store/carts/${id}/line-items`,
          { variant_id: variant.id, quantity: 1 },
          { headers: store },
        );
        await api.post(
          `/store/carts/${id}`,
          {
            shipping_address: {
              first_name: "Jonas",
              last_name: "Müller",
              address_1: "Hauptstraße 1",
              postal_code: "10115",
              city: "Berlin",
              country_code: "de",
            },
          },
          { headers: store },
        );
        const { data: options } = await api.get(`/store/shipping-options?cart_id=${id}`, {
          headers: store,
        });
        await api.post(
          `/store/carts/${id}/shipping-methods`,
          { option_id: options.shipping_options[0].id },
          { headers: store },
        );
        const { data: collection } = await api.post(
          "/store/payment-collections",
          { cart_id: id },
          { headers: store },
        );
        return { id, collection: collection.payment_collection as { id: string; amount: number } };
      };

      const session = (collectionId: string, body: Record<string, unknown>) =>
        api.post(`/store/payment-collections/${collectionId}/payment-sessions`, body, {
          headers: store,
          ...anyStatus,
        });

      const orderOf = async (cartId: string) => {
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY);
        const { data } = await query.graph({
          entity: "order_cart",
          fields: ["order_id"],
          filters: { cart_id: cartId },
        });
        return (data[0] as { order_id?: string } | undefined)?.order_id;
      };

      it("syncs Stripe onto every region beside the system payment, and changes nothing a second time", async () => {
        const container = getContainer();
        expect(await stripeRegistered(container)).toBe(true);
        const { data } = await api.get("/store/regions", { headers: store });
        for (const region of data.regions) {
          const { data: providers } = await api.get(
            `/store/payment-providers?region_id=${region.id}`,
            {
              headers: store,
            },
          );
          expect(providers.payment_providers.map((p: { id: string }) => p.id).sort()).toEqual([
            STRIPE,
            SYSTEM,
          ]);
        }
        expect((await syncStripeRegions(container)).changed).toEqual([]);
      });

      it("refuses Pay later on a total above zero while Stripe is on, so no unpaid order can be placed", async () => {
        const { id, collection } = await readyCart();
        expect(collection.amount).toBeGreaterThan(0);
        const refused = await session(collection.id, { provider_id: SYSTEM });
        // Completing goes first, so the guard's mutation (removed) fails on the unpaid order itself.
        const completed = await api.post(
          `/store/carts/${id}/complete`,
          {},
          { headers: store, ...anyStatus },
        );
        expect(await orderOf(id)).toBeUndefined();
        expect(completed.data.type).not.toBe("order");
        expect(refused.status).toBe(400);
        expect(refused.data.message).toMatch(/Pay later/);
      });

      it("completes a zero total (a 100% promotion) with Pay later", async () => {
        const container = getContainer();
        await createPromotionsWorkflow(container).run({
          input: {
            promotionsData: [
              {
                code: "FREE-ITEMS",
                type: "standard",
                status: "active",
                application_method: {
                  type: "percentage",
                  target_type: "items",
                  allocation: "across",
                  value: 100,
                  currency_code: "eur",
                },
              },
              {
                code: "FREE-SHIPPING",
                type: "standard",
                status: "active",
                application_method: {
                  type: "percentage",
                  target_type: "shipping_methods",
                  allocation: "across",
                  value: 100,
                  currency_code: "eur",
                },
              },
            ],
          } as never,
        });
        const { id } = await readyCart();
        const { data } = await api.post(
          `/store/carts/${id}/promotions`,
          { promo_codes: ["FREE-ITEMS", "FREE-SHIPPING"] },
          { headers: store },
        );
        expect(data.cart.total).toBe(0);
        const { data: collection } = await api.post(
          "/store/payment-collections",
          { cart_id: id },
          { headers: store },
        );
        const created = await session(collection.payment_collection.id, { provider_id: SYSTEM });
        expect(created.status).toBe(200);
        const completed = await api.post(`/store/carts/${id}/complete`, {}, { headers: store });
        expect(completed.data.type).toBe("order");
      });

      it("takes only the session data the shop sends", async () => {
        const { collection } = await readyCart();
        for (const data of [
          { capture_method: "automatic" },
          { confirm: true, payment_method: "pm_card_visa" },
          { setup_future_usage: "off_session" }, // a guest: never saved (D119)
          { payment_method: "pm_card_visa" }, // a guest: no saved method
        ]) {
          const answer = await session(collection.id, { provider_id: STRIPE, data });
          expect([answer.status, answer.data.message]).toEqual([
            400,
            expect.stringMatching(/data refused/),
          ]);
        }
        const system = await session(collection.id, { provider_id: SYSTEM, data: { anything: 1 } });
        expect(system.status).toBe(400);
      });

      it("the webhook ignores an event without Medusa's session id, and one with a bad signature", async () => {
        const { id } = await readyCart();
        const event = {
          id: "evt_test_1",
          object: "event",
          type: "payment_intent.amount_capturable_updated",
          data: {
            object: {
              id: "pi_test_1",
              object: "payment_intent",
              amount: 2500,
              amount_capturable: 2500,
              currency: "eur",
              status: "requires_capture",
              metadata: {},
            },
          },
        };
        const { payload, header } = signed(event);
        const answer = await api.post("/hooks/payment/stripe_stripe", payload, {
          headers: { "content-type": "application/json", "stripe-signature": header },
          ...anyStatus,
        });
        expect(answer.status).toBe(200);
        const forged = signed(event, "not-the-secret");
        const refused = await api.post("/hooks/payment/stripe_stripe", forged.payload, {
          headers: { "content-type": "application/json", "stripe-signature": forged.header },
          ...anyStatus,
        });
        expect(refused.status).toBeLessThan(500);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(await orderOf(id)).toBeUndefined();
      });

      live(
        "a signed amount_capturable_updated completes a cart nobody came back to; the shipment captures it",
        async () => {
          const { id, collection } = await readyCart();
          const created = await session(collection.id, { provider_id: STRIPE });
          expect(created.status).toBe(200);
          const stripeSession = created.data.payment_collection.payment_sessions.find(
            (s: { provider_id: string }) => s.provider_id === STRIPE,
          );
          const intentId = stripeSession.data.id as string;
          expect(stripeSession.data.capture_method).toBe("manual");

          // The shopper confirms in the browser and never comes back.
          await stripeApi("POST", `payment_intents/${intentId}/confirm`, {
            payment_method: "pm_card_visa",
            return_url: "http://localhost:8000/api/payment-return",
          });
          const intent = await stripeApi<Record<string, unknown>>(
            "GET",
            `payment_intents/${intentId}`,
          );
          expect(intent.status).toBe("requires_capture");
          const { payload, header } = signed({
            id: "evt_test_2",
            object: "event",
            type: "payment_intent.amount_capturable_updated",
            data: { object: intent },
          });
          const answer = await api.post("/hooks/payment/stripe_stripe", payload, {
            headers: { "content-type": "application/json", "stripe-signature": header },
          });
          expect(answer.status).toBe(200);
          const { value: orderId } = await until(() => orderOf(id), {
            what: "the order from the webhook",
          });

          // Completing again (the shopper comes back after all) returns the same order.
          const again = await api.post(`/store/carts/${id}/complete`, {}, { headers: store });
          expect(again.data.order.id).toBe(orderId);

          // D118: shipped, so captured.
          const container = getContainer();
          const query = container.resolve(ContainerRegistrationKeys.QUERY);
          const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "items.id", "items.quantity", "payment_collections.payments.id"],
            filters: { id: orderId },
          });
          const order = orders[0] as unknown as {
            items: { id: string; quantity: number }[];
            payment_collections: { payments: { id: string }[] }[];
          };
          const items = order.items.map((item) => ({ id: item.id, quantity: item.quantity }));
          const { result: fulfillment } = await createOrderFulfillmentWorkflow(container).run({
            input: { order_id: orderId, items },
          });
          await createOrderShipmentWorkflow(container).run({
            input: { order_id: orderId, fulfillment_id: fulfillment.id, items },
          });
          const paymentId = order.payment_collections[0]!.payments[0]!.id;
          await until(
            async () => {
              const payment = await container.resolve(Modules.PAYMENT).retrievePayment(paymentId);
              return payment.captured_at ? payment : undefined;
            },
            { what: "the capture on shipment" },
          );
          const captured = await stripeApi<{ status: string }>(
            "GET",
            `payment_intents/${intentId}`,
          );
          expect(captured.status).toBe("succeeded");
        },
      );

      live(
        "keeps a ConfirmationToken's preview on the cart, and refuses one a PaymentIntent used",
        async () => {
          const { id } = await readyCart();
          const token = await stripeApi<{ id: string }>(
            "POST",
            "test_helpers/confirmation_tokens",
            {
              payment_method: "pm_card_visa",
            },
          );
          const kept = await api.post(
            `/store/carts/${id}/payment-token`,
            { token: token.id },
            { headers: store },
          );
          expect(kept.data.preview).toEqual({ type: "card", brand: "visa", last4: "4242" });
          const { data } = await api.get(`/store/carts/${id}?fields=metadata`, { headers: store });
          expect(data.cart.metadata.stripe_confirmation_token).toBe(token.id);

          await stripeApi("POST", "payment_intents", {
            amount: "1000",
            currency: "eur",
            confirm: "true",
            capture_method: "manual",
            confirmation_token: token.id,
            return_url: "http://localhost:8000/api/payment-return",
          });
          const used = await api.post(
            `/store/carts/${id}/payment-token`,
            { token: token.id },
            {
              headers: store,
              ...anyStatus,
            },
          );
          expect(used.status).toBe(400);
          expect(used.data.message).toMatch(/used already/);
        },
      );
    });
  },
});
