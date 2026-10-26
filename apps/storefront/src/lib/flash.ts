import "server-only";
import { randomBytes } from "node:crypto";
import { getFlash, setFlash } from "./medusa/cookies";

// The no-script forms' post-redirect-get (T52): an action that fails leaves what the page needs to
// say why (the form's error, each field's, what was typed) in a short-lived cookie under a random
// key, and redirects back with `?f=<key>`; the page draws them when its URL carries that key. A
// reload shows the same answer, another visit to the page a clean form. Nothing here is trusted:
// the page reads only the keys it knows, and the values only fill a form back in.

export type Flash = {
  /** The form's error, when no field is to blame (`ActionResult`'s `form`). */
  form?: string;
  /** Each field's error kind, keyed as the form names the field. */
  errors?: Record<string, string>;
  /** What was typed, to fill the form in again (strings only, each cut to 200 characters). */
  values?: Record<string, string>;
};

/** The most a flash may hold in all, so a cookie never grows past what a browser keeps. */
const MAX_LENGTH = 3000;

/** Leaves `flash` for `path` and answers the key its redirect's URL carries. */
export async function leaveFlash(path: string, flash: Flash): Promise<string> {
  const key = randomBytes(6).toString("base64url");
  const values = Object.fromEntries(
    Object.entries(flash.values ?? {}).map(([name, value]) => [name, value.slice(0, 200)]),
  );
  let body = JSON.stringify({ key, path, ...flash, values });
  if (body.length > MAX_LENGTH) body = JSON.stringify({ key, path, ...flash, values: {} });
  await setFlash(body);
  return key;
}

const strings = (value: unknown): Record<string, string> =>
  typeof value === "object" && value !== null
    ? Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, string] => {
          return typeof entry[1] === "string";
        }),
      )
    : {};

/** The flash left for `path` under `key`, or `null`. */
export async function readFlash(path: string, key: string | undefined): Promise<Flash | null> {
  if (key === undefined || key === "") return null;
  const raw = await getFlash();
  if (raw === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.key !== key || record.path !== path) return null;
    return {
      ...(typeof record.form === "string" ? { form: record.form } : {}),
      errors: strings(record.errors),
      values: strings(record.values),
    };
  } catch {
    return null;
  }
}
