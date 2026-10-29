import { base } from "./server";

// Payload's REST API from Node as the bootstrap admin (T69): a JSON call, an upload, and a synced
// document's id by its handle. `Origin` is what Payload's CSRF check compares on a write.

/** A 1 × 1 PNG; Payload stores its size, so the image has the width and height a page needs. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const headers = (token: string) => ({
  Authorization: `JWT ${token}`,
  Origin: new URL(base()).origin,
});

/** A JSON call; throws with Payload's answer unless it is a 2xx. */
export async function api<T = Record<string, unknown>>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    method,
    headers: { ...headers(token), "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
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
    headers: headers(token),
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
