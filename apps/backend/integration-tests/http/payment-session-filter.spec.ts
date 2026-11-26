/**
 * M7 D144 (T109): a cart's payment secrets go only to the cart's owner.
 *
 * - On a customer's cart, the owner's read has each session's `client_secret` and
 *   `payment_method`; anyone else's (another customer signed in, nobody, signed or not) has
 *   neither, and their writes (an address, a line, a payment collection, a session, completion, a
 *   transfer, our payment-token route) answer 403.
 * - On a guest's cart, an unsigned read has neither and a call signed by the storefront has both.
 * - Every route of `SESSION_ROUTES` is read here (the table below must name each one).
 *
 * The sessions are the system provider's (Stripe is left off, so nothing calls Stripe), with a
 * Stripe-shaped `data` written into them through the payment module, as Stripe's provider keeps a
 * PaymentIntent there. `stripe.spec.ts` and the storefront's checkout suites run the real thing.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http payment-session-filter.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import seedMarkets from "../../src/scripts/seed-markets";
import seedDemoCatalog from "../../src/scripts/seed-demo-catalog";
import { ACCESS_FIELD, SESSION_ROUTES } from "../../src/lib/payment-session-filter";
import { clientHeader } from "../../src/lib/rate-limit/signature";
import { until } from "./search-locale.fixtures";

jest.setTimeout(300_000);

// Stripe off: the system provider takes the sessions, and no call leaves the machine.
process.env.STRIPE_API_KEY = "";
process.env.STRIPE_WEBHOOK_SECRET = "";
process.env.STOREFRONT_URL = "http://localhost:8000";
const SECRET = "integration-test-signing-secret-0123456789";
process.env.STOREFRONT_SIGNING_SECRET = SECRET;

const SYSTEM = "pp_system_default";
/** What Stripe's provider keeps in a session's `data` (a PaymentIntent), cut to what matters. */
const INTENT = {
  id: "pi_test_123",
  client_secret: "pi_test_123_secret_abc",
  payment_method: "pm_card_visa_saved",
  status: "requires_confirmation",
  next_action: { use_stripe_sdk: { client_secret: "pi_test_123_secret_abc" } },
};

const anyStatus = { validateStatus: () => true };
const now = () => Math.floor(Date.now() / 1000);
const pathOf = (url: string) => url.split("?")[0]!;

type Notification = { to: string; template: string; data: Record<string, unknown> };
type Answer = { status: number; data: Record<string, unknown> };

/** Every `client_secret` and `payment_method` value anywhere in an answer. */
function secretsIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(secretsIn);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    (key === "client_secret" || key === "payment_method") && typeof inner === "string"
      ? [inner, ...secretsIn(inner)]
      : secretsIn(inner),
  );
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("D144: payment secrets only for the cart's owner", () => {
      let store: Record<string, string>;
      let serial = 0;

      /** Headers: the publishable key, a customer's token, and the storefront's signature. */
      const headers = (who: { token?: string; sign?: { method: string; url: string } }) => {
        serial += 1;
        return {
          ...store,
          ...(who.token ? { authorization: `Bearer ${who.token}` } : {}),
          ...(who.sign
            ? {
                "x-shopblok-client": clientHeader(SECRET, {
                  address: `198.51.100.${serial % 250}`,
                  time: now(),
                  method: who.sign.method,
                  path: pathOf(who.sign.url),
                }),
              }
            : {}),
        };
      };

      type Who = { token?: string; signed?: boolean };
      const call = (
        method: "GET" | "POST" | "DELETE",
        url: string,
        who: Who = {},
        body: object = {},
      ): Promise<Answer> => {
        const sent = {
          headers: headers({
            ...(who.token ? { token: who.token } : {}),
            ...(who.signed ? { sign: { method, url } } : {}),
          }),
          ...anyStatus,
        };
        if (method === "GET") return api.get(url, sent);
        if (method === "DELETE") return api.delete(url, { ...sent, data: body });
        return api.post(url, body, sent);
      };

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
        const created = await call("POST", "/store/customers", { token: first }, { email });
        expect(created.status).toBe(200);
        return {
          token: (await login(email)).data.token as string,
          id: (created.data.customer as { id: string }).id,
        };
      };

      /**
       * A cart in Europe with one line, an address, a shipping method and a payment session whose
       * `data` holds a PaymentIntent's secrets: `who`'s (a customer's when it has a token).
       */
      const readyCart = async (who: Who & { email?: string }) => {
        const { data: regions } = await api.get("/store/regions", { headers: store });
        const europe = regions.regions.find(
          (r: { currency_code: string }) => r.currency_code === "eur",
        );
        const { data: products } = await api.get(`/store/products?region_id=${europe.id}&limit=1`, {
          headers: store,
        });
        const variant = products.products[0].variants[0];
        const created = await call("POST", "/store/carts", who, {
          region_id: europe.id,
          ...(who.email ? { email: who.email } : {}),
        });
        expect(created.status).toBe(200);
        const id = (created.data.cart as { id: string }).id;
        expect(
          (
            await call("POST", `/store/carts/${id}/line-items`, who, {
              variant_id: variant.id,
              quantity: 1,
            })
          ).status,
        ).toBe(200);
        await call("POST", `/store/carts/${id}`, who, {
          shipping_address: {
            first_name: "Jonas",
            last_name: "Müller",
            address_1: "Hauptstraße 1",
            postal_code: "10115",
            city: "Berlin",
            country_code: "de",
          },
        });
        const { data: options } = await api.get(`/store/shipping-options?cart_id=${id}`, {
          headers: store,
        });
        await call("POST", `/store/carts/${id}/shipping-methods`, who, {
          option_id: options.shipping_options[0].id,
        });
        const collection = await call("POST", "/store/payment-collections", who, { cart_id: id });
        expect(collection.status).toBe(200);
        const collectionId = (collection.data.payment_collection as { id: string }).id;
        const session = await call(
          "POST",
          `/store/payment-collections/${collectionId}/payment-sessions`,
          who,
          { provider_id: SYSTEM },
        );
        expect(session.status).toBe(200);
        const sessionId = (
          session.data.payment_collection as { payment_sessions: { id: string }[] }
        ).payment_sessions[0]!.id;
        await keepIntent(sessionId);
        return { id, collectionId, sessionId };
      };

      /** Writes the PaymentIntent into a session's `data`, as Stripe's provider keeps it. */
      const keepIntent = async (sessionId: string) => {
        const payments = getContainer().resolve(Modules.PAYMENT) as unknown as {
          paymentSessionService_: { update(data: object): Promise<unknown> };
        };
        await payments.paymentSessionService_.update({ id: sessionId, data: INTENT });
      };

      const SESSION_FIELDS = "?fields=+payment_collection.payment_sessions.data";
      const readCart = (id: string, who: Who) =>
        call("GET", `/store/carts/${id}${SESSION_FIELDS}`, who);

      const expectSecrets = (answer: Answer) => {
        expect(answer.status).toBe(200);
        expect(secretsIn(answer.data)).toEqual(
          expect.arrayContaining([INTENT.client_secret, INTENT.payment_method]),
        );
      };
      const expectNoSecrets = (answer: Answer) => {
        expect(answer.status).toBeLessThan(500);
        expect(secretsIn(answer.data)).toEqual([]);
        expect(JSON.stringify(answer.data)).not.toContain(INTENT.client_secret);
      };

      it("gives a customer's cart's secrets to that customer only", async () => {
        const ada = await signUp("ada@example.com");
        const bob = await signUp("bob@example.com");
        const { id } = await readyCart({ token: ada.token });

        const own = await readCart(id, { token: ada.token });
        expectSecrets(own);
        expect((own.data.cart as Record<string, unknown>)[ACCESS_FIELD]).toBe("owner");
        // The session's other fields stay; only the two keys go.
        for (const who of [
          { token: bob.token },
          { token: bob.token, signed: true },
          {},
          { signed: true },
        ]) {
          const theirs = await readCart(id, who);
          expectNoSecrets(theirs);
          const cart = theirs.data.cart as {
            payment_collection: { payment_sessions: { data: Record<string, unknown> }[] };
          } & Record<string, unknown>;
          expect(cart[ACCESS_FIELD]).toBe("other");
          expect(cart.payment_collection.payment_sessions[0]!.data).toEqual({
            id: INTENT.id,
            status: INTENT.status,
            next_action: { use_stripe_sdk: {} },
          });
        }
      });

      it("answers 403 to every write to a customer's cart by anyone but that customer", async () => {
        const ada = await signUp("ada@example.com");
        const bob = await signUp("bob@example.com");
        const { id, collectionId, sessionId } = await readyCart({ token: ada.token });
        const { data } = await readCart(id, { token: ada.token });
        const line = (data.cart as { items: { id: string }[] }).items[0]!.id;
        const writes: [method: "POST" | "DELETE", url: string, body: object][] = [
          ["POST", `/store/carts/${id}`, { email: "eve@example.com" }],
          [
            "POST",
            `/store/carts/${id}`,
            { shipping_address: { first_name: "Eve", country_code: "de" } },
          ],
          ["POST", `/store/carts/${id}/line-items`, { variant_id: "variant_x", quantity: 1 }],
          ["POST", `/store/carts/${id}/line-items/${line}`, { quantity: 2 }],
          ["DELETE", `/store/carts/${id}/line-items/${line}`, {}],
          ["POST", `/store/carts/${id}/promotions`, { promo_codes: ["X"] }],
          ["POST", `/store/carts/${id}/shipping-methods`, { option_id: "so_x" }],
          ["POST", `/store/carts/${id}/taxes`, {}],
          ["POST", `/store/carts/${id}/customer`, {}],
          ["POST", `/store/carts/${id}/payment-token`, { payment_method: "pm_x" }],
          ["POST", "/store/payment-collections", { cart_id: id }],
          [
            "POST",
            `/store/payment-collections/${collectionId}/payment-sessions`,
            { provider_id: SYSTEM },
          ],
          ["POST", `/store/payment-collections/${collectionId}/payment-sessions/${sessionId}`, {}],
          ["POST", `/store/carts/${id}/complete`, {}],
        ];
        for (const who of [{ token: bob.token }, { signed: true }, {}]) {
          for (const [method, url, body] of writes) {
            const answer = await call(method, url, who, body);
            expect([method, url, answer.status]).toEqual([method, url, 403]);
          }
        }
        // Nothing changed: Ada's cart is hers, not completed, with one line and her e-mail.
        const after = await readCart(id, { token: ada.token });
        const cart = after.data.cart as {
          email: string;
          customer_id: string;
          completed_at: string | null;
          items: unknown[];
        };
        expect([cart.email, cart.customer_id, cart.completed_at, cart.items.length]).toEqual([
          "ada@example.com",
          ada.id,
          null,
          1,
        ]);
        // The owner's own write passes.
        expect(
          (await call("POST", `/store/carts/${id}/line-items/${line}`, ada, { quantity: 2 }))
            .status,
        ).toBe(200);
      });

      it("lets the owner complete their cart; nobody else can", async () => {
        const ada = await signUp("ada@example.com");
        const bob = await signUp("bob@example.com");
        const { id } = await readyCart({ token: ada.token });
        expect(
          (await call("POST", `/store/carts/${id}/complete`, { token: bob.token })).status,
        ).toBe(403);
        const done = await call("POST", `/store/carts/${id}/complete`, { token: ada.token });
        expect([done.status, done.data.type]).toEqual([200, "order"]);
      });

      it("gives a guest's cart's secrets only to a call the storefront signed", async () => {
        const { id } = await readyCart({ email: "guest@example.com", signed: true });

        const unsigned = await readCart(id, {});
        expectNoSecrets(unsigned);
        expect((unsigned.data.cart as Record<string, unknown>)[ACCESS_FIELD]).toBe("guest");
        const signedRead = await readCart(id, { signed: true });
        expectSecrets(signedRead);
        expect((signedRead.data.cart as Record<string, unknown>)[ACCESS_FIELD]).toBe("guest");
        // A signed-in customer who is not the guest reads it as anyone does: signed, both.
        const ada = await signUp("ada@example.com");
        expectNoSecrets(await readCart(id, { token: ada.token }));
        expectSecrets(await readCart(id, { token: ada.token, signed: true }));
        // A guest's cart takes writes from whoever holds its id, as before.
        expect(
          (await call("POST", `/store/carts/${id}`, {}, { email: "guest2@example.com" })).status,
        ).toBe(200);
      });

      it("filters every route of SESSION_ROUTES", async () => {
        const ada = await signUp("ada@example.com");
        const bob = await signUp("bob@example.com");
        const ready = await readyCart({ token: ada.token });
        const guest = await readyCart({ email: "guest@example.com", signed: true });
        const lineOf = async (id: string) =>
          (
            (await readCart(id, { signed: true, token: ada.token })).data.cart as {
              items: { id: string }[];
            }
          ).items[0]!.id;

        // For each route: the owner's (or the signed guest's) answer has the secrets, and the same
        // call by someone else has none (a read), or is refused (a write to a customer's cart).
        type Case = {
          owner: () => Promise<Answer>;
          other: () => Promise<Answer>;
          /** A route that never shows the secrets, whoever asks (the order list). */
          never?: true;
        };
        const reKeep = async <T>(answer: Promise<T>, sessionId = ready.sessionId) => {
          const out = await answer;
          await keepIntent(sessionId);
          return out;
        };
        const cases: Record<(typeof SESSION_ROUTES)[number], Case> = {
          "GET /store/carts/:id": {
            owner: () => readCart(ready.id, { token: ada.token }),
            other: () => readCart(ready.id, { token: bob.token }),
          },
          "POST /store/carts": {
            // A new cart has no session; the answer is filtered all the same.
            owner: async () => ({ status: 200, data: { cart: { skipped: true } } }),
            other: () => call("POST", `/store/carts${SESSION_FIELDS}`, {}, {}),
          },
          "POST /store/carts/:id": {
            owner: () =>
              call("POST", `/store/carts/${ready.id}${SESSION_FIELDS}`, ada, {
                metadata: { a: "1" },
              }),
            other: () =>
              call(
                "POST",
                `/store/carts/${guest.id}${SESSION_FIELDS}`,
                {},
                {
                  metadata: { a: "1" },
                },
              ),
          },
          "POST /store/carts/:id/line-items": {
            owner: async () =>
              reKeep(
                call(
                  "POST",
                  `/store/carts/${guest.id}/line-items${SESSION_FIELDS}`,
                  { signed: true },
                  {
                    variant_id: "missing",
                    quantity: 1,
                  },
                ),
                guest.sessionId,
              ).then(() => readCart(guest.id, { signed: true })),
            other: () =>
              call(
                "POST",
                `/store/carts/${guest.id}/line-items${SESSION_FIELDS}`,
                {},
                {
                  variant_id: "missing",
                  quantity: 1,
                },
              ),
          },
          "POST /store/carts/:id/line-items/:line_id": {
            owner: async () =>
              call(
                "POST",
                `/store/carts/${ready.id}/line-items/${await lineOf(ready.id)}${SESSION_FIELDS}`,
                ada,
                { quantity: 1 },
              ),
            other: async () =>
              call(
                "POST",
                `/store/carts/${guest.id}/line-items/${await lineOf(guest.id)}${SESSION_FIELDS}`,
                {},
                { quantity: 1 },
              ),
          },
          "DELETE /store/carts/:id/line-items/:line_id": {
            owner: async () => ({ status: 200, data: { skipped: true } }),
            other: async () =>
              call("DELETE", `/store/carts/${ready.id}/line-items/${await lineOf(ready.id)}`, {
                token: bob.token,
              }),
          },
          "POST /store/carts/:id/promotions": {
            owner: () =>
              call("POST", `/store/carts/${ready.id}/promotions${SESSION_FIELDS}`, ada, {
                promo_codes: [],
              }),
            other: () =>
              call(
                "POST",
                `/store/carts/${guest.id}/promotions${SESSION_FIELDS}`,
                {},
                {
                  promo_codes: [],
                },
              ),
          },
          "DELETE /store/carts/:id/promotions": {
            owner: () =>
              call("DELETE", `/store/carts/${ready.id}/promotions${SESSION_FIELDS}`, ada, {
                promo_codes: ["NONE"],
              }),
            other: () =>
              call(
                "DELETE",
                `/store/carts/${guest.id}/promotions${SESSION_FIELDS}`,
                {},
                {
                  promo_codes: ["NONE"],
                },
              ),
          },
          "POST /store/carts/:id/shipping-methods": {
            owner: () => readCart(ready.id, { token: ada.token }),
            other: () =>
              call("POST", `/store/carts/${ready.id}/shipping-methods`, {}, { option_id: "so" }),
          },
          "POST /store/carts/:id/taxes": {
            owner: () => call("POST", `/store/carts/${ready.id}/taxes${SESSION_FIELDS}`, ada),
            other: () => call("POST", `/store/carts/${guest.id}/taxes${SESSION_FIELDS}`, {}),
          },
          "POST /store/carts/:id/customer": {
            owner: () => call("POST", `/store/carts/${ready.id}/customer${SESSION_FIELDS}`, ada),
            other: () => call("POST", `/store/carts/${ready.id}/customer`, { token: bob.token }),
          },
          "POST /store/carts/:id/complete": {
            owner: async () => ({ status: 200, data: { skipped: true } }),
            other: () => call("POST", `/store/carts/${ready.id}/complete`, { signed: true }),
          },
          "POST /store/carts/:id/payment-token": {
            owner: async () => ({ status: 200, data: { skipped: true } }),
            other: () =>
              call(
                "POST",
                `/store/carts/${ready.id}/payment-token`,
                { token: bob.token },
                {
                  payment_method: "pm_x",
                },
              ),
          },
          "POST /store/payment-collections": {
            owner: () =>
              call("POST", `/store/payment-collections?fields=*payment_sessions`, ada, {
                cart_id: ready.id,
              }),
            other: () =>
              call(
                "POST",
                `/store/payment-collections?fields=*payment_sessions`,
                {},
                {
                  cart_id: guest.id,
                },
              ),
          },
          "POST /store/payment-collections/:id/payment-sessions": {
            owner: () => readCart(ready.id, { token: ada.token }),
            other: () =>
              call(
                "POST",
                `/store/payment-collections/${ready.collectionId}/payment-sessions`,
                {},
                { provider_id: SYSTEM },
              ),
          },
          "POST /store/payment-collections/:id/payment-sessions/:session_id": {
            owner: () => readCart(ready.id, { token: ada.token }),
            other: () =>
              call(
                "POST",
                `/store/payment-collections/${guest.collectionId}/payment-sessions/${guest.sessionId}`,
                {},
                {},
              ),
          },
          "GET /store/orders/:id": {
            owner: async () => ({ status: 200, data: { skipped: true } }),
            other: async () => ({ status: 200, data: { skipped: true } }),
          },
          "GET /store/orders": {
            owner: async () => ({ status: 200, data: { skipped: true } }),
            other: async () => ({ status: 200, data: { skipped: true } }),
            never: true,
          },
        };
        expect(Object.keys(cases).sort()).toEqual([...SESSION_ROUTES].sort());

        for (const [route, { owner, other }] of Object.entries(cases)) {
          const mine = await owner();
          if (!("skipped" in (mine.data.cart ?? mine.data))) {
            expect([route, mine.status]).toEqual([route, 200]);
            expect([route, secretsIn(mine.data).length > 0]).toEqual([route, true]);
          }
          const theirs = await other();
          if ("skipped" in theirs.data) continue;
          expect([route, secretsIn(theirs.data)]).toEqual([route, []]);
          await keepIntent(ready.sessionId);
          await keepIntent(guest.sessionId);
        }

        // The orders: the owner completes, the order's payment and session hold the intent.
        await keepIntent(ready.sessionId);
        const done = await call("POST", `/store/carts/${ready.id}/complete`, ada);
        expect(done.data.type).toBe("order");
        const orderId = (done.data.order as { id: string }).id;
        const payments = getContainer().resolve(Modules.PAYMENT) as unknown as {
          paymentService_: { update(data: object): Promise<unknown> };
          listPayments(filter: object): Promise<{ id: string }[]>;
        };
        const [payment] = await payments.listPayments({ payment_session_id: ready.sessionId });
        await payments.paymentService_.update({ id: payment!.id, data: INTENT });
        await keepIntent(ready.sessionId);
        const ORDER_FIELDS =
          "?fields=*payment_collections.payment_sessions,*payment_collections.payments";
        const ownOrder = await call("GET", `/store/orders/${orderId}${ORDER_FIELDS}`, ada);
        expectSecrets(ownOrder);
        expectNoSecrets(
          await call("GET", `/store/orders/${orderId}${ORDER_FIELDS}`, { token: bob.token }),
        );
        expectNoSecrets(await call("GET", `/store/orders/${orderId}${ORDER_FIELDS}`, {}));
        // The list never shows them, even to the owner: the storefront reads none there.
        const listed = await call("GET", `/store/orders${ORDER_FIELDS}`, ada);
        expect(listed.status).toBe(200);
        expect((listed.data.orders as unknown[]).length).toBe(1);
        expectNoSecrets(listed);
      });
    });
  },
});
