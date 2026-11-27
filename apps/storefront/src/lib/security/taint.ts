// M7 T109 (SPEC §11.1): React's taint API, so the server's secrets and the customer's object cannot
// be handed to a Client Component or a server action's closure by mistake. `experimental.taint` in
// `next.config.ts` turns it on: Next then renders with its React experimental build, whose
// `react-server` entry has `experimental_taintObjectReference` and `experimental_taintUniqueValue`.
// Everywhere else (the browser, the proxy, `next.config.ts` itself, Vitest) React has neither, and
// these functions do nothing: no module here is `server-only`, so `lib/env.ts` can use them.
//
// - `taintSecret`: a secret's exact value. Rendering it into a Client Component's props, or a server
//   action's bound arguments, throws with the secret's name (never its value). A value shorter than
//   `MIN_SECRET_LENGTH` is left alone: development's and the tests' placeholders are short, and a
//   short value could equal ordinary text on a page. Every generated secret is longer.
// - `taintObject`: one object, by reference; its fields can still be passed one by one.
import * as React from "react";

type TaintApi = {
  experimental_taintObjectReference?: (message: string, object: object) => void;
  experimental_taintUniqueValue?: (message: string, lifetime: object, value: string) => void;
};

const api = React as unknown as TaintApi;

/** Whether this React can taint: Next's experimental build, on the server. */
export const taintAvailable = (): boolean =>
  typeof api.experimental_taintUniqueValue === "function" &&
  typeof api.experimental_taintObjectReference === "function";

/** Shorter values are not tainted (placeholders; and ordinary text could equal them). */
export const MIN_SECRET_LENGTH = 16;

/**
 * The secrets the storefront's server holds and no browser may see (SPEC §11.1): its own, and the
 * integrations' secret keys. `NEXT_PUBLIC_*` keys are public by design and not here.
 */
export const SERVER_SECRETS = [
  "PAYLOAD_SECRET",
  "STOREFRONT_SIGNING_SECRET",
  "REVALIDATE_SECRET",
  "CRON_SECRET",
  "PREVIEW_SECRET",
  "PAYLOAD_DATABASE_URL",
  "TURNSTILE_SECRET_KEY",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
  "RESEND_API_KEY",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "SENTRY_AUTH_TOKEN",
] as const;

export type ServerSecret = (typeof SERVER_SECRETS)[number];

/** A value's taint lives as long as the process: `globalThis` is never collected. */
const LIFETIME: object = globalThis;

const tainted = new Set<string>();

/** Taints `value` as the secret `name` (once per value), and returns it unchanged. */
export function taintSecret<T extends string | undefined>(name: string, value: T): T {
  if (value === undefined || value.length < MIN_SECRET_LENGTH || tainted.has(value)) return value;
  const taint = api.experimental_taintUniqueValue;
  if (typeof taint !== "function") return value;
  taint(
    `${name} is a server-only secret: it must never reach a Client Component or a server action's arguments.`,
    LIFETIME,
    value,
  );
  tainted.add(value);
  return value;
}

/** Taints every secret of `SERVER_SECRETS` that `source` holds. */
export function taintServerSecrets(source: Record<string, string | undefined>): void {
  for (const name of SERVER_SECRETS) taintSecret(name, source[name]);
}

/** Taints `object` by reference with `message`, and returns it. */
export function taintObject<T extends object>(message: string, object: T): T {
  api.experimental_taintObjectReference?.(message, object);
  return object;
}
