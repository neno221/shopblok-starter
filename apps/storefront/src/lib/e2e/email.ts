import "server-only";
import { getPayloadClient } from "../cms/payload";
import { e2eGate } from "./gate";

/** Resend's test addresses (`delivered@resend.dev`, `bounced+label@resend.dev`…): nobody's inbox. */
const RESEND_TEST_ADDRESS = /^[a-z]+(\+[a-z0-9-]+)?@resend\.dev$/;

/**
 * `POST ?to=<address>` (T98, M6 D121): sends one e-mail through Payload's e-mail adapter, as a
 * password reset from the admin would, and answers the adapter's name and, with Resend, the id
 * Resend gave the e-mail. Only to Resend's test addresses (D131), so the route can never mail a
 * person, and the answer never repeats the address.
 */
export async function sendTestEmail(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const to = new URL(request.url).searchParams.get("to") ?? "";
  if (!RESEND_TEST_ADDRESS.test(to)) {
    return Response.json({ error: "to must be one of Resend's test addresses" }, { status: 400 });
  }
  const payload = await getPayloadClient();
  const adapter = payload.email?.name ?? null;
  if (adapter === null) return Response.json({ adapter, id: null }, { status: 409 });
  const answer: unknown = await payload.sendEmail({
    to,
    subject: "Shopblok: live check of Payload's e-mail (T98)",
    text: "This e-mail checks that Payload's e-mail adapter reaches Resend.",
    html: "<p>This e-mail checks that Payload's e-mail adapter reaches Resend.</p>",
  });
  const id = (answer as { id?: unknown } | null)?.id;
  return Response.json(
    { adapter, id: typeof id === "string" ? id : null },
    { headers: { "cache-control": "private, no-store" } },
  );
}
