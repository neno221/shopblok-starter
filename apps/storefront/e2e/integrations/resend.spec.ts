import { expect, test } from "@playwright/test";
import { addToSegment, removeContact } from "../../src/lib/newsletter/resend-contacts";
import { signToken, tokenKey } from "../../src/lib/newsletter/token";
import { appEnv } from "../support/app-env";
import { catalogs } from "../support/catalogs";
import { skipWithoutKeys } from "../support/integration-keys";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "../support/medusa-admin";
import { addToCart, checkOut } from "../support/purchase";

// M6 D121, D131 (T98): Resend, live. With `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in both apps,
// Medusa's `email` channel and Payload's e-mail adapter send through Resend. The spec sends one
// verification e-mail from Medusa and one e-mail from Payload, each to Resend's test address
// `delivered@resend.dev` (with a label, so the two runs' e-mails tell apart), and holds each to the
// id Resend answered. Without the keys it is skipped, naming them. It never prints the key, and the
// only address it uses is Resend's own. T99 (D122): a purchase in `/` sends the order e-mail through
// Resend; and the newsletter's confirmation, posted on its page, puts the address in the segment
// `RESEND_NEWSLETTER_SEGMENT_ID` (skipped without it), read back from Resend and then removed.

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

/** Notifications Medusa wrote to `to` with `template`, once one has its end state. */
async function sentNotification(to: string, template: string): Promise<Notification | undefined> {
  const medusa = medusaUrl();
  const admin = await medusaAdminToken(medusa);
  const query = new URLSearchParams({ to, fields: "id,to,template,status,external_id" });
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
        found = notifications.find((n) => n.template === template);
        return found?.status ?? "none yet";
      },
      {
        timeout: 60_000,
        message: `the ${template} e-mail's notification in Medusa, sent or failed`,
      },
    )
    .toMatch(/^(success|failure)$/);
  return found;
}

test("Medusa sends the order e-mail through Resend after a purchase in / (T99)", async ({
  page,
}) => {
  const email = testAddress("order");
  await addToCart(page);
  await page.goto("/cart");
  await page.locator('[data-slot="cart-checkout"]:visible').click();
  await checkOut(page, {
    words: catalogs.el,
    email,
    address: {
      firstName: "Μαρία",
      lastName: "Γεωργίου",
      address1: "Λεωφόρος Μακαρίου 10",
      city: "Λευκωσία",
    },
  });
  const found = await sentNotification(email, "order-placed");
  expect(found?.status, "the notification's status").toBe("success");
  expect(found?.external_id ?? "", "Resend's id").toMatch(RESEND_ID);
  console.log(`Medusa → Resend: order-placed sent, Resend id ${found?.external_id}`);
});

test("the newsletter's confirmation puts the address in Resend's segment (T99)", async ({
  page,
}) => {
  let segmentId = "";
  try {
    segmentId = appEnv("storefront", "RESEND_NEWSLETTER_SEGMENT_ID");
  } catch {
    test.skip(true, "RESEND_NEWSLETTER_SEGMENT_ID is not set (a Resend segment's id, G10)");
  }
  const apiKey = appEnv("storefront", "RESEND_API_KEY");
  const email = testAddress("newsletter");
  // The link the sign-up e-mails (Resend's test inbox cannot be read), signed as the shop signs it.
  const { token } = signToken(
    { email, form: 1, market: "en-us", language: "en" },
    tokenKey(appEnv("storefront", "PAYLOAD_SECRET")),
  );
  const confirm = catalogs.en.templates.newsletterConfirm;
  try {
    await page.goto(`/us/newsletter/confirm?token=${encodeURIComponent(token)}`);
    await expect(page.getByRole("main")).toContainText(email);
    await page.getByRole("button", { name: confirm.submit }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(confirm.doneTitle);
    // The contact, read back from Resend: in the segment, subscribed.
    const headers = { Authorization: `Bearer ${apiKey}` };
    const base = (process.env["RESEND_BASE_URL"] || "https://api.resend.com").replace(/\/+$/, "");
    const contact = await fetch(`${base}/contacts/${encodeURIComponent(email)}`, { headers });
    expect(contact.status, "the contact in Resend").toBe(200);
    expect(((await contact.json()) as { unsubscribed?: boolean }).unsubscribed).toBe(false);
    const segments = await fetch(`${base}/contacts/${encodeURIComponent(email)}/segments`, {
      headers,
    });
    expect(segments.status, "the contact's segments").toBe(200);
    const { data } = (await segments.json()) as { data: { id: string }[] };
    expect(data.map((segment) => segment.id)).toContain(segmentId);
    // A second confirmation of an address already there takes the other path, and holds too.
    await addToSegment({ apiKey, segmentId }, email);
    console.log("Payload → Resend: the confirmed address is a contact in the segment");
  } finally {
    await removeContact({ apiKey, segmentId }, email);
  }
});
