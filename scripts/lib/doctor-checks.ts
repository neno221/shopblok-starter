// What `pnpm run doctor` concludes (T14), as pure functions: the env of both apps and the answers
// of the servers come in, `Check`s come out. `doctor.ts` does the looking (reads the files, opens the
// sockets, calls the servers); every decision that can be wrong lives here, with a test.
import type { AppEnvs, IntegrationStatus } from "./integrations.ts";
import type { Check } from "./report.ts";

const isSet = (value: string | undefined): boolean => (value ?? "").trim() !== "";

// ---------------------------------------------------------------------------------------------
// From the environment alone

export type Context = {
  /** `NODE_ENV` as the backend would see it: the shell's, else the backend `.env`'s. */
  nodeEnv: string | undefined;
  /** Any of `VERCEL`, `VERCEL_ENV` or `VERCEL_URL` is set: the storefront is (or is built for) Vercel. */
  vercel: boolean;
};

const statusOf = (statuses: readonly IntegrationStatus[], id: IntegrationStatus["id"]) =>
  statuses.find((status) => status.id === id);

/** One warning for each integration that has some of its keys and not all (SPEC §10). */
function halfConfigured(statuses: readonly IntegrationStatus[]): Check[] {
  return statuses
    .filter((status) => status.half)
    .map((status) => ({
      id: `integration-${status.id}`,
      title: `${status.name} keys`,
      level: "warn",
      message: `${status.name} has some of its keys and not all of them, so it stays on ${status.fallback}.`,
      details: status.parts
        .filter((part) => part.missing.length > 0)
        .map((part) => `apps/${part.app}: ${part.missing.join(", ")} not set (${part.what})`),
      fix: "Set the missing keys, or remove the ones that are set.",
    }));
}

/**
 * Sign-up requires email verification (SPEC §10.2, M3), so the Medusa notification provider has to
 * deliver mail. Without Resend the verification link is only printed in the backend's console.
 */
function emailVerification(statuses: readonly IntegrationStatus[]): Check {
  const resend = statusOf(statuses, "resend");
  const backend = resend?.parts.find((part) => part.app === "backend");
  if (resend?.state === "live") {
    return {
      id: "email-verification",
      title: "Email verification",
      level: "ok",
      message: "Resend delivers the verification emails.",
    };
  }
  const keysSet = backend?.configured === true;
  return {
    id: "email-verification",
    title: "Email verification",
    level: "warn",
    message: keysSet
      ? `Sign-up requires email verification, and the Resend keys are set, but the Resend provider arrives in ${resend?.arrives ?? "a later milestone"}: verification links are only printed in the backend's console (notification-local).`
      : "Sign-up requires email verification, but there is no Resend key: verification links are only printed in the backend's console (notification-local).",
    fix: "Fine for development. Before opening sign-ups, verify a sending domain with Resend and set RESEND_API_KEY and RESEND_FROM_EMAIL in both apps (SPEC §16, item 2).",
  };
}

/** Vercel's disk is read-only, so Payload's uploads need R2 there (SPEC §10.7). */
function vercelStorage(statuses: readonly IntegrationStatus[], context: Context): Check[] {
  if (!context.vercel) return [];
  const storefront = statusOf(statuses, "r2")?.parts.find((part) => part.app === "storefront");
  if (storefront?.configured === true) {
    return [
      {
        id: "vercel-storage",
        title: "Media storage on Vercel",
        level: "ok",
        message: "The S3_* keys for Payload's media are set.",
      },
    ];
  }
  return [
    {
      id: "vercel-storage",
      title: "Media storage on Vercel",
      level: "warn",
      message:
        "This environment looks like Vercel but has no S3_* keys for Payload's media. Vercel's file system is read-only, so uploading an image will fail.",
      details: [`not set: ${storefront?.missing.join(", ") ?? "S3_*"}`],
      fix: "Set the S3_* keys of a Cloudflare R2 bucket in the Vercel project (SPEC §10.7).",
    },
  ];
}

/**
 * With `REDIS_URL` blank the backend runs its in-memory event bus, workflow engine and locking. That
 * is for development: in production, events never leave the process, so a worker never sees them
 * (T06 item 7; nothing enforces it earlier, because `medusa build` loads the config without runtime
 * env). The opposite case, `REDIS_URL` set and Redis down, is the Redis probe's.
 */
function redisInProduction(statuses: readonly IntegrationStatus[], context: Context): Check[] {
  if (context.nodeEnv !== "production") return [];
  if (statusOf(statuses, "redis")?.configured === true) return [];
  return [
    {
      id: "redis-production",
      title: "Redis in production",
      level: "warn",
      message:
        "NODE_ENV is production and REDIS_URL is blank, so the backend boots on its in-memory event bus, workflow engine and locking (Medusa logs `A fake redis instance will be used`). Events never leave the process, so a separate worker would receive none, and sessions are lost on a restart.",
      fix: "Set REDIS_URL (SPEC §10.6).",
    },
  ];
}

/** The key the storefront sends to Medusa on every request. It is written into the build. */
function publishableKey(envs: AppEnvs): Check {
  const key = (envs.storefront.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "").trim();
  if (key === "") {
    return {
      id: "publishable-key",
      title: "Medusa publishable key",
      level: "warn",
      message:
        "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set in the storefront, so Medusa refuses every request it makes (HTTP 400).",
      fix: "Run `pnpm bootstrap`, then build the storefront again: `next build` writes the key into it.",
    };
  }
  if (!key.startsWith("pk_")) {
    return {
      id: "publishable-key",
      title: "Medusa publishable key",
      level: "error",
      message:
        "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY does not start with `pk_`. The `apk_…` value is the key's id; the storefront needs its token.",
      fix: "Run `pnpm bootstrap`, which writes the token, then build the storefront again.",
    };
  }
  return {
    id: "publishable-key",
    title: "Medusa publishable key",
    level: "ok",
    message: "set in the storefront.",
  };
}

/** What the Medusa → Payload sync (M4) signs in with. */
function payloadKey(envs: AppEnvs): Check {
  const missing = ["PAYLOAD_API_KEY", "PAYLOAD_SERVER_URL"].filter(
    (name) => !isSet(envs.backend[name]),
  );
  if (missing.length === 0) {
    return {
      id: "payload-key",
      title: "Payload integrations key",
      level: "ok",
      message: "PAYLOAD_API_KEY and PAYLOAD_SERVER_URL are set in the backend.",
    };
  }
  return {
    id: "payload-key",
    title: "Payload integrations key",
    level: "warn",
    message: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set in the backend, so the Medusa → Payload sync (M4) could not sign in to Payload.`,
    fix: "Run `pnpm bootstrap`: it creates the `integrations` user and writes the key.",
  };
}

/**
 * The signing secrets. Production refuses to start without them; in development bootstrap fills
 * them in, and Medusa falls back to a public default (with a warning) when they are blank.
 */
function secrets(envs: AppEnvs, context: Context): Check {
  const missing = [
    ...["JWT_SECRET", "COOKIE_SECRET"]
      .filter((name) => !isSet(envs.backend[name]))
      .map((name) => `${name} (apps/backend)`),
    ...["PAYLOAD_SECRET"]
      .filter((name) => !isSet(envs.storefront[name]))
      .map((name) => `${name} (apps/storefront)`),
  ];
  if (missing.length === 0) {
    return {
      id: "secrets",
      title: "Signing secrets",
      level: "ok",
      message: "JWT_SECRET, COOKIE_SECRET and PAYLOAD_SECRET are set.",
    };
  }
  const production = context.nodeEnv === "production";
  return {
    id: "secrets",
    title: "Signing secrets",
    level: production ? "error" : "warn",
    message: production
      ? "NODE_ENV is production and these secrets are blank; the apps refuse to start."
      : "These secrets are blank: Medusa falls back to a public default, and Payload refuses to start without its own.",
    details: missing.map((name) => `not set: ${name}`),
    fix: production
      ? "Set a fresh random value for each (SPEC §16, item 6)."
      : "Run `pnpm bootstrap`, which generates them.",
  };
}

/** Everything the environment alone can tell, in the order the table shows it. */
export function configChecks(
  envs: AppEnvs,
  statuses: readonly IntegrationStatus[],
  context: Context,
): Check[] {
  return [
    secrets(envs, context),
    publishableKey(envs),
    payloadKey(envs),
    emailVerification(statuses),
    ...vercelStorage(statuses, context),
    ...redisInProduction(statuses, context),
    ...halfConfigured(statuses),
  ];
}

// ---------------------------------------------------------------------------------------------
// From a server's answer

/** Whether the search index has a field for `currency`'s prices. */
export type SearchFieldState =
  | { state: "present" }
  /** The index has no such field: the currency was added without `db:migrate`. */
  | { state: "missing" }
  /** The answer does not say (another status, another message): do not guess. */
  | { state: "unknown"; detail: string };

/**
 * Reads the answer to `POST /store/search` with a `stats` facet on `min_price_<currency>` (T08, D17).
 * Measured on 2.21.2, `200` and `results[0].facets["min_price_eur"]` is `{"type":"stats",…}` when
 * the index has the field. When it has not, there are two answers, both `400`, depending on how far
 * the currency got:
 *
 * - the store does not know the currency at all: `Unknown field "min_price_brl" used in
 *   search_options.facets on search index "product"`;
 * - the store has the currency and its region (the seed ran) but the index was not migrated
 *   (`medusa db:migrate` plans a new index version; this is the case D17 is about):
 *   `Field "min_price_brl" is not facetable on the postgres search provider`.
 *
 * A `200` with no facet for the field also counts as missing, as the plan says ("fails or finds no
 * field"). Any other answer is `unknown`, because a different message may mean the request shape
 * changed (a body with a top-level `facets` gets `Field 'queries' is required`).
 */
export function classifySearchField(
  field: string,
  answer: { status: number; body: unknown },
): SearchFieldState {
  const body = answer.body as
    { results?: { facets?: Record<string, unknown> }[]; message?: unknown } | undefined;
  if (answer.status === 200) {
    return body?.results?.[0]?.facets?.[field] !== undefined
      ? { state: "present" }
      : { state: "missing" };
  }
  const message = typeof body?.message === "string" ? body.message : "";
  if (
    answer.status === 400 &&
    (message.includes(`Unknown field "${field}"`) ||
      message.includes(`Field "${field}" is not facetable`))
  ) {
    return { state: "missing" };
  }
  return {
    state: "unknown",
    detail: `HTTP ${answer.status}${message === "" ? "" : `: ${message.slice(0, 160)}`}`,
  };
}

export type LiveRegion = { name: string; currency: string; countries: string[] };

/** The regions out of `GET /store/regions?fields=…,*countries`, or why they are not there. */
export function readRegions(answer: { status: number; body: unknown }): LiveRegion[] | string {
  if (answer.status === 400) {
    return "Medusa refused the publishable key (HTTP 400)";
  }
  if (answer.status !== 200) return `HTTP ${answer.status}`;
  const regions = (answer.body as { regions?: unknown } | undefined)?.regions;
  if (!Array.isArray(regions)) return "the answer has no `regions` list";
  return regions.map((region) => {
    const r = region as {
      name?: unknown;
      currency_code?: unknown;
      countries?: { iso_2?: unknown }[];
    };
    return {
      name: String(r.name ?? ""),
      currency: String(r.currency_code ?? ""),
      countries: (r.countries ?? []).flatMap((c) => (typeof c.iso_2 === "string" ? [c.iso_2] : [])),
    };
  });
}

/** The locale codes out of `GET /store/locales`, or why they are not there. */
export function readLocales(answer: { status: number; body: unknown }): string[] | string {
  if (answer.status !== 200) return `HTTP ${answer.status}`;
  const locales = (answer.body as { locales?: unknown } | undefined)?.locales;
  if (!Array.isArray(locales)) return "the answer has no `locales` list";
  return locales.flatMap((l) => {
    const code = (l as { code?: unknown } | null)?.code;
    return typeof code === "string" ? [code] : [];
  });
}

/**
 * Medusa's state against the storefront's map (T12 item 9): every open country has a region and
 * every language's Medusa locale is in the store. Offline, `compareMarkets` compares the two files;
 * this compares what the running backend really has, which is what a shopper meets after someone
 * edits the file and forgets `pnpm bootstrap`.
 */
export function compareWithMedusa(
  live: { regions: readonly LiveRegion[]; locales: readonly string[] },
  map: {
    countries: readonly { code: string; enabled: boolean; languages: readonly string[] }[];
    languages: readonly { code: string; medusaLocale: string }[];
  },
): string[] {
  const problems: string[] = [];
  const served = new Set(live.regions.flatMap((region) => region.countries));
  for (const country of map.countries.filter((c) => c.enabled)) {
    if (!served.has(country.code)) {
      problems.push(`Medusa has no region for the open country "${country.code}"`);
    }
  }
  const used = new Set(map.countries.filter((c) => c.enabled).flatMap((c) => c.languages));
  for (const code of used) {
    const locale = map.languages.find((language) => language.code === code)?.medusaLocale;
    if (locale && !live.locales.includes(locale)) {
      problems.push(`Medusa's store has no locale "${locale}" (language "${code}")`);
    }
  }
  return problems;
}

/** `GET {payload}/api/integrations/me` with the integrations key: who does Payload think this is? */
export function classifyPayloadAuth(answer: {
  status: number;
  body: unknown;
}): "ok" | "rejected" | "unknown" {
  const user = (answer.body as { user?: { collection?: unknown } | null } | undefined)?.user;
  if (answer.status === 200 && user?.collection === "integrations") return "ok";
  if (answer.status === 401 || answer.status === 403) return "rejected";
  // Payload answers 200 with `"user": null` for a key it does not know.
  if (answer.status === 200 && (user === null || user === undefined)) return "rejected";
  return "unknown";
}

// ---------------------------------------------------------------------------------------------
// From `payload run`

/** Why `payload run src/scripts/doctor-payload.ts` failed, from its log: the known causes, else its last line. */
export function explainPayloadFailure(output: string): { cause: string; fix: string } {
  const text = output;
  if (/database "[^"]*" does not exist/.test(text)) {
    return {
      cause: "the payload database does not exist",
      fix: "Run `pnpm bootstrap`. (Doctor opens Payload as in production, which never creates a missing database.)",
    };
  }
  if (/relation "[^"]*" does not exist/.test(text)) {
    return {
      cause: "the payload database is not migrated",
      fix: "Run `pnpm bootstrap` (it runs `payload migrate`).",
    };
  }
  if (/missing secret key/i.test(text)) {
    return {
      cause: "PAYLOAD_SECRET is not set in apps/storefront/.env",
      fix: "Run `pnpm bootstrap`, which generates it.",
    };
  }
  if (/(password authentication failed|ECONNREFUSED|cannot connect to postgres)/i.test(text)) {
    return {
      cause: "Payload could not connect to its database",
      fix: "Check PAYLOAD_DATABASE_URL in apps/storefront/.env and that `pnpm infra:up` has run.",
    };
  }
  const last = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("at "))
    .at(-1);
  return {
    cause: last ? `Payload failed: ${last.slice(0, 200)}` : "Payload failed without a message",
    fix: "Run `pnpm --filter @shopblok/storefront exec payload run src/scripts/doctor-payload.ts` to see the full log.",
  };
}
