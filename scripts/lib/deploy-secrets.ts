// The deployments' generated secrets (M7 D134), as one table that `pnpm staging:secrets` writes from
// and `doctor --app` checks against, and their fingerprints. Nothing here reads a file, the network
// or the shell: values come in, names and hashes go out. A fingerprint is no secret (a short
// SHA-256 under the variable's name), so it may be printed, stored in both platforms and compared.
import { createHash, randomBytes } from "node:crypto";
import type { AppName, EnvLike } from "@shopblok/integrations";
import type { Check } from "./report.ts";

/**
 * What a rotation costs (D134), and so what `--rotate=<name>` asks for:
 *
 * - `alone`: nothing else changes (`PREVIEW_SECRET`; `CRON_SECRET`, which both apps hold, is set in
 *   both at once and needs no sign-out);
 * - `both-apps`: both apps take the new value and both are redeployed before either works again;
 * - `sign-out`: every customer and admin session ends;
 * - `re-key`: the `integrations` user's key is set again (the Payload seed does it on its next run);
 * - `lock-out`: every admin enrolled in two-factor sign-in has to enrol again, so `--force` is needed.
 */
export type Rotation = "alone" | "both-apps" | "sign-out" | "re-key" | "lock-out";

/** Where a secret lives: one platform's service or project, under one variable name. */
export type SecretHome = {
  /** `backend` is Railway's Medusa server and worker; `storefront` is Vercel's project. */
  app: AppName | "meilisearch";
  variable: string;
};

export type SecretSpec = {
  /** The name it is known by: in the table, in `--rotate=` and in the fingerprints. */
  name: string;
  homes: readonly SecretHome[];
  rotation: Rotation;
  /** How many random bytes, as hex. */
  bytes: number;
  /** What the rotation costs, in one sentence (`--dry-run` and DEPLOY.md say it). */
  effect: string;
};

const backend = (variable: string): SecretHome => ({ app: "backend", variable });
const storefront = (variable: string): SecretHome => ({ app: "storefront", variable });

/** D134's table, in the order the script sets and prints them. */
export const SECRETS: readonly SecretSpec[] = [
  {
    name: "JWT_SECRET",
    homes: [backend("JWT_SECRET")],
    rotation: "sign-out",
    bytes: 32,
    effect: "every customer and admin token stops working: everyone signs in again",
  },
  {
    name: "COOKIE_SECRET",
    homes: [backend("COOKIE_SECRET")],
    rotation: "sign-out",
    bytes: 32,
    effect: "every session cookie stops working: everyone signs in again",
  },
  {
    name: "PAYLOAD_SECRET",
    homes: [storefront("PAYLOAD_SECRET")],
    rotation: "re-key",
    bytes: 32,
    effect:
      "Payload's sessions and API keys stop working: the staff sign in again and the integrations user is re-keyed",
  },
  {
    name: "PAYLOAD_API_KEY",
    homes: [backend("PAYLOAD_API_KEY"), storefront("PAYLOAD_API_KEY")],
    rotation: "re-key",
    bytes: 32,
    effect:
      "the integrations user takes the new key on the Payload seed's next run; Medusa's sync fails until then",
  },
  {
    name: "REVALIDATE_SECRET",
    homes: [backend("REVALIDATE_SECRET"), storefront("REVALIDATE_SECRET")],
    rotation: "both-apps",
    bytes: 32,
    effect: "Medusa's revalidation calls fail until both apps run with the new value",
  },
  {
    name: "STOREFRONT_SIGNING_SECRET",
    homes: [backend("STOREFRONT_SIGNING_SECRET"), storefront("STOREFRONT_SIGNING_SECRET")],
    rotation: "both-apps",
    bytes: 32,
    effect: "the storefront's signed calls to Medusa fail until both apps run with the new value",
  },
  {
    name: "PREVIEW_SECRET",
    homes: [storefront("PREVIEW_SECRET")],
    rotation: "alone",
    bytes: 32,
    effect: "open preview links stop working; editors open them again from Payload",
  },
  {
    name: "CRON_SECRET",
    homes: [backend("CRON_SECRET"), storefront("CRON_SECRET")],
    rotation: "alone",
    bytes: 32,
    effect: "a scheduled job run between the two writes is refused and runs on the next minute",
  },
  {
    name: "AUTH_MFA_ENCRYPTION_KEY",
    homes: [backend("AUTH_MFA_ENCRYPTION_KEY")],
    rotation: "lock-out",
    bytes: 32,
    effect: "every admin enrolled in two-factor sign-in is locked out and enrols again",
  },
  {
    name: "MEILI_MASTER_KEY",
    homes: [{ app: "meilisearch", variable: "MEILI_MASTER_KEY" }, backend("MEILISEARCH_API_KEY")],
    rotation: "both-apps",
    bytes: 32,
    effect: "search falls back to Postgres until Meilisearch and Medusa run with the new key",
  },
];

/** The variable doctor compares with. Both apps hold it; `pnpm staging:secrets` writes it. */
export const FINGERPRINTS_VARIABLE = "SHOPBLOK_SECRET_FINGERPRINTS";

/** A fresh value: `bytes` random bytes as hex, safe unquoted in any shell or dashboard. */
export function generateValue(spec: Pick<SecretSpec, "bytes">): string {
  return randomBytes(spec.bytes).toString("hex");
}

/**
 * The first 16 hex characters of SHA-256 over `shopblok:<name>:<value>`. Under its name, so two
 * secrets that happen to share a value do not share a fingerprint; 64 bits, enough to tell a stale
 * copy from the current one, and nothing to guess a 256-bit secret from.
 */
export function fingerprint(name: string, value: string): string {
  return createHash("sha256").update(`shopblok:${name}:${value}`).digest("hex").slice(0, 16);
}

/** `NAME:hex,NAME:hex`, in the table's order. */
export function formatFingerprints(prints: ReadonlyMap<string, string>): string {
  const order = SECRETS.map((spec) => spec.name);
  return [...prints.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([name, print]) => `${name}:${print}`)
    .join(",");
}

/** The fingerprints a variable holds, or what is wrong with it (a name, never a value). */
export function parseFingerprints(text: string | undefined): Map<string, string> | string {
  const prints = new Map<string, string>();
  const entries = (text ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
  for (const entry of entries) {
    const match = /^([A-Z][A-Z0-9_]*):([0-9a-f]{16})$/.exec(entry);
    if (match === null) return "an entry is not NAME:<16 hex characters>";
    prints.set(match[1]!, match[2]!);
  }
  return prints;
}

/** The secrets of the table that `app` holds, with the variable it reads each from. */
export function secretsOf(app: AppName): { spec: SecretSpec; variable: string }[] {
  return SECRETS.flatMap((spec) =>
    spec.homes
      .filter((home) => home.app === app)
      .map((home) => ({ spec, variable: home.variable })),
  );
}

/** A secret that more than one place holds: the ones a fingerprint exists for. */
export const isShared = (spec: SecretSpec): boolean => spec.homes.length > 1;

const FINGERPRINTS = { id: "secret-fingerprints", title: "Shared secrets' fingerprints" } as const;

/**
 * `doctor --app` (D134, D135): does each shared secret this app holds match its fingerprint in
 * `SHOPBLOK_SECRET_FINGERPRINTS`? A mismatch is an error naming the secret (the two platforms hold
 * different values, so the calls between the apps fail); so is a missing or broken variable on a
 * deployment. Outside a deployment, with no fingerprints, there is nothing to say. Never a value.
 */
export function secretFingerprintCheck(
  env: EnvLike,
  app: AppName,
  deployed: boolean,
): Check | undefined {
  const raw = (env[FINGERPRINTS_VARIABLE] ?? "").trim();
  if (raw === "") {
    if (!deployed) return undefined;
    return {
      ...FINGERPRINTS,
      level: "error",
      message: `${FINGERPRINTS_VARIABLE} is not set, so this deployment cannot tell whether its shared secrets match the other app's.`,
      fix: "Run `pnpm staging:secrets` (DEPLOY.md, the first deployment's order): it sets the secrets and their fingerprints in both platforms.",
    };
  }
  const prints = parseFingerprints(raw);
  if (typeof prints === "string")
    return {
      ...FINGERPRINTS,
      level: "error",
      message: `${FINGERPRINTS_VARIABLE} is not what \`pnpm staging:secrets\` writes: ${prints}.`,
      fix: "Run `pnpm staging:secrets` again; never set this variable by hand.",
    };
  const mismatched: string[] = [];
  const unlisted: string[] = [];
  const blank: string[] = [];
  let compared = 0;
  for (const { spec, variable } of secretsOf(app).filter(({ spec }) => isShared(spec))) {
    const value = (env[variable] ?? "").trim();
    const listed = prints.get(spec.name);
    if (value === "") {
      if (listed !== undefined) blank.push(variable);
      continue;
    }
    if (listed === undefined) {
      unlisted.push(variable);
      continue;
    }
    compared++;
    if (fingerprint(spec.name, value) !== listed) mismatched.push(variable);
  }
  if (mismatched.length > 0 || blank.length > 0 || (deployed && unlisted.length > 0))
    return {
      ...FINGERPRINTS,
      level: "error",
      message:
        mismatched.length > 0
          ? `apps/${app} holds a shared secret that differs from the one \`pnpm staging:secrets\` set, so the calls between the apps that use it fail.`
          : `apps/${app} is missing a shared secret that the other app holds.`,
      details: [
        ...mismatched.map((name) => `${name}: does not match its fingerprint`),
        ...blank.map((name) => `${name}: not set, but fingerprinted`),
        ...(deployed ? unlisted.map((name) => `${name}: set, but has no fingerprint`) : []),
      ],
      fix: 'Run `pnpm staging:secrets`, which sets each shared secret in both platforms at once, then redeploy both apps (DEPLOY.md, "Rotating a secret").',
    };
  return {
    ...FINGERPRINTS,
    level: "ok",
    message:
      compared === 0
        ? "no shared secret to compare in this app."
        : `${compared} shared secret${compared === 1 ? "" : "s"} match${compared === 1 ? "es" : ""} the fingerprints.`,
  };
}

// ---------------------------------------------------------------------------------------------
// Payload's database over TLS (D136, 4)

/** The `sslmode`s that encrypt: libpq's `require` and above, and node-postgres' `no-verify`. */
const TLS_MODES = ["require", "verify-ca", "verify-full", "no-verify"];

/** What a Postgres connection string says about TLS. Never the string itself. */
export function postgresTls(
  url: string | undefined,
):
  | { tls: false; mode: string | undefined }
  | { tls: true; mode: string; libpq: boolean }
  | "invalid" {
  let parsed: URL;
  try {
    parsed = new URL((url ?? "").trim());
  } catch {
    return "invalid";
  }
  if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) return "invalid";
  const mode = parsed.searchParams.get("sslmode") ?? undefined;
  const ssl = parsed.searchParams.get("ssl");
  if (mode !== undefined && TLS_MODES.includes(mode))
    return { tls: true, mode, libpq: parsed.searchParams.get("uselibpqcompat") === "true" };
  if (mode === undefined && (ssl === "true" || ssl === "1"))
    return { tls: true, mode: "ssl=true", libpq: false };
  return { tls: false, mode };
}

const PAYLOAD_TLS = { id: "payload-database-tls", title: "Payload's database over TLS" } as const;

/**
 * On a deployment, Payload reaches its Postgres through Railway's TCP proxy, over the internet, so
 * its connection string must require TLS (D136, 4): no `sslmode`, or `disable`, `allow` or `prefer`
 * (which fall back to plain text), is an error. `require` without `uselibpqcompat=true` is a
 * warning: node-postgres then verifies the certificate against the system's CAs, which Railway's
 * self-signed one fails (DEPLOY.md, "Payload's database"). Outside a deployment, nothing to say.
 */
export function payloadDatabaseTlsCheck(env: EnvLike, deployed: boolean): Check | undefined {
  if (!deployed) return undefined;
  const url = env.PAYLOAD_DATABASE_URL;
  if ((url ?? "").trim() === "")
    return {
      ...PAYLOAD_TLS,
      level: "error",
      message: "PAYLOAD_DATABASE_URL is not set on this deployment.",
      fix: "Run `pnpm staging:secrets`: it copies the address from Railway, with TLS required.",
    };
  const tls = postgresTls(url);
  if (tls === "invalid")
    return {
      ...PAYLOAD_TLS,
      level: "error",
      message: "PAYLOAD_DATABASE_URL is not a postgres:// connection string.",
      fix: "Run `pnpm staging:secrets`: it copies the address from Railway, with TLS required.",
    };
  if (!tls.tls)
    return {
      ...PAYLOAD_TLS,
      level: "error",
      message: `PAYLOAD_DATABASE_URL does not require TLS (sslmode ${tls.mode ?? "not set"}), so Payload's queries and its database password would cross the internet in plain text.`,
      fix: "Add `sslmode=require&uselibpqcompat=true` to it, or run `pnpm staging:secrets`, which does.",
    };
  if (tls.mode === "require" && !tls.libpq)
    return {
      ...PAYLOAD_TLS,
      level: "warn",
      message:
        "PAYLOAD_DATABASE_URL has sslmode=require without uselibpqcompat=true: node-postgres then verifies the certificate as verify-full does, which Railway's self-signed one fails.",
      fix: "Add `uselibpqcompat=true` (libpq's meaning of require: encrypted, certificate not checked).",
    };
  return { ...PAYLOAD_TLS, level: "ok", message: `TLS required (${tls.mode}).` };
}
