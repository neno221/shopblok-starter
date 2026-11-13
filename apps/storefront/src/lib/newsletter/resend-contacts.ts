// The newsletter's confirmed addresses in Resend (D122, T99): a contact in the segment
// `RESEND_NEWSLETTER_SEGMENT_ID`. Resend has replaced Audiences with Contacts and Segments (the
// Audiences API is deprecated): `POST /contacts` creates a contact, already in its segments; an
// address that is already a contact is answered with an error, and then the contact is subscribed
// again (`PATCH /contacts/{email}`, since confirming is consent given anew) and added to the segment
// (`POST /contacts/{email}/segments/{id}`, which also accepts a contact already in it). The language
// is left out: a contact's custom properties must first be created in Resend's dashboard. `fetch`
// only, no SDK; `RESEND_BASE_URL` points it at a test's fake.

export type ResendContactsConfig = { apiKey: string; segmentId: string; baseUrl?: string };

/** The config from the env, or `undefined` without the key or the segment (a submission instead). */
export function resendContactsConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ResendContactsConfig | undefined {
  const apiKey = env["RESEND_API_KEY"]?.trim();
  const segmentId = env["RESEND_NEWSLETTER_SEGMENT_ID"]?.trim();
  if (!apiKey || !segmentId) return undefined;
  const baseUrl = env["RESEND_BASE_URL"]?.trim();
  return { apiKey, segmentId, ...(baseUrl ? { baseUrl } : {}) };
}

/** Resend's answer when it is not a 2xx: the status and Resend's own `name`, never the key. */
export class ResendContactError extends Error {
  override name = "ResendContactError";
  constructor(
    readonly step: string,
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(`resend: ${step} answered ${status}${code ? ` (${code})` : ""}`);
  }
}

async function call(
  config: ResendContactsConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; code: string | undefined }> {
  const base = (config.baseUrl || "https://api.resend.com").replace(/\/+$/, "");
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  let code: string | undefined;
  if (!response.ok) {
    const answer = (await response.json().catch(() => null)) as { name?: unknown } | null;
    code = typeof answer?.name === "string" ? answer.name : undefined;
  } else {
    await response.body?.cancel();
  }
  return { ok: response.ok, status: response.status, code };
}

/** The address as a contact in the segment, subscribed. Throws `ResendContactError` otherwise. */
export async function addToSegment(config: ResendContactsConfig, email: string): Promise<void> {
  const created = await call(config, "POST", "/contacts", {
    email,
    unsubscribed: false,
    segments: [{ id: config.segmentId }],
  });
  if (created.ok) return;
  // A 4xx other than a missing key or a limit: the contact is there already (Resend answers 409 or
  // 422 for it, by version). Anything else is a failure to report.
  if (created.status < 400 || created.status >= 500 || [401, 403, 429].includes(created.status))
    throw new ResendContactError("create contact", created.status, created.code);
  const path = `/contacts/${encodeURIComponent(email)}`;
  const subscribed = await call(config, "PATCH", path, {
    unsubscribed: false,
  });
  if (!subscribed.ok)
    throw new ResendContactError("subscribe contact", subscribed.status, subscribed.code);
  const added = await call(
    config,
    "POST",
    `${path}/segments/${encodeURIComponent(config.segmentId)}`,
  );
  if (!added.ok && added.status !== 409)
    throw new ResendContactError("add to segment", added.status, added.code);
}

/** The contact removed (the live check's clean-up, and an editor's erasure by hand). */
export async function removeContact(config: ResendContactsConfig, email: string): Promise<void> {
  const removed = await call(config, "DELETE", `/contacts/${encodeURIComponent(email)}`);
  if (!removed.ok && removed.status !== 404)
    throw new ResendContactError("remove contact", removed.status, removed.code);
}
