import { base } from "./server";

// T61: the shell's globals (`header`, `footer`, `site-settings`) changed by a test and put back.
// A test publishes what it needs through Payload's REST API as the bootstrap admin, and puts the
// published global back afterwards: a snapshot read in every language (`locale=all`) and published
// again. Publishing the snapshot also replaces any draft the test left, so the next editor opens
// the global without a pending change.

export type GlobalSlug = "header" | "footer" | "site-settings";
export type GlobalData = Record<string, unknown>;

/** `Origin` is what Payload's CSRF check compares on a write. */
const headers = (token: string) => ({
  Authorization: `JWT ${token}`,
  "content-type": "application/json",
  Origin: new URL(base()).origin,
});

/** The published global in every language, without the fields Payload sets itself. */
export async function snapshotGlobal(token: string, slug: GlobalSlug): Promise<GlobalData> {
  const response = await fetch(`${base()}/api/globals/${slug}?locale=all&depth=0`, {
    headers: headers(token),
  });
  if (!response.ok) throw new Error(`GET /api/globals/${slug} answered ${response.status}`);
  const data = (await response.json()) as GlobalData;
  for (const key of ["id", "updatedAt", "createdAt", "globalType", "_status"]) delete data[key];
  return data;
}

/** Publishes `data`: in one language, or in every language with `locale: "all"` (a snapshot). */
export async function publishGlobal(
  token: string,
  slug: GlobalSlug,
  data: GlobalData,
  locale = "en",
): Promise<void> {
  const response = await fetch(`${base()}/api/globals/${slug}?locale=${locale}&depth=0`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ ...data, _status: "published" }),
  });
  if (!response.ok)
    throw new Error(
      `POST /api/globals/${slug} answered ${response.status}: ${await response.text()}`,
    );
}

/** The newest draft of the global, as the admin reads it. */
export async function draftOf(token: string, slug: GlobalSlug): Promise<GlobalData> {
  const response = await fetch(`${base()}/api/globals/${slug}?draft=true&locale=en&depth=0`, {
    headers: headers(token),
  });
  if (!response.ok) throw new Error(`GET /api/globals/${slug} answered ${response.status}`);
  return (await response.json()) as GlobalData;
}
