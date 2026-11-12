import { expect, test } from "@playwright/test";
import { skipWithoutKeys } from "../support/integration-keys";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "../support/medusa-admin";

// M6 D121, D131 (T98): Resend, live. With `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in both apps,
// Medusa's `email` channel and Payload's e-mail adapter send through Resend. The spec sends one
// verification e-mail from Medusa and one e-mail from Payload, each to Resend's test address
// `delivered@resend.dev` (with a label, so the two runs' e-mails tell apart), and holds each to the
// id Resend answered. Without the keys it is skipped, naming them. It never prints the key, and the
// only address it uses is Resend's own.

skipWithoutKeys(test, "resend");

/** Resend's ids are UUIDs. */
const RESEND_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** `delivered+<label>@resend.dev`: Resend accepts it, reports it delivered and mails no one. */
const testAddress = (label: string) => `delivered+${label}-${Date.now().toString(36)}@resend.dev`;

type Notification = { to: string; template: string; status: string; external_id: string | null };

test("Medusa sends the verification e-mail through Resend and keeps Resend's id", async () => {
  const medusa = medusaUrl();
  const email = testAddress("medusa");
  const password = `Live-${Date.now()}-check`;
  const post = (path: string, body: unknown, token?: string) =>
    fetch(`${medusa}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  // As the storefront's registration does (`lib/medusa/customer.ts`): an identity, a sign-in that
  // answers "verification required" with a restricted token, and the request for the link.
  const registered = await post("/auth/customer/emailpass/register", { email, password });
  expect(registered.status, "register").toBe(200);
  const login = await post("/auth/customer/emailpass", { email, password });
  expect(login.status, "sign-in").toBe(200);
  const { token } = (await login.json()) as { token: string };
  const requested = await post(
    "/auth/verification/request",
    { entity_id: email, entity_type: "email", metadata: { market: "/us", language: "en" } },
    token,
  );
  expect(requested.status, "verification request").toBeLessThan(300);

  // The notification Medusa wrote: sent (`success`) with the id Resend answered (`external_id`).
  // Medusa commits it as `pending` before it calls the provider, so the poll waits for the end
  // state, `success` or `failure` (PR 135 review, item 2).
  const admin = await medusaAdminToken(medusa);
  const query = new URLSearchParams({
    to: email,
    fields: "id,to,template,status,external_id",
  });
  let found: Notification | undefined;
  await expect
    .poll(
      async () => {
        const { notifications } = await medusaAdminApi<{ notifications: Notification[] }>(
          medusa,
          admin,
          "GET",
          `/admin/notifications?${query}`,
        );
        found = notifications.find((n) => n.template === "customer-verification");
        return found?.status ?? "none yet";
      },
      {
        timeout: 30_000,
        message: "the verification e-mail's notification in Medusa, sent or failed",
      },
    )
    .toMatch(/^(success|failure)$/);
  expect(found?.status, "the notification's status").toBe("success");
  expect(found?.external_id ?? "", "Resend's id").toMatch(RESEND_ID);
  console.log(`Medusa → Resend: customer-verification sent, Resend id ${found?.external_id}`);
});

test("Payload sends an e-mail through its Resend adapter and gets Resend's id", async ({
  request,
}) => {
  const to = testAddress("payload");
  const response = await request.post(`/next/e2e/email?to=${encodeURIComponent(to)}`);
  expect(response.status(), await response.text()).toBe(200);
  const { adapter, id } = (await response.json()) as { adapter: string; id: string | null };
  expect(adapter, "Payload's e-mail adapter").toBe("resend-rest");
  expect(id ?? "", "Resend's id").toMatch(RESEND_ID);
  console.log(`Payload → Resend: e-mail sent, Resend id ${id}`);
});
