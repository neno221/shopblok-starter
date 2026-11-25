/**
 * T101 (M6 D119): saved payment methods, on the backend.
 *
 * - `GET`, `POST` and `DELETE :id` under `/store/customers/me/payment-methods`: no session answers
 *   401; each customer reaches only their own methods (another's is a 404 and stays saved).
 * - The session guard (`store/payment-sessions/guard.ts`) and `POST /store/carts/:id/payment-token`
 *   with a customer's session (PR 140's review, item 5): the cart's own signed-in customer's
 *   `setup_future_usage: "off_session"` and own saved `payment_method` pass; a guest's, another
 *   customer's method, and a guest checkout with an account's e-mail are refused, and that guest's
 *   card is not kept.
 *
 * The tests that reach Stripe need a test key (`STRIPE_API_KEY`, `sk_test_…`; CI's
 * `backend-integration` has it from GitHub's secrets) and skip themselves without it; the others
 * run with a stand-in key that registers the provider and is never sent.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http payment-methods.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import seedMarkets from "../../src/scripts/seed-markets";
import seedDemoCatalog from "../../src/scripts/seed-demo-catalog";
import { syncStripeRegions } from "../../src/lib/stripe-regions";
import { until } from "./search-locale.fixtures";

jest.setTimeout(240_000);

const SHELL_KEY = (process.env.STRIPE_API_KEY ?? "").trim();
const LIVE = /^sk_test_\w{16,}$/.test(SHELL_KEY);
process.env.STRIPE_API_KEY = LIVE ? SHELL_KEY : "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "ci-stand-in-webhook-secret";
const live = LIVE ? it : it.skip;
if (!LIVE)
  // eslint-disable-next-line no-console
  console.warn(
    "payment-methods.spec: STRIPE_API_KEY (a test key) is not set; the tests that call Stripe are skipped.",
  );

const STRIPE = "pp_stripe_stripe";
const RETURN_URL = "http://localhost:8000/api/payment-return";

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

type Notification = { to: string; template: string; data: Record<string, unknown> };
type Saved = { id: string; type: string; brand?: string; last4?: string };

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T101: saved payment methods (backend)", () => {
      let store: Record<string, string>;
      const anyStatus = { validateStatus: () => true };
      const as = (token?: string) => ({
        headers: { ...store, ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...anyStatus,
      });

      beforeEach(async () => {
        const container = getContainer();
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

      const mailTo = async (to: string, template: string) => {
        const notifications = getContainer().resolve(Modules.NOTIFICATION);
        const { value } = await until(
          async () =>
            (
              (await notifications.listNotifications(
                { to, template },
                { order: { created_at: "DESC" } },
              )) as unknown as Notification[]
            )[0],
          { what: `${template} to ${to}` },
        );
        return value;
      };

      const login = (email: string) =>
        api.post("/auth/customer/emailpass", { email, password: "secret-password-1" }, anyStatus);

      /** A verified customer's token and id, the way the storefront signs one up (T44's flow). */
      const signUp = async (email: string) => {
        await api.post(
          "/auth/customer/emailpass/register",
          { email, password: "secret-password-1" },
          anyStatus,
        );
        const restricted = (await login(email)).data.token as string;
        await api.post(
          "/auth/verification/request",
          { entity_id: email, entity_type: "email" },
          { headers: { authorization: `Bearer ${restricted}` }, ...anyStatus },
        );
        const code = (await mailTo(email, "customer-verification")).data.code as string;
        expect((await api.post("/auth/verification/confirm", { code }, anyStatus)).status).toBe(
          200,
        );
        const first = (await login(email)).data.token as string;
        const created = await api.post("/store/customers", { email }, as(first));
        expect(created.status).toBe(200);
        return {
          token: (await login(email)).data.token as string,
          id: created.data.customer.id as string,
        };
      };

      /**
       * A cart in Europe (EUR) with one line, an address and its shipping method, made with
       * `token`'s session (the cart is that customer's) or as a guest with `email`.
       */
      const readyCart = async (who: { token?: string; email?: string }) => {
        const { data: regions } = await api.get("/store/regions", { headers: store });
        const europe = regions.regions.find(
          (r: { currency_code: string }) => r.currency_code === "eur",
        );
        const { data: products } = await api.get(`/store/products?region_id=${europe.id}&limit=1`, {
          headers: store,
        });
        const variant = products.products[0].variants[0];
        const created = await api.post(
          "/store/carts",
          { region_id: europe.id, ...(who.email ? { email: who.email } : {}) },
          as(who.token),
        );
        const id = created.data.cart.id as string;
        await api.post(
          `/store/carts/${id}/line-items`,
          { variant_id: variant.id, quantity: 1 },
          as(who.token),
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
          as(who.token),
        );
        const { data: options } = await api.get(`/store/shipping-options?cart_id=${id}`, {
          headers: store,
        });
        await api.post(
          `/store/carts/${id}/shipping-methods`,
          { option_id: options.shipping_options[0].id },
          as(who.token),
        );
        const { data: collection } = await api.post(
          "/store/payment-collections",
          { cart_id: id },
          as(who.token),
        );
        return { id, collectionId: collection.payment_collection.id as string };
      };

      const session = (collectionId: string, body: Record<string, unknown>, token?: string) =>
        api.post(`/store/payment-collections/${collectionId}/payment-sessions`, body, as(token));

      const stripeSessionOf = (answer: { data: { payment_collection: unknown } }) =>
        (
          answer.data.payment_collection as {
            payment_sessions: { provider_id: string; data: Record<string, unknown> }[];
          }
        ).payment_sessions.find((s) => s.provider_id === STRIPE)!;

      const list = async (token: string) =>
        (await api.get("/store/customers/me/payment-methods", as(token))).data
          .payment_methods as Saved[];

      /** A card saved the way the account's "Add a payment method" saves one. */
      const saveCard = async (token: string, card = "pm_card_visa") => {
        const started = await api.post("/store/customers/me/payment-methods", {}, as(token));
        expect(started.status).toBe(200);
        const intent = started.data.setup_intent as { id: string; client_secret: string };
        expect(intent.client_secret).toMatch(/^seti_/);
        await stripeApi("POST", `setup_intents/${intent.id}/confirm`, {
          payment_method: card,
          return_url: RETURN_URL,
        });
        const saved = await list(token);
        expect(saved.length).toBeGreaterThan(0);
        return saved[0]!;
      };

      it("answers 401 without a customer's session", async () => {
        for (const answer of [
          await api.get("/store/customers/me/payment-methods", as()),
          await api.post("/store/customers/me/payment-methods", {}, as()),
          await api.delete("/store/customers/me/payment-methods/pm_123", as()),
        ])
          expect(answer.status).toBe(401);
      });

      it("lists nothing for a customer with no Stripe customer yet, without asking Stripe", async () => {
        const ada = await signUp("ada@example.com");
        const answer = await api.get("/store/customers/me/payment-methods", as(ada.token));
        expect([answer.status, answer.data.payment_methods]).toEqual([200, []]);
        const gone = await api.delete("/store/customers/me/payment-methods/pm_123", as(ada.token));
        expect(gone.status).toBe(404);
      });

      it("refuses a guest's saving and saved method, also on a guest checkout with an account's e-mail", async () => {
        const ada = await signUp("ada@example.com");
        // A guest's cart with a registered e-mail (SPEC §8.4's guest checkout of an account's address).
        const { id, collectionId } = await readyCart({ email: "ada@example.com" });
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY);
        const { data: carts } = await query.graph({
          entity: "cart",
          fields: ["customer_id"],
          filters: { id },
        });
        // Medusa 2.22.6 gives a guest cart a guest customer of its own (`findOrCreateCustomerStep`
        // with `hasAccount: false`), not the account with that e-mail: still not the caller's.
        expect(carts[0]?.customer_id).toEqual(expect.any(String));
        expect(carts[0]?.customer_id).not.toBe(ada.id);
        for (const body of [
          { provider_id: STRIPE, data: { setup_future_usage: "off_session" } },
          { provider_id: STRIPE, data: { payment_method: "pm_card_visa" } },
        ]) {
          const answer = await session(collectionId, body);
          expect([answer.status, answer.data.message]).toEqual([
            400,
            expect.stringMatching(/data refused: only the cart's signed-in customer/),
          ]);
        }
        const kept = await api.post(
          `/store/carts/${id}/payment-token`,
          { payment_method: "pm_123" },
          as(),
        );
        expect(kept.status).toBe(400);
        expect(kept.data.message).toMatch(/signed-in customer/);
      });

      live(
        "lets the cart's signed-in customer's setup_future_usage through the guard, and saves the card (PR 140 review, item 5)",
        async () => {
          const ada = await signUp("ada@example.com");
          const { id, collectionId } = await readyCart({ token: ada.token });
          // Saving at the checkout: the token says so, and only the cart's customer may.
          const token = await stripeApi<{ id: string }>(
            "POST",
            "test_helpers/confirmation_tokens",
            {
              payment_method: "pm_card_visa",
              setup_future_usage: "off_session",
            },
          );
          const kept = await api.post(
            `/store/carts/${id}/payment-token`,
            { token: token.id },
            as(ada.token),
          );
          expect([kept.status, kept.data.save]).toEqual([200, true]);
          const { data } = await api.get(`/store/carts/${id}?fields=metadata`, as(ada.token));
          expect(data.cart.metadata.stripe_setup_future_usage).toBe("off_session");

          const created = await session(
            collectionId,
            { provider_id: STRIPE, data: { setup_future_usage: "off_session" } },
            ada.token,
          );
          expect(created.status).toBe(200);
          const intent = stripeSessionOf(created).data;
          expect(intent.setup_future_usage).toBe("off_session");
          expect(intent.customer).toMatch(/^cus_/);
          const confirmed = await stripeApi<{ status: string }>(
            "POST",
            `payment_intents/${intent.id as string}/confirm`,
            { confirmation_token: token.id, return_url: RETURN_URL },
          );
          expect(confirmed.status).toBe("requires_capture");
          expect(await list(ada.token)).toEqual([
            expect.objectContaining({ type: "card", brand: "visa", last4: "4242" }),
          ]);
        },
      );

      live(
        "pays with a customer's own saved card, and no other customer reaches it (DELETE, the guard, the token route)",
        async () => {
          const ada = await signUp("ada@example.com");
          const bob = await signUp("bob@example.com");
          const card = await saveCard(ada.token);
          expect(card).toEqual(
            expect.objectContaining({ type: "card", brand: "visa", last4: "4242" }),
          );
          expect(Object.keys(card).sort()).toEqual(
            ["brand", "exp_month", "exp_year", "id", "last4", "type"].sort(),
          );

          // Bob cannot remove Ada's card: 404, and it stays saved.
          const removed = await api.delete(
            `/store/customers/me/payment-methods/${card.id}`,
            as(bob.token),
          );
          expect(removed.status).toBe(404);
          expect((await list(ada.token)).map((m) => m.id)).toContain(card.id);

          // Nor pay with it.
          const bobs = await readyCart({ token: bob.token });
          const refused = await session(
            bobs.collectionId,
            { provider_id: STRIPE, data: { payment_method: card.id } },
            bob.token,
          );
          expect([refused.status, refused.data.message]).toEqual([
            400,
            expect.stringMatching(/not one of the customer's saved methods/),
          ]);
          const notKept = await api.post(
            `/store/carts/${bobs.id}/payment-token`,
            { payment_method: card.id },
            as(bob.token),
          );
          expect(notKept.status).toBe(404);

          // Ada pays a second order with it.
          const adas = await readyCart({ token: ada.token });
          const kept = await api.post(
            `/store/carts/${adas.id}/payment-token`,
            { payment_method: card.id },
            as(ada.token),
          );
          expect(kept.data.preview).toEqual({ type: "card", brand: "visa", last4: "4242" });
          const { data } = await api.get(`/store/carts/${adas.id}?fields=metadata`, as(ada.token));
          expect(data.cart.metadata.stripe_payment_method).toBe(card.id);
          expect(data.cart.metadata.stripe_confirmation_token).toBeUndefined();
          const created = await session(
            adas.collectionId,
            { provider_id: STRIPE, data: { payment_method: card.id } },
            ada.token,
          );
          expect(created.status).toBe(200);
          const intent = stripeSessionOf(created).data;
          const method = intent.payment_method as string | { id: string };
          expect(typeof method === "string" ? method : method.id).toBe(card.id);
          const confirmed = await stripeApi<{ status: string }>(
            "POST",
            `payment_intents/${intent.id as string}/confirm`,
            { return_url: RETURN_URL },
          );
          expect(confirmed.status).toBe("requires_capture");
          const completed = await api.post(`/store/carts/${adas.id}/complete`, {}, as(ada.token));
          expect(completed.data.type).toBe("order");

          // Ada removes it.
          const gone = await api.delete(
            `/store/customers/me/payment-methods/${card.id}`,
            as(ada.token),
          );
          expect([gone.status, gone.data.deleted]).toEqual([200, true]);
          expect(await list(ada.token)).toEqual([]);
        },
      );

      live("keeps no card from a guest checkout with an account's e-mail", async () => {
        const ada = await signUp("ada@example.com");
        const { id, collectionId } = await readyCart({ email: "ada@example.com" });
        // A token that would save its card is refused for the guest…
        const saving = await stripeApi<{ id: string }>("POST", "test_helpers/confirmation_tokens", {
          payment_method: "pm_card_visa",
          setup_future_usage: "off_session",
        });
        const refused = await api.post(
          `/store/carts/${id}/payment-token`,
          { token: saving.id },
          as(),
        );
        expect(refused.status).toBe(400);
        expect(refused.data.message).toMatch(/only the cart's signed-in customer saves/);
        // …and the guest's payment has no Stripe customer, so the card is kept nowhere.
        const token = await stripeApi<{ id: string }>("POST", "test_helpers/confirmation_tokens", {
          payment_method: "pm_card_visa",
        });
        expect(
          (await api.post(`/store/carts/${id}/payment-token`, { token: token.id }, as())).status,
        ).toBe(200);
        const created = await session(collectionId, { provider_id: STRIPE });
        const intent = stripeSessionOf(created).data;
        expect(intent.customer ?? null).toBeNull();
        await stripeApi("POST", `payment_intents/${intent.id as string}/confirm`, {
          confirmation_token: token.id,
          return_url: RETURN_URL,
        });
        const completed = await api.post(`/store/carts/${id}/complete`, {}, as());
        expect(completed.data.type).toBe("order");
        expect(await list(ada.token)).toEqual([]);
      });
    });
  },
});
