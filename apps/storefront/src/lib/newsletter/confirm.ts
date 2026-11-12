import "server-only";
import { getPayloadClient } from "../cms/payload";
import { addToSegment, resendContactsConfig } from "./resend-contacts";
import { readToken, tokenKey, type NewsletterClaims } from "./token";

// The newsletter's confirmation (D122, T99). The link in the e-mail opens a page that only shows
// the address and a "Confirm" button (`readConfirmation`): mail scanners and link prefetchers open
// an e-mail's links within seconds, so a GET confirms nothing. The button's POST
// (`confirmSubscription`) uses the token once: it records the token's id in
// `newsletter-confirmations` (unique) before anything else, so a second POST, or two at once, find
// it taken; then the address goes to Resend's segment, or, without Resend's key or segment, into a
// submission to the form marked confirmed. If that step fails the record is taken away again, so the
// same link can be tried once more.

export type ConfirmOutcome = "done" | "used" | "expired" | "failed";

const COLLECTION = "newsletter-confirmations";

/** What the page shows for a link: the address to confirm, one already confirmed, or none. */
export type LinkState =
  { kind: "valid"; claims: NewsletterClaims } | { kind: "used" } | { kind: "expired" };

async function isUsed(id: string): Promise<boolean> {
  const payload = await getPayloadClient();
  const { totalDocs } = await payload.count({
    collection: COLLECTION,
    where: { tokenId: { equals: id } },
    overrideAccess: true,
  });
  return totalDocs > 0;
}

/** The link's state for the page: read only, it writes nothing. */
export async function readConfirmation(token: unknown): Promise<LinkState> {
  let claims: NewsletterClaims | null;
  try {
    claims = readToken(token, tokenKey());
  } catch {
    return { kind: "expired" };
  }
  if (claims === null) return { kind: "expired" };
  return (await isUsed(claims.id)) ? { kind: "used" } : { kind: "valid", claims };
}

/** The newsletter form's address field, as the submission names it; `email` when it is gone. */
async function emailFieldOf(form: number): Promise<string> {
  const payload = await getPayloadClient();
  const read = (await payload
    .findByID({ collection: "forms", id: form, depth: 0, overrideAccess: true })
    .catch(() => null)) as { fields?: { blockType?: string; name?: string }[] } | null;
  return read?.fields?.find((field) => field.blockType === "email")?.name ?? "email";
}

/** Where the address goes: Resend's segment, or a confirmed submission to its form. */
async function deliver(claims: NewsletterClaims): Promise<"resend" | "submission"> {
  const resend = resendContactsConfig();
  if (resend !== undefined) {
    await addToSegment(resend, claims.email);
    return "resend";
  }
  const payload = await getPayloadClient();
  await payload.create({
    collection: "form-submissions",
    data: {
      form: claims.form,
      submissionData: [
        { field: await emailFieldOf(claims.form), value: claims.email },
        { field: "confirmed", value: new Date().toISOString() },
      ],
    },
    depth: 0,
    // The plugin's REST `create` is closed (`payload/forms.ts`); this is the shop's way in.
    overrideAccess: true,
    user: null,
  });
  return "submission";
}

/** The POST's work: the token used once, the address delivered. */
export async function confirmSubscription(token: unknown): Promise<ConfirmOutcome> {
  let claims: NewsletterClaims | null;
  try {
    claims = readToken(token, tokenKey());
  } catch {
    return "failed";
  }
  if (claims === null) return "expired";
  const payload = await getPayloadClient();
  if (await isUsed(claims.id)) return "used";
  let record: { id: number | string };
  try {
    record = await payload.create({
      collection: COLLECTION,
      data: {
        tokenId: claims.id,
        email: claims.email,
        form: claims.form,
        market: claims.market,
        language: claims.language,
      },
      depth: 0,
      overrideAccess: true,
      user: null,
    });
  } catch (error) {
    // Two POSTs at once: the unique `tokenId` lets one through, and the other lands here.
    if (await isUsed(claims.id).catch(() => false)) return "used";
    console.error(
      `newsletter: the confirmation could not be recorded (${error instanceof Error ? error.name : "error"})`,
    );
    return "failed";
  }
  let destination: "resend" | "submission";
  try {
    destination = await deliver(claims);
  } catch (error) {
    console.error(
      `newsletter: the address could not be added (${error instanceof Error ? error.message : "error"})`,
    );
    await payload
      .delete({ collection: COLLECTION, id: record.id, overrideAccess: true, user: null })
      .catch(() => undefined);
    return "failed";
  }
  // The record says where it went; the address is in, whether or not this note is kept.
  await payload
    .update({
      collection: COLLECTION,
      id: record.id,
      data: { destination },
      depth: 0,
      overrideAccess: true,
      user: null,
    })
    .catch(() => undefined);
  return "done";
}
