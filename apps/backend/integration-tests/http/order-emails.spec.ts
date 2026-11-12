/**
 * T99 (D122, SPEC §6.2): the e-mails M6 adds, one test per subscriber, each holding the event's
 * name and payload on Medusa 2.22.6 to the e-mail it sends: the notification's template, its
 * recipient, its link (the market and the page) and the content `@shopblok/emails` laid out (the
 * subject and the HTML in the order's language, the order's lines and sums). Where a workflow is
 * cheap to run here it is the real one (a customer signing up, an admin invite, an admin's password
 * reset, an order canceled); the order, shipment, return and refund events are emitted with the
 * payload Medusa documents for them, on records the test makes. One fake server stands in for
 * Payload (the copy in the language asked for, from the seed's `templates.json`) and for Resend (it
 * records each e-mail), so the test reads the language the copy was asked in and the e-mail as it
 * would leave. SETUP.md, "Order e-mails and the newsletter (T99)", lists a mutation that fails each
 * test.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http order-emails.spec
 */
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  cancelOrderWorkflow,
  createApiKeysWorkflow,
  createInvitesWorkflow,
} from "@medusajs/medusa/core-flows";

import { until } from "./search-locale.fixtures";

jest.setTimeout(120_000);

const STOREFRONT_URL = "http://localhost:8000";
const BACKEND_URL = "http://localhost:9000";
process.env.STOREFRONT_URL = STOREFRONT_URL;
process.env.MEDUSA_BACKEND_URL = BACKEND_URL;

// The modules read these when the app loads, before any test: one fake on a fixed port is both
// Payload (the `payload` module, D84) and Resend (the `resend` provider, D121). The key is a
// stand-in, not a Resend key's shape (`pnpm check:keys`).
const PORT = 39873;
const FAKE = `http://127.0.0.1:${PORT}`;
const PAYLOAD_KEY = "test-copy-key";
process.env.PAYLOAD_SERVER_URL = FAKE;
process.env.PAYLOAD_API_KEY = PAYLOAD_KEY;
process.env.RESEND_API_KEY = "fake-resend-key-for-tests";
process.env.RESEND_FROM_EMAIL = "Shop <shop@example.com>";
process.env.RESEND_BASE_URL = FAKE;

type SeedCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: string[];
  cta: string;
};
const seed = JSON.parse(
  readFileSync(require.resolve("@shopblok/fixtures/email/templates.json"), "utf8"),
) as { templates: Record<string, Record<string, SeedCopy>> };

type Sent = { to: string[]; subject: string; html: string; text: string };

/** Payload's `email-templates` in the locale asked for (or none), and Resend's `POST /emails`. */
class FakeServices {
  sent: Sent[] = [];
  private server: Server | undefined;

  async start() {
    this.server = createServer((req, res) => {
      void this.handle(req).then(({ status, body }) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(PORT, "127.0.0.1", resolve));
  }

  async stop() {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  private async handle(req: IncomingMessage): Promise<{ status: number; body: unknown }> {
    const url = new URL(req.url ?? "/", FAKE);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (req.method === "POST" && url.pathname === "/emails") {
      const email = JSON.parse(raw) as Sent & { to: string | string[] };
      this.sent.push({ ...email, to: [email.to].flat() });
      return {
        status: 200,
        body: { id: `0b2d1f4e-0000-4000-8000-${String(this.sent.length).padStart(12, "0")}` },
      };
    }
    if (req.method === "GET" && url.pathname === "/api/email-templates") {
      if (req.headers.authorization !== `integrations API-Key ${PAYLOAD_KEY}`)
        return { status: 401, body: { errors: [{ message: "Unauthorized" }] } };
      const type = url.searchParams.get("where[type][equals]") ?? "";
      const copy = seed.templates[type]?.[url.searchParams.get("locale") ?? ""];
      const docs = copy
        ? [
            {
              id: 1,
              type,
              ...copy,
              body: {
                root: {
                  type: "root",
                  children: copy.body.map((text) => ({
                    type: "paragraph",
                    children: [{ type: "text", text }],
                  })),
                },
              },
            },
          ]
        : [];
      return { status: 200, body: { docs, totalDocs: docs.length, hasNextPage: false } };
    }
    return { status: 404, body: { errors: [{ message: "Not found" }] } };
  }
}

const fake = new FakeServices();

type Notification = {
  id: string;
  to: string;
  template: string;
  status: string;
  data: Record<string, unknown>;
  /** The e-mail Resend received for it (Medusa keeps no `content`). */
  content?: Sent;
};

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T99: the order, account and admin e-mails", () => {
      let storeHeaders: Record<string, string>;
      const anyStatus = { validateStatus: () => true };
      const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

      /** The newest e-mail sent to `to` with `template`, once the subscriber has sent it. */
      const mailTo = async (to: string, template: string) => {
        const notifications = getContainer().resolve(Modules.NOTIFICATION);
        const { value } = await until(
          async () => {
            const sent = (await notifications.listNotifications(
              { to, template },
              { order: { created_at: "DESC" } },
            )) as unknown as Notification[];
            const notification = sent[0];
            if (notification?.status !== "success") return undefined;
            const email = fake.sent.findLast(
              (each) => each.to.includes(to) && each.subject === notification.data.subject,
            );
            return email === undefined ? undefined : { ...notification, content: email };
          },
          { what: `${template} to ${to}` },
        );
        return value;
      };

      beforeAll(async () => {
        await fake.start();
      });

      afterAll(async () => {
        await fake.stop();
      });

      const sentTo = async (to: string) =>
        (await getContainer()
          .resolve(Modules.NOTIFICATION)
          .listNotifications({ to })) as unknown as Notification[];

      const emit = (name: string, data: Record<string, unknown>) =>
        getContainer().resolve(Modules.EVENT_BUS).emit({ name, data });

      /** An order with two lines, in `locale`, with the market the storefront stores (T99). */
      const placeOrder = async ({
        email,
        locale = "de-DE",
        metadata = { market: "/de", language: "de" },
        customerId,
      }: {
        email: string;
        locale?: string;
        metadata?: Record<string, unknown>;
        customerId?: string;
      }) => {
        const orders = getContainer().resolve(Modules.ORDER);
        const order = await orders.createOrders({
          email,
          locale,
          metadata,
          ...(customerId ? { customer_id: customerId } : {}),
          currency_code: "eur",
          items: [
            {
              title: "Medium",
              product_title: "Linen shirt",
              variant_title: "Medium",
              quantity: 2,
              unit_price: 45,
            },
            { title: "Socks", product_title: "Socks", quantity: 1, unit_price: 12.5 },
          ],
          shipping_methods: [{ name: "Standard", amount: 5 }],
          shipping_address: {
            first_name: "Jonas",
            last_name: "Müller",
            address_1: "Hauptstraße 1",
            postal_code: "10115",
            city: "Berlin",
            country_code: "de",
          },
        });
        return order as unknown as {
          id: string;
          display_id: number;
          items: { id: string; title: string }[];
        };
      };

      beforeEach(async () => {
        const { result } = await createApiKeysWorkflow(getContainer()).run({
          input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
        });
        storeHeaders = { "x-publishable-api-key": result[0]!.token };
      });

      it("order.placed: the confirmation in the order's language, with its lines and sums, linked to the order lookup in its market", async () => {
        const order = await placeOrder({ email: "guest@example.com" });
        await emit("order.placed", { id: order.id });

        const mail = await mailTo("guest@example.com", "order-placed");
        expect(mail.data.url).toBe(`${STOREFRONT_URL}/de/order/lookup`);
        expect(mail.data.language).toBe("de");
        expect(mail.data.order_id).toBe(order.id);
        expect(mail.content?.subject).toBe(`Bestellung ${order.display_id} bestätigt`);
        const html = mail.content?.html ?? "";
        expect(html).toContain('lang="de"');
        expect(html).toContain("Linen shirt");
        expect(html).toContain("Medium");
        expect(html).toContain("Zwischensumme");
        // 2 × 45 + 12.50 + 5 shipping, in German: "107,50 €".
        expect(html).toMatch(/107,50\s€/);
        expect(mail.content?.text).toContain("Lieferadresse:\nJonas Müller\nHauptstraße 1");

        // Once per order: the event again sends nothing more.
        await emit("order.placed", { id: order.id });
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect((await sentTo("guest@example.com")).length).toBe(1);
      });

      it("order.placed: a customer's order links to the order in the account; an order without the storefront's metadata reads its locale and the primary market", async () => {
        const customers = getContainer().resolve(Modules.CUSTOMER);
        const customer = await customers.createCustomers({
          email: "member@example.com",
          has_account: true,
        });
        const order = await placeOrder({
          email: "member@example.com",
          locale: "fr-FR",
          metadata: {},
          customerId: customer.id,
        });
        await emit("order.placed", { id: order.id });

        const mail = await mailTo("member@example.com", "order-placed");
        expect(mail.data.language).toBe("fr");
        expect(mail.content?.subject).toBe(`Commande ${order.display_id} confirmée`);
        // No market stored: the primary market's, at the root.
        expect(mail.data.url).toBe(`${STOREFRONT_URL}/account/orders/${order.id}`);
      });

      it("order.canceled (the real workflow): the cancellation, with what the order held", async () => {
        const order = await placeOrder({ email: "cancel@example.com" });
        await cancelOrderWorkflow(getContainer()).run({ input: { order_id: order.id } });

        const mail = await mailTo("cancel@example.com", "order-canceled");
        expect(mail.content?.subject).toBe(`Bestellung ${order.display_id} storniert`);
        expect(mail.content?.html).toContain("Socks");
        expect(mail.data.url).toBe(`${STOREFRONT_URL}/de/order/lookup`);
      });

      it("shipment.created: the shipped e-mail, with the parcel's lines and its tracking link", async () => {
        const order = await placeOrder({ email: "ship@example.com" });
        const fulfillments = getContainer().resolve(Modules.FULFILLMENT);
        const shirt = order.items.find((item) => item.title === "Medium")!;
        const fulfillment = await fulfillments.createFulfillment({
          location_id: "sloc_test",
          provider_id: "manual_manual",
          delivery_address: { country_code: "de" },
          items: [
            {
              title: "Linen shirt",
              sku: "SHIRT-M",
              barcode: "",
              quantity: 2,
              line_item_id: shirt.id,
            },
          ],
          labels: [
            {
              tracking_number: "1Z999AA10123456784",
              tracking_url: "https://tracking.example/1Z999AA10123456784",
              label_url: "https://tracking.example/label.pdf",
            },
          ],
          order: {},
        });
        await getContainer()
          .resolve(ContainerRegistrationKeys.LINK)
          .create({
            [Modules.ORDER]: { order_id: order.id },
            [Modules.FULFILLMENT]: { fulfillment_id: fulfillment.id },
          });

        // Unticked "send notification": nothing.
        await emit("shipment.created", { id: fulfillment.id, no_notification: true });
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(await sentTo("ship@example.com")).toEqual([]);

        await emit("shipment.created", { id: fulfillment.id, no_notification: false });
        const mail = await mailTo("ship@example.com", "order-shipped");
        expect(mail.content?.subject).toBe(`Bestellung ${order.display_id} ist unterwegs`);
        const html = mail.content?.html ?? "";
        expect(html).toContain('href="https://tracking.example/1Z999AA10123456784"');
        expect(html).toContain("Linen shirt");
        // Only the parcel's lines: the socks stay out.
        expect(html).not.toContain("Socks");
      });

      it("order.return_requested: the lines going back", async () => {
        const order = await placeOrder({ email: "return@example.com" });
        const socks = order.items.find((item) => item.title === "Socks")!;
        const orders = getContainer().resolve(Modules.ORDER);
        const created = (await orders.createReturns({
          order_id: order.id,
          items: [{ item_id: socks.id, quantity: 1 }],
        } as never)) as unknown as { id: string };

        await emit("order.return_requested", { order_id: order.id, return_id: created.id });
        const mail = await mailTo("return@example.com", "return-requested");
        expect(mail.content?.subject).toBe(
          `Rücksendung für Bestellung ${order.display_id} erhalten`,
        );
        const html = mail.content?.html ?? "";
        expect(html).toContain("Socks");
        expect(html).not.toContain("Linen shirt");
      });

      it("payment.refunded: the newest refund's amount", async () => {
        const order = await placeOrder({ email: "refund@example.com" });
        const payments = getContainer().resolve(Modules.PAYMENT);
        const collection = await payments.createPaymentCollections({
          currency_code: "eur",
          amount: 107.5,
        });
        await getContainer()
          .resolve(ContainerRegistrationKeys.LINK)
          .create({
            [Modules.ORDER]: { order_id: order.id },
            [Modules.PAYMENT]: { payment_collection_id: collection.id },
          });
        const session = await payments.createPaymentSession(collection.id, {
          provider_id: "pp_system_default",
          currency_code: "eur",
          amount: 107.5,
          data: {},
        });
        const payment = await payments.authorizePaymentSession(session.id, {});
        await payments.capturePayment({ payment_id: payment.id, amount: 107.5 });
        await payments.refundPayment({ payment_id: payment.id, amount: 12.5 });

        await emit("payment.refunded", { id: payment.id });
        const mail = await mailTo("refund@example.com", "refund-issued");
        expect(mail.content?.subject).toBe(`Erstattung für Bestellung ${order.display_id}`);
        expect(mail.content?.text).toMatch(/Wir haben 12,50\s€ für die Bestellung/);
      });

      it("customer.created (a sign-up): the welcome in the customer's market and language; a customer Medusa Admin creates gets none", async () => {
        const email = "welcome@example.com";
        await api.post(
          "/auth/customer/emailpass/register",
          { email, password: "secret-password-1" },
          anyStatus,
        );
        const restricted = (
          await api.post("/auth/customer/emailpass", { email, password: "secret-password-1" })
        ).data.token as string;
        await api.post(
          "/auth/verification/request",
          { entity_id: email, entity_type: "email" },
          { headers: bearer(restricted), ...anyStatus },
        );
        const code = (await mailTo(email, "customer-verification")).data.code as string;
        expect((await api.post("/auth/verification/confirm", { code }, anyStatus)).status).toBe(
          200,
        );
        const token = (
          await api.post("/auth/customer/emailpass", { email, password: "secret-password-1" })
        ).data.token as string;
        const created = await api.post(
          "/store/customers",
          { email, metadata: { market: "/gr", language: "el" } },
          { headers: { ...storeHeaders, ...bearer(token) }, ...anyStatus },
        );
        expect(created.status).toBe(200);

        const mail = await mailTo(email, "customer-welcome");
        expect(mail.data.url).toBe(`${STOREFRONT_URL}/gr/store`);
        expect(mail.data.language).toBe("el");
        expect(mail.content?.subject).toBe("Καλώς ήρθατε στο κατάστημα");

        await getContainer()
          .resolve(Modules.CUSTOMER)
          .createCustomers({ email: "no-account@example.com" });
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(await sentTo("no-account@example.com")).toEqual([]);
      });

      it("invite.created (the real workflow): the invite to Medusa Admin, in English, linked to the admin's invite page", async () => {
        await createInvitesWorkflow(getContainer()).run({
          input: { invites: [{ email: "new-admin@example.com" }] },
        });
        const mail = await mailTo("new-admin@example.com", "admin-invite");
        const url = new URL(mail.data.url as string);
        expect(`${url.origin}${url.pathname}`).toBe(`${BACKEND_URL}/app/invite`);
        const [invite] = await getContainer()
          .resolve(Modules.USER)
          .listInvites({ email: "new-admin@example.com" });
        expect(url.searchParams.get("token")).toBe(invite?.token);
        expect(mail.data.language).toBe("en");
        expect(mail.content?.subject).toBe("You are invited to the shop's admin");
      });

      it("auth.password_reset for an admin user: the link to the admin's own reset page, in English", async () => {
        const email = "admin-reset@example.com";
        const registered = await api.post(
          "/auth/user/emailpass/register",
          { email, password: "secret-password-1" },
          anyStatus,
        );
        expect(registered.status).toBe(200);
        const asked = await api.post(
          "/auth/user/emailpass/reset-password",
          { identifier: email },
          anyStatus,
        );
        expect(asked.status).toBe(201);

        const mail = await mailTo(email, "admin-password-reset");
        const url = new URL(mail.data.url as string);
        expect(`${url.origin}${url.pathname}`).toBe(`${BACKEND_URL}/app/reset-password`);
        expect(url.searchParams.get("token")).toBeTruthy();
        expect(mail.content?.subject).toBe("Reset your password");
        // Never a storefront link for an admin.
        expect(String(mail.data.url)).not.toContain(STOREFRONT_URL);
      });
    });
  },
});
