/**
 * T44 (D64, SPEC §8.4): a customer's e-mail is verified before the account exists. Registering
 * and logging in give a restricted token (`verification_required`), which cannot create the
 * customer; the code goes out by the `email` channel as a link to the storefront's `/verify` page
 * in the shopper's market; confirming it lets the next login create the account. A password reset
 * goes out the same way to `/reset-password`. SETUP.md, "Verification on the backend (T44)",
 * lists a mutation that fails each test.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http auth-verification.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows";

import { until } from "./search-locale.fixtures";

jest.setTimeout(120_000);

const STOREFRONT_URL = "http://localhost:8000";
process.env.STOREFRONT_URL = STOREFRONT_URL;

type Notification = { to: string; channel: string; template: string; data: Record<string, unknown> };

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T44: e-mail verification and password reset", () => {
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

            return sent[0];
          },
          { what: `${template} to ${to}` },
        );

        return value;
      };

      const register = async (email: string, password = "secret-password-1") => {
        const response = await api.post(
          "/auth/customer/emailpass/register",
          { email, password },
          anyStatus,
        );

        expect(response.status).toBe(200);

        return response.data.token as string;
      };

      const login = (email: string, password = "secret-password-1") =>
        api.post("/auth/customer/emailpass", { email, password }, anyStatus);

      const requestVerification = (token: string, email: string, metadata?: object) =>
        api.post(
          "/auth/verification/request",
          { entity_id: email, entity_type: "email", ...(metadata ? { metadata } : {}) },
          { headers: bearer(token), ...anyStatus },
        );

      const createCustomer = (token: string, email: string) =>
        api.post(
          "/store/customers",
          { email, first_name: "Ada", last_name: "Lovelace" },
          { headers: { ...storeHeaders, ...bearer(token) }, ...anyStatus },
        );

      beforeEach(async () => {
        const { result } = await createApiKeysWorkflow(getContainer()).run({
          input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
        });

        storeHeaders = { "x-publishable-api-key": result[0]!.token };
      });

      it("creates the account only after the e-mail is verified, by a link in the shopper's market", async () => {
        const email = "ada@example.com";
        const registered = await register(email);

        // Unverified: the login says so, and its token cannot create the customer.
        const first = await login(email);

        expect(first.status).toBe(200);
        expect(first.data.verification_required).toBe(true);

        const restricted = first.data.token as string;
        const refused = await createCustomer(restricted, email);

        expect(refused.status).toBe(403);

        // Nor does the token /register gave.
        expect((await createCustomer(registered, email)).status).toBe(403);

        // The code goes out by e-mail, as a link to /verify under the market's prefix.
        const requested = await requestVerification(restricted, email, { market: "/us" });

        expect(requested.status).toBe(201);

        const mail = await mailTo(email, "customer-verification");
        const url = new URL(mail.data.url as string);

        expect(mail.channel).toBe("email");
        expect(`${url.origin}${url.pathname}`).toBe(`${STOREFRONT_URL}/us/verify`);
        expect(url.searchParams.get("code")).toBe(mail.data.code);

        // The /verify page confirms with the code alone, without the shopper's token.
        const confirmed = await api.post(
          "/auth/verification/confirm",
          { code: url.searchParams.get("code") },
          anyStatus,
        );

        expect(confirmed.status).toBe(200);
        expect(confirmed.data.entity_id).toBe(email);

        // Verified: the next login's token creates the account.
        const second = await login(email);

        expect(second.status).toBe(200);
        expect(second.data.verification_required).not.toBe(true);

        const created = await createCustomer(second.data.token, email);

        expect(created.status).toBe(200);

        const signedIn = await login(email);
        const me = await api.get("/store/customers/me", {
          headers: { ...storeHeaders, ...bearer(signedIn.data.token) },
          ...anyStatus,
        });

        expect(me.status).toBe(200);
        expect(me.data.customer.email).toBe(email);
      });

      it.each([
        ["names no market", "grace@example.com", undefined],
        ["names a market that is not a prefix", "hedy@example.com", { market: "//evil.example.com" }],
      ])("links to the primary market when the request %s", async (_, email, metadata) => {
        // A fresh identity each: a repeated request keeps the first one's metadata.
        await register(email);

        const token = (await login(email)).data.token as string;

        expect((await requestVerification(token, email, metadata)).status).toBe(201);

        const url = new URL((await mailTo(email, "customer-verification")).data.url as string);

        expect(`${url.origin}${url.pathname}`).toBe(`${STOREFRONT_URL}/verify`);
      });

      it("sends a customer's password reset as a link to /reset-password in the shopper's market", async () => {
        const email = "alan@example.com";

        await register(email);

        const response = await api.post(
          "/auth/customer/emailpass/reset-password",
          { identifier: email, metadata: { market: "/ch/fr" } },
          anyStatus,
        );

        expect(response.status).toBe(201);

        const mail = await mailTo(email, "customer-password-reset");
        const url = new URL(mail.data.url as string);

        expect(mail.channel).toBe("email");
        expect(`${url.origin}${url.pathname}`).toBe(`${STOREFRONT_URL}/ch/fr/reset-password`);
        expect(url.searchParams.get("email")).toBe(email);
        expect(url.searchParams.get("token")).toBeTruthy();
      });
    });
  },
});
