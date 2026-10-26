/**
 * T53 (D64, SPEC §8.4 and §11.1): a signed-in customer claims a guest order by its number and its
 * e-mail, and the order's own address gets the link that accepts it; a return is only for the
 * customer's own order, and Medusa's open `POST /store/returns` is closed. SETUP.md, "Auth and
 * account (T53)", lists a mutation that fails each test.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http order-claims.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows";

import { until } from "./search-locale.fixtures";

jest.setTimeout(120_000);

const STOREFRONT_URL = "http://localhost:8000";
process.env.STOREFRONT_URL = STOREFRONT_URL;

type Notification = { to: string; template: string; data: Record<string, unknown> };

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T53: order claims and returns", () => {
      let storeHeaders: Record<string, string>;

      const anyStatus = { validateStatus: () => true };
      const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
      const asCustomer = (token: string) => ({
        headers: { ...storeHeaders, ...bearer(token) },
        ...anyStatus,
      });

      const mailTo = async (to: string, template: string) => {
        const notifications = getContainer().resolve(Modules.NOTIFICATION);
        const { value } = await until(
          async () => {
            const sent = (await notifications.listNotifications(
              { to, template },
              { order: { created_at: "DESC" } },
            )) as unknown as Notification[];

            return sent[0];
          },
          { what: `${template} to ${to}` },
        );

        return value;
      };

      const login = (email: string) =>
        api.post("/auth/customer/emailpass", { email, password: "secret-password-1" }, anyStatus);

      /** A verified customer's token, the way the storefront signs one up (T44's flow). */
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
          { headers: bearer(restricted), ...anyStatus },
        );
        const code = (await mailTo(email, "customer-verification")).data.code as string;

        expect((await api.post("/auth/verification/confirm", { code }, anyStatus)).status).toBe(200);
        const token = (await login(email)).data.token as string;

        expect((await api.post("/store/customers", { email }, asCustomer(token))).status).toBe(200);

        return (await login(email)).data.token as string;
      };

      /** An order placed with `email`, as a guest or by `customerId`. */
      const placeOrder = async (email: string, customerId?: string) => {
        const orders = getContainer().resolve(Modules.ORDER);
        const order = await orders.createOrders({
          email,
          ...(customerId ? { customer_id: customerId } : {}),
          currency_code: "usd",
          items: [{ title: "Tee", quantity: 2, unit_price: 25 }],
          shipping_address: { first_name: "Ada", last_name: "Lovelace", country_code: "us" },
        });

        return order as unknown as { id: string; display_id: number };
      };

      const claim = (token: string, body: Record<string, unknown>) =>
        api.post("/store/customers/me/order-transfers", body, asCustomer(token));

      beforeEach(async () => {
        const { result } = await createApiKeysWorkflow(getContainer()).run({
          input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
        });

        storeHeaders = { "x-publishable-api-key": result[0]!.token };
      });

      it("e-mails the order's address a link that moves the order to the customer who claimed it", async () => {
        const token = await signUp("ada@example.com");
        const order = await placeOrder("Guest.Ada@Example.com");

        // The number and the e-mail, typed in another case: the claim goes out.
        const claimed = await claim(token, {
          display_id: order.display_id,
          email: "guest.ada@example.com",
          market: "/us",
        });

        expect(claimed.status).toBe(200);
        expect(claimed.data.order).toEqual({ id: order.id, display_id: order.display_id });

        const mail = await mailTo("Guest.Ada@Example.com", "order-transfer-request");
        const url = new URL(mail.data.url as string);
        const [, , , id, , transferToken] = url.pathname.split("/");

        expect(`${url.origin}${url.pathname}`).toBe(
          `${STOREFRONT_URL}/us/order/${order.id}/transfer/${transferToken}`,
        );
        expect(id).toBe(order.id);

        const accepted = await api.post(
          `/store/orders/${order.id}/transfer/accept`,
          { token: transferToken },
          { headers: storeHeaders, ...anyStatus },
        );

        expect(accepted.status).toBe(200);

        const mine = await api.get("/store/orders", asCustomer(token));

        expect(mine.data.orders.map((each: { id: string }) => each.id)).toEqual([order.id]);
      });

      it("answers a number with another e-mail as it answers a number that does not exist", async () => {
        const token = await signUp("grace@example.com");
        const order = await placeOrder("guest.grace@example.com");

        const wrongEmail = await claim(token, {
          display_id: order.display_id,
          email: "someone@example.com",
        });
        const noOrder = await claim(token, { display_id: 999_999, email: "guest.grace@example.com" });

        expect(wrongEmail.status).toBe(404);
        expect(noOrder.status).toBe(404);
        expect(wrongEmail.data.message).toBe(noOrder.data.message);
      });

      it("refuses a claim from a visitor who is not signed in", async () => {
        const order = await placeOrder("guest.alan@example.com");
        const response = await api.post(
          "/store/customers/me/order-transfers",
          { display_id: order.display_id, email: "guest.alan@example.com" },
          { headers: storeHeaders, ...anyStatus },
        );

        expect(response.status).toBe(401);
      });

      it("takes a return only for the customer's own order, and closes Medusa's open route", async () => {
        const token = await signUp("hedy@example.com");
        const other = await placeOrder("someone.else@example.com", "cus_someone_else");
        const orders = getContainer().resolve(Modules.ORDER);
        const [line] = (await orders.retrieveOrder(other.id, { relations: ["items"] })).items ?? [];

        const refused = await api.post(
          "/store/customers/me/returns",
          { order_id: other.id, items: [{ id: line!.id, quantity: 1 }], reason_id: "rr_any" },
          asCustomer(token),
        );

        expect(refused.status).toBe(404);

        const open = await api.post(
          "/store/returns",
          {
            order_id: other.id,
            items: [{ id: line!.id, quantity: 1 }],
            return_shipping: { option_id: "so_any" },
          },
          { headers: storeHeaders, ...anyStatus },
        );

        expect(open.status).toBe(400);
        expect(open.data.message).toMatch(/customers\/me\/returns/);
      });
    });
  },
});
