import { base } from "./server";

// Payload's REST API from Node as the bootstrap admin (T69): the one place for its headers, a call
// that returns Payload's answer, one that throws unless it is a 2xx, an upload, and a synced
// document's id by its handle. `globals.ts` and the specs build on these.

/** A 1 × 1 PNG; Payload stores its size, so the image has the width and height a page needs. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** The admin's token, and `Origin`, which Payload's CSRF check compares on a write. */
export const adminHeaders = (token: string) => ({
  Authorization: `JWT ${token}`,
  Origin: new URL(base()).origin,
});

/** A JSON call; returns the status and the body, parsed on demand. */
export async function rest<T = Record<string, unknown>>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const response = await fetch(`${base()}${path}`, {
    method,
    headers: { ...adminHeaders(token), "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, text, json: () => JSON.parse(text) as T };
}

/** A JSON call; throws with Payload's answer unless it is a 2xx. */
export async function api<T = Record<string, unknown>>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const answer = await rest<T>(token, method, path, body);
  if (!answer.ok) throw new Error(`${method} ${path} answered ${answer.status}: ${answer.text}`);
  return answer.json();
}

/** Uploads a file to `media` with its English alternative text; returns its id and file name. */
export async function upload(
  token: string,
  name: string,
  type: string,
  bytes: Buffer,
  alt: string,
): Promise<{ id: number; filename: string }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), name);
  form.append("_payload", JSON.stringify({ alt }));
  const response = await fetch(`${base()}/api/media?locale=en`, {
    method: "POST",
    headers: adminHeaders(token),
    body: form,
  });
  if (!response.ok)
    throw new Error(`uploading ${name} answered ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { doc: { id: number; filename: string } }).doc;
}

/** A synced document's Payload id by its handle (the collections are public). */
export async function syncedId(
  collection: "products" | "categories" | "collections",
  handle: string,
): Promise<number> {
  const { docs } = await api<{ docs: { id: number }[] }>(
    "",
    "GET",
    `/api/${collection}?where[handle][equals]=${encodeURIComponent(handle)}&depth=0`,
  );
  const id = docs[0]?.id;
  if (id === undefined) throw new Error(`no ${collection} document has the handle ${handle}`);
  return id;
}
