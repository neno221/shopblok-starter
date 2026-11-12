// What `pnpm run doctor` concludes (T14), as pure functions: the env of both apps and the answers
// of the servers come in, `Check`s come out. `doctor.ts` does the looking (reads the files, opens the
// sockets, calls the servers); every decision that can be wrong lives here, with a test.
import type { RunResult } from "./exec.ts";
import { describeUnreachable, jsonOf, type HttpResult } from "./http.ts";
import { isSet, type AppEnvs, type AppName, type IntegrationStatus } from "@shopblok/integrations";
import type { BackendMarkets } from "./markets-check.ts";
import type { Check } from "./report.ts";

// What the `--online` checks are called: the table, `--json` and CI key on these.
const PAYLOAD_AUTH = { id: "payload-auth", title: "Payload accepts the integrations key" } as const;
const MEDUSA_MARKETS = {
  id: "medusa-markets",
  title: "Medusa answers the storefront's key",
} as const;
const MEDUSA_ORPHANS = { id: "medusa-orphans", title: "Medusa regions left over" } as const;
const SEARCH_INDEX = { id: "search-index", title: "Search index currencies" } as const;
const RESEND_DOMAIN = { id: "resend-domain", title: "Resend sender domain" } as const;
const SENTRY_DSN = { id: "sentry-dsn", title: "Sentry DSN" } as const;
const SENTRY_ONLINE = { id: "sentry-envelope", title: "Sentry accepts the DSN" } as const;

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
 * deliver mail. Medusa sends through Resend whenever the backend has its two keys (T98, D121: the
 * `email` channel); without them the verification link is only printed in the backend's console.
 */
function emailVerification(statuses: readonly IntegrationStatus[]): Check {
  const resend = statusOf(statuses, "resend");
  const backend = resend?.parts.find((part) => part.app === "backend");
  if (backend?.configured === true && resend?.wired === true) {
    return {
      id: "email-verification",
      title: "Email verification",
      level: "ok",
      message: "Resend delivers the verification emails (Medusa's email channel).",
    };
  }
  return {
    id: "email-verification",
    title: "Email verification",
    level: "warn",
    message:
      "Sign-up requires email verification, but the backend has no Resend key: verification links are only printed in the backend's console (notification-local).",
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

/** What the Medusa → Payload sync (T60) signs in with. */
function payloadKey(envs: AppEnvs): Check {
  const missing = ["PAYLOAD_API_KEY", "PAYLOAD_SERVER_URL"].filter(
    (name) => !isSet(envs.backend, name),
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
    message: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set in the backend, so the Medusa → Payload sync could not sign in to Payload.`,
    fix: "Run `pnpm bootstrap`: it creates the `integrations` user and writes the key.",
  };
}

/**
 * The `NODE_ENV` values where the backend takes a blank secret and falls back to Medusa's public
 * default (`DEFAULT_SECRET_ENVS` in apps/backend/src/config/config.ts, which also allows none).
 * Anywhere else, production and staging alike, it refuses to start.
 */
const BLANK_SECRET_ENVS = ["development", "test"];

/**
 * The signing secrets. Outside development and test the backend refuses to start without them; in
 * development bootstrap fills them in, and Medusa falls back to a public default (with a warning)
 * when they are blank.
 */
function secrets(envs: AppEnvs, context: Context): Check {
  const missing = [
    ...["JWT_SECRET", "COOKIE_SECRET"]
      .filter((name) => !isSet(envs.backend, name))
      .map((name) => `${name} (apps/backend)`),
    ...["PAYLOAD_SECRET"]
      .filter((name) => !isSet(envs.storefront, name))
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
  const refuses = context.nodeEnv !== undefined && !BLANK_SECRET_ENVS.includes(context.nodeEnv);
  return {
    id: "secrets",
    title: "Signing secrets",
    level: refuses ? "error" : "warn",
    message: refuses
      ? `NODE_ENV is ${context.nodeEnv} and these secrets are blank; the apps refuse to start.`
      : "These secrets are blank: Medusa falls back to a public default, and Payload refuses to start without its own.",
    details: missing.map((name) => `not set: ${name}`),
    fix: refuses
      ? "Set a fresh random value for each (SPEC §16, item 6)."
      : "Run `pnpm bootstrap`, which generates them.",
  };
}

/**
 * The preview and jobs secrets (T59, D74). Without `PREVIEW_SECRET` every `/next/preview` answers
 * 401, so editors cannot preview; without `CRON_SECRET` only an admin can run jobs, so nothing
 * scheduled is published. A warning in development and test (bootstrap generates both), an error
 * anywhere else, as for the signing secrets: production needs both for Vercel Cron and live preview.
 */
function previewAndCronSecrets(envs: AppEnvs, context: Context): Check {
  const missing = ["PREVIEW_SECRET", "CRON_SECRET"].filter((name) => !isSet(envs.storefront, name));
  if (missing.length === 0) {
    return {
      id: "preview-cron-secrets",
      title: "Preview and jobs secrets",
      level: "ok",
      message: "PREVIEW_SECRET and CRON_SECRET are set.",
    };
  }
  const production = context.nodeEnv !== undefined && !BLANK_SECRET_ENVS.includes(context.nodeEnv);
  return {
    id: "preview-cron-secrets",
    title: "Preview and jobs secrets",
    level: production ? "error" : "warn",
    message:
      "Blank: without PREVIEW_SECRET nobody can preview a draft, and without CRON_SECRET scheduled publishing never runs (only an admin may run jobs).",
    details: missing.map((name) => `not set: ${name} (apps/storefront)`),
    fix: production
      ? "Set a fresh random value for each, and the same CRON_SECRET in Vercel Cron's settings."
      : "Run `pnpm bootstrap`, which generates them.",
  };
}

/**
 * Stripe's live keys, by their prefix (M6 D115): a secret key `sk_live_`, a restricted key
 * `rk_live_`, a publishable key `pk_live_`. The test ones start `sk_test_`, `rk_test_`, `pk_test_`.
 */
const STRIPE_LIVE_PREFIXES = ["sk_live_", "rk_live_", "pk_live_"] as const;
const STRIPE_KEYS: readonly { app: keyof AppEnvs; name: string }[] = [
  { app: "backend", name: "STRIPE_API_KEY" },
  { app: "storefront", name: "NEXT_PUBLIC_STRIPE_KEY" },
];

/**
 * Whether an app runs as production, and what says so. On Vercel `VERCEL_ENV` decides: Vercel builds
 * and runs every deployment, previews included, with `NODE_ENV=production`, so only
 * `VERCEL_ENV=production` counts there (PR 134 review, item 4). Elsewhere `NODE_ENV` does.
 */
function productionStage(env: Record<string, string | undefined>): {
  production: boolean;
  said: string;
} {
  const vercelEnv = (env.VERCEL_ENV ?? "").trim();
  if (vercelEnv !== "")
    return { production: vercelEnv === "production", said: `VERCEL_ENV ${vercelEnv}` };
  const nodeEnv = (env.NODE_ENV ?? "").trim();
  return {
    production: nodeEnv === "production",
    said: `NODE_ENV ${nodeEnv === "" ? "not set" : nodeEnv}`,
  };
}

/**
 * Test mode only, outside production (M6 D115): a live Stripe key in development, in a test run, in a
 * cloud session or in a Vercel preview charges real cards. Each app is judged by its own environment
 * (the shell's, else its `.env`'s; `productionStage`), so a production backend beside a development
 * storefront is still caught. The value is never printed, only the variable's name and the kind of
 * key.
 */
function stripeLiveKeys(envs: AppEnvs): Check[] {
  const live = STRIPE_KEYS.filter(({ app, name }) => {
    const value = (envs[app][name] ?? "").trim();
    return (
      !productionStage(envs[app]).production &&
      STRIPE_LIVE_PREFIXES.some((p) => value.startsWith(p))
    );
  });
  if (live.length === 0) return [];
  return [
    {
      id: "stripe-live-key",
      title: "Stripe test mode",
      level: "error",
      message:
        "A live Stripe key is set outside production (NODE_ENV=production, or VERCEL_ENV=production on Vercel). Development, tests, cloud sessions and previews use test keys only, so that no real card is charged.",
      details: live.map(
        ({ app, name }) =>
          `apps/${app}: ${name} is a live key (${productionStage(envs[app]).said})`,
      ),
      fix: "Use the test keys from Stripe's Dashboard in test mode (sk_test_…, pk_test_…); live keys belong only in production's environment.",
    },
  ];
}

/** Everything the environment alone can tell, in the order the table shows it. */
export function configChecks(
  envs: AppEnvs,
  statuses: readonly IntegrationStatus[],
  context: Context,
): Check[] {
  return [
    ...stripeLiveKeys(envs),
    secrets(envs, context),
    previewAndCronSecrets(envs, context),
    publishableKey(envs),
    payloadKey(envs),
    emailVerification(statuses),
    ...vercelStorage(statuses, context),
    ...redisInProduction(statuses, context),
    ...halfConfigured(statuses),
    ...sentryDsnChecks(envs),
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
 * Regions that Medusa has and `config/markets.ts` does not list: what is left after a market is taken
 * out of the file (`seed-markets.ts` adds regions and never removes one). They are found by their
 * countries, not their names, so an admin's rename does not hide one. A region with no country is
 * not counted: nothing can be sold through it.
 */
export function orphanRegions(live: readonly LiveRegion[], config: BackendMarkets): LiveRegion[] {
  const listed = new Set(config.regions.flatMap((region) => region.countries));
  return live.filter(
    (region) =>
      region.countries.length > 0 && region.countries.every((country) => !listed.has(country)),
  );
}

/** `GET {payload}/api/integrations/me` with the integrations key: who does Payload think this is? */
export function classifyPayloadAuth(answer: {
  status: number;
  body: unknown;
}): "ok" | "rejected" | "unknown" {
  const user = (answer.body as { user?: { collection?: unknown } | null } | null | undefined)?.user;
  if (answer.status === 200 && user?.collection === "integrations") return "ok";
  if (answer.status === 401 || answer.status === 403) return "rejected";
  // Payload answers 200 with `"user": null` for a key it does not know. A 200 that is not that JSON
  // (a proxy's HTML page, another app on the port) says nothing about the key.
  if (answer.status === 200 && user === null) return "rejected";
  return "unknown";
}

// ---------------------------------------------------------------------------------------------
// --online: the checks, from the answers

/** The backend → Payload link. `answer` is `undefined` when there was no URL or key to ask with. */
export function payloadAuthCheck(payloadUrl: string, answer: HttpResult | undefined): Check {
  if (answer === undefined) {
    return {
      ...PAYLOAD_AUTH,
      level: "warn",
      message: "not checked: PAYLOAD_SERVER_URL or PAYLOAD_API_KEY is not set in the backend.",
      fix: "Run `pnpm bootstrap`.",
    };
  }
  if (answer.kind !== "response") {
    return {
      ...PAYLOAD_AUTH,
      level: "warn",
      message: `not checked: ${payloadUrl} ${describeUnreachable(answer)}.`,
      fix: "Start the storefront (Payload is embedded in it) with `pnpm dev`.",
    };
  }
  const verdict = classifyPayloadAuth({ status: answer.status, body: jsonOf(answer) });
  if (verdict === "ok") {
    return {
      ...PAYLOAD_AUTH,
      level: "ok",
      message: `GET ${payloadUrl}/api/integrations/me answers as the integrations user.`,
    };
  }
  return verdict === "rejected"
    ? {
        ...PAYLOAD_AUTH,
        level: "error",
        message: `Payload at ${payloadUrl} does not accept PAYLOAD_API_KEY.`,
        fix: "Run `pnpm bootstrap`: it sets the key again on the `integrations` user (a wiped database or a new PAYLOAD_SECRET invalidates it).",
      }
    : {
        ...PAYLOAD_AUTH,
        level: "error",
        message: `GET ${payloadUrl}/api/integrations/me answered HTTP ${answer.status}, not a user.`,
        fix: "Check that PAYLOAD_SERVER_URL is the storefront's own address (not a proxy or another app on that port); `pnpm bootstrap` sets it.",
      };
}

function localesOf(answer: HttpResult): string[] | string {
  return answer.kind === "response"
    ? readLocales({ status: answer.status, body: jsonOf(answer) })
    : `Medusa ${describeUnreachable(answer)}`;
}

/**
 * Whether the running Medusa answers the storefront's publishable key with its regions and locales
 * (`GET /store/regions`, `/store/locales`). `answers` is `undefined` when the storefront has no key
 * to ask with. The regions come back when the later checks (the leftover regions, the search index)
 * can go on. It does not compare them with the market map: `marketsCheck` does that, from the same
 * Medusa, and a second comparison reported one gap twice in different words (T75 review, item 6).
 */
export function medusaMarketsCheck(
  medusaUrl: string,
  answers: { regions: HttpResult; locales: HttpResult } | undefined,
): { check: Check; regions?: LiveRegion[] } {
  const check = (c: Omit<Check, "id" | "title">): Check => ({ ...MEDUSA_MARKETS, ...c });

  if (answers === undefined) {
    return {
      check: check({
        level: "warn",
        message: "not checked: the storefront has no publishable key.",
        fix: "Run `pnpm bootstrap`.",
      }),
    };
  }
  if (answers.regions.kind !== "response") {
    return {
      check: check({
        level: "warn",
        message: `not checked: Medusa at ${medusaUrl} ${describeUnreachable(answers.regions)}.`,
        fix: "Start it with `pnpm dev`.",
      }),
    };
  }
  const regions = readRegions({ status: answers.regions.status, body: jsonOf(answers.regions) });
  if (typeof regions === "string") {
    return {
      check: check({
        level: "error",
        message: `GET /store/regions with the storefront's key failed: ${regions}.`,
        fix: "The key belongs to the database. Run `pnpm bootstrap` (it writes the current key), then build the storefront again.",
      }),
    };
  }

  const locales = localesOf(answers.locales);
  if (typeof locales === "string") {
    return {
      regions,
      check: check({
        level: "warn",
        message: "Medusa's regions answer, but its locales could not be read.",
        details: [
          `could not read Medusa's locales (${locales}); /store/locales is served by the translation feature (MEDUSA_FF_TRANSLATION must not be false)`,
        ],
      }),
    };
  }
  return {
    regions,
    check: check({
      level: "ok",
      message: `${regions.length} regions and ${locales.length} locales answer the storefront's key.`,
    }),
  };
}

/** The leftover regions as one warning, or `undefined` when there are none. */
export function orphanRegionsCheck(orphans: readonly LiveRegion[]): Check | undefined {
  if (orphans.length === 0) return undefined;
  return {
    ...MEDUSA_ORPHANS,
    level: "warn",
    message: `Medusa has ${orphans.length === 1 ? "a region" : "regions"} that apps/backend/src/config/markets.ts does not list: the seed adds regions and never removes one.`,
    details: orphans.map(
      (region) => `"${region.name}" (${region.currency}): ${region.countries.join(", ")}`,
    ),
    fix: "Delete them in the Medusa admin (Settings → Regions), or add the market back to the file.",
  };
}

/**
 * The currencies whose price fields the search index must have (T08, D17): those of the regions that
 * are in the file. A leftover region's currency is not in the file, so the index does not have it
 * and should not; but a currency that a region in the file also uses still counts.
 */
export function searchCurrencies(
  regions: readonly LiveRegion[],
  orphans: readonly LiveRegion[],
): string[] {
  return [
    ...new Set(
      regions
        .filter((region) => !orphans.includes(region))
        .map((region) => region.currency)
        .filter((currency) => currency !== ""),
    ),
  ];
}

/** What `POST /store/search` with a `min_price_<currency>` facet says about `currency`. */
export function searchFieldOf(currency: string, answer: HttpResult): SearchFieldState {
  return answer.kind === "response"
    ? classifySearchField(`min_price_${currency}`, {
        status: answer.status,
        body: jsonOf(answer),
      })
    : { state: "unknown", detail: "Medusa did not answer" };
}

/** Whether the search index has a price field for every currency that was asked about. */
export function searchIndexCheck(
  entries: readonly { currency: string; state: SearchFieldState }[],
): Check {
  const missing = entries.filter((e) => e.state.state === "missing").map((e) => e.currency);
  const unknown = entries.flatMap((e) =>
    e.state.state === "unknown" ? [`${e.currency}: ${e.state.detail}`] : [],
  );
  if (missing.length > 0) {
    const one = missing.length === 1;
    return {
      ...SEARCH_INDEX,
      level: "warn",
      message: `Medusa has regions in ${missing.join(", ")}, but the search index has no price fields for ${one ? "it" : "them"}, so price filtering and sorting in ${one ? "that currency" : "those currencies"} fail.`,
      fix: "Run `medusa db:migrate` (or `pnpm bootstrap`, which does) and restart the backend: a new currency only reaches the index through a migration (D17, T08).",
    };
  }
  if (entries.length === 0) {
    // "ok" for nothing would vouch for what was never asked.
    return {
      ...SEARCH_INDEX,
      level: "warn",
      message:
        "not checked: Medusa has no region with a currency of the market list, so there is no price field to look for.",
      fix: "Run `pnpm bootstrap`: it seeds the regions from apps/backend/src/config/markets.ts.",
    };
  }
  if (unknown.length > 0) {
    return {
      ...SEARCH_INDEX,
      level: "warn",
      message:
        "could not tell whether the search index has a price field for every region's currency.",
      details: unknown,
    };
  }
  return {
    ...SEARCH_INDEX,
    level: "ok",
    message: `min_price_<currency> exists for ${entries.map((e) => e.currency).join(", ")}.`,
  };
}

// ---------------------------------------------------------------------------------------------
// --online: Resend's sender domain (T98, M6 D121)

/** Resend's shared test domain: it sends only to the account's own address and Resend's test ones. */
const RESEND_TEST_DOMAIN = "resend.dev";

/**
 * The domain of a sender as `RESEND_FROM_EMAIL` holds it (`shop@example.com` or
 * `Shop <shop@example.com>`), in lower case, or `undefined` when it holds no address.
 */
export function senderDomain(from: string | undefined): string | undefined {
  const value = (from ?? "").trim();
  const address = /<([^<>]+)>\s*$/.exec(value)?.[1] ?? value;
  const domain = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(address.trim())?.[1];
  return domain?.toLowerCase();
}

/** The state of `domain` in Resend's `GET /domains`, or why it could not be read. */
export function resendDomainState(
  domain: string,
  answer: HttpResult,
):
  | { kind: "verified" | "not-verified"; status: string }
  | { kind: "missing" }
  | { kind: "restricted" }
  | { kind: "unknown"; reason: string } {
  if (answer.kind !== "response")
    return { kind: "unknown", reason: `Resend ${describeUnreachable(answer)}` };
  const body = jsonOf(answer) as { name?: unknown; data?: unknown } | undefined;
  // A key with sending access only (Resend's "restricted_api_key") cannot list the domains.
  if (answer.status === 401 && body?.name === "restricted_api_key") return { kind: "restricted" };
  if (answer.status !== 200 || !Array.isArray(body?.data))
    return { kind: "unknown", reason: `Resend answered HTTP ${answer.status}` };
  const found = (body.data as { name?: unknown; status?: unknown }[]).find(
    (entry) => typeof entry?.name === "string" && entry.name.toLowerCase() === domain,
  );
  if (found === undefined) return { kind: "missing" };
  const status = typeof found.status === "string" ? found.status : "unknown";
  // `partially_verified`: sending works (only receiving, or a second record, waits).
  return status === "verified" || status === "partially_verified"
    ? { kind: "verified", status }
    : { kind: "not-verified", status };
}

/**
 * `doctor --online`: is `RESEND_FROM_EMAIL`'s domain verified with Resend, so the shop can e-mail its
 * customers (M6 D121)? A warning in development, an error in production (sign-ups need the
 * verification e-mail, SPEC §16 item 2): production as `productionStage` says for any of `apps`, so
 * a Vercel preview is development (PR 135 review, item 6). One check per sender and key: `apps` are
 * the apps that send with them (both, when their `.env` files agree). `answer` is Resend's
 * `GET /domains` with the key; doctor asks nothing (`undefined`) only for a sender without an
 * address or at Resend's test domain, which this check settles before it reads the answer.
 */
export function resendDomainCheck(
  apps: readonly AppName[],
  from: string | undefined,
  answer: HttpResult | undefined,
  envs: Readonly<Partial<Record<AppName, Record<string, string | undefined>>>>,
): Check {
  const production = apps.some((app) => productionStage(envs[app] ?? {}).production);
  const notReady = production ? "error" : "warn";
  const check = (c: Omit<Check, "id" | "title">): Check => ({
    id: [RESEND_DOMAIN.id, ...apps].join("-"),
    title: `${RESEND_DOMAIN.title} (${apps.map((app) => `apps/${app}`).join(" and ")})`,
    ...c,
  });
  const domain = senderDomain(from);
  const fix =
    'Add your domain in Resend (Domains), publish its DNS records, and set RESEND_FROM_EMAIL to an address of it (SETUP.md, "E-mails and Resend (T98)").';
  if (domain === undefined)
    return check({
      level: "error",
      message: "RESEND_FROM_EMAIL is not an e-mail address, so Resend refuses every e-mail.",
      fix,
    });
  if (domain === RESEND_TEST_DOMAIN)
    return check({
      level: notReady,
      message: `RESEND_FROM_EMAIL is Resend's test sender (@${RESEND_TEST_DOMAIN}): Resend delivers only to the account's own address and its test addresses, so customers get no e-mail.`,
      fix: production ? fix : `Fine for development. ${fix}`,
    });
  if (answer === undefined)
    throw new Error(`resendDomainCheck: doctor did not ask Resend about ${domain}.`);
  const state = resendDomainState(domain, answer);
  switch (state.kind) {
    case "verified":
      return check({
        level: "ok",
        message: `${domain} is verified with Resend (${state.status}).`,
      });
    case "not-verified":
      return check({
        level: notReady,
        message: `${domain} is in Resend but not verified (${state.status}), so Resend refuses e-mails from it.`,
        fix: "Publish the DNS records Resend shows for the domain and press Verify DNS Records.",
      });
    case "missing":
      return check({
        level: notReady,
        message: `${domain} is not a domain of this Resend account, so Resend refuses e-mails from it.`,
        fix,
      });
    case "restricted":
      return check({
        level: "warn",
        message: `not checked: this RESEND_API_KEY can only send, so it cannot list the domains to find ${domain}.`,
        fix: "Look in Resend's Domains page, or run doctor once with a full-access key.",
      });
    default:
      return check({
        level: "warn",
        message: `not checked: ${state.reason}.`,
      });
  }
}

// ---------------------------------------------------------------------------------------------
// Sentry's DSN (T96, M6 D125)

/** Where each app reads its DSN. */
export const SENTRY_DSN_KEYS: readonly { app: AppName; name: string }[] = [
  { app: "backend", name: "SENTRY_DSN" },
  { app: "storefront", name: "NEXT_PUBLIC_SENTRY_DSN" },
];

export type SentryDsn = {
  publicKey: string;
  /** Where the envelopes go: `<scheme>://<host><path>api/<project>/envelope/`. */
  envelopeUrl: string;
  /** Host and project only: what doctor may print (the key is a credential). */
  label: string;
};

/**
 * A Sentry DSN, `https://<public key>@<host>[/<path>]/<project id>`, or `undefined` when `value` is
 * not one (Sentry's SDKs then send nothing, silently).
 */
export function parseSentryDsn(value: string | undefined): SentryDsn | undefined {
  const match =
    /^(https?):\/\/([A-Za-z0-9]+)(?::[A-Za-z0-9]*)?@([^/?#@\s]+)((?:\/[^/?#\s]+)*)\/(\d+)\/?$/.exec(
      (value ?? "").trim(),
    );
  if (match === null) return undefined;
  const [, scheme, publicKey, host, path, project] = match as unknown as string[];
  return {
    publicKey: publicKey!,
    envelopeUrl: `${scheme}://${host}${path}/api/${project}/envelope/`,
    label: `${host}, project ${project}`,
  };
}

/**
 * From the environment alone: each DSN that is set is a DSN (an error otherwise: the app reports
 * nothing, and says nothing about it), and a traces' rate that is set is a number from 0 to 1 (a
 * warning: the apps read anything else as 0, no tracing). Never prints a DSN.
 */
export function sentryDsnChecks(envs: AppEnvs): Check[] {
  const checks: Check[] = [];
  const bad = SENTRY_DSN_KEYS.filter(
    ({ app, name }) => isSet(envs[app], name) && parseSentryDsn(envs[app][name]) === undefined,
  );
  if (bad.length > 0)
    checks.push({
      ...SENTRY_DSN,
      level: "error",
      message: "A Sentry DSN is set but is not a DSN, so that app reports no error at all.",
      details: bad.map(
        ({ app, name }) => `apps/${app}: ${name} is not https://<key>@<host>/<project>`,
      ),
      fix: "Copy the DSN from Sentry (Settings → Projects → your project → Client Keys (DSN)).",
    });
  const rates = (["backend", "storefront"] as const).filter((app) => {
    const value = (envs[app].SENTRY_TRACES_SAMPLE_RATE ?? "").trim();
    const rate = Number(value);
    return value !== "" && !(Number.isFinite(rate) && rate >= 0 && rate <= 1);
  });
  if (rates.length > 0)
    checks.push({
      id: "sentry-traces-rate",
      title: "Sentry traces' sample rate",
      level: "warn",
      message:
        "SENTRY_TRACES_SAMPLE_RATE is not a number from 0 to 1, so it is read as 0: no tracing.",
      details: rates.map((app) => `apps/${app}`),
      fix: "Set a rate such as 0.1, or leave it blank for none.",
    });
  return checks;
}

/** The envelope `doctor --online` posts: a header and no item, which Sentry accepts and stores nothing of. */
export function emptyEnvelope(dsn: string): string {
  return `${JSON.stringify({ dsn: dsn.trim(), sent_at: new Date(0).toISOString() })}\n`;
}

/**
 * `doctor --online`: does Sentry take envelopes with this DSN (T96)? One check per DSN, naming the
 * apps that use it; `answer` is Sentry's answer to `emptyEnvelope` posted to the DSN's envelope URL.
 */
export function sentryEnvelopeCheck(
  apps: readonly AppName[],
  dsn: SentryDsn,
  answer: HttpResult,
): Check {
  const check = (c: Omit<Check, "id" | "title">): Check => ({
    id: [SENTRY_ONLINE.id, ...apps].join("-"),
    title: `${SENTRY_ONLINE.title} (${apps.map((app) => `apps/${app}`).join(" and ")})`,
    ...c,
  });
  if (answer.kind !== "response")
    return check({
      level: "warn",
      message: `not checked: Sentry (${dsn.label}) ${describeUnreachable(answer)}.`,
    });
  if (answer.status >= 200 && answer.status < 300)
    return check({
      level: "ok",
      message: `Sentry (${dsn.label}) accepts envelopes with this DSN.`,
    });
  if ([401, 403, 404].includes(answer.status))
    return check({
      level: "error",
      message: `Sentry (${dsn.label}) refuses this DSN (HTTP ${answer.status}): the key was revoked, or the project is gone, so no error is reported.`,
      fix: "Copy the DSN again from Sentry (Settings → Projects → your project → Client Keys (DSN)).",
    });
  return check({
    level: "warn",
    message: `not checked: Sentry (${dsn.label}) answered HTTP ${answer.status}.`,
  });
}

// ---------------------------------------------------------------------------------------------
// From `medusa exec`

/** How long doctor lets `medusa exec src/scripts/doctor-markets.ts` take. */
export const MEDUSA_RUN_TIMEOUT_MS = 90_000;

/** Why `medusa exec src/scripts/doctor-markets.ts` did not give its result: the run itself, then its log. */
export function explainMedusaRun(result: RunResult): { cause: string; fix: string } {
  if (result.error !== undefined) {
    return {
      cause: `pnpm could not be started (${result.error})`,
      fix: "Check that pnpm is installed and on the PATH (`corepack enable`).",
    };
  }
  if (result.prompt !== undefined) {
    return { cause: `Medusa asked "${result.prompt}"`, fix: "Run `pnpm bootstrap`." };
  }
  if (result.timedOut) {
    return {
      cause: `Medusa did not start within ${MEDUSA_RUN_TIMEOUT_MS / 1000} s`,
      fix: "Check that the database and Redis answer (`pnpm infra:up`).",
    };
  }
  return explainMedusaFailure(result.output, result.code);
}

/** Why `medusa exec src/scripts/doctor-markets.ts` failed, from its log: the known causes, else its last line. */
export function explainMedusaFailure(
  output: string,
  code?: number | null,
): { cause: string; fix: string } {
  const text = output;
  if (/Cannot find module '@shopblok\/medusa-markets/.test(text)) {
    return {
      cause: "the markets plugin is not built",
      fix: "Run `pnpm bootstrap` (it builds `packages/medusa-markets` first), or `pnpm --filter @shopblok/medusa-markets build`.",
    };
  }
  if (/database "[^"]*" does not exist/.test(text)) {
    return {
      cause: "the medusa database does not exist",
      fix: "Run `pnpm bootstrap`.",
    };
  }
  if (/relation "[^"]*" does not exist/.test(text)) {
    return {
      cause: "the medusa database is not migrated (or the markets module's tables are missing)",
      fix: "Run `pnpm bootstrap` (it builds the plugin and runs `medusa db:migrate`).",
    };
  }
  if (/(password authentication failed|ECONNREFUSED|Pg connection failed)/i.test(text)) {
    return {
      cause: "Medusa could not connect to its database or Redis",
      fix: "Check DATABASE_URL and REDIS_URL in apps/backend/.env and that `pnpm infra:up` has run.",
    };
  }
  const last = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("at "))
    .at(-1);
  const exit =
    code === undefined ? "" : code === null ? " (stopped by a signal)" : ` (exit code ${code})`;
  return {
    cause: last ? `Medusa failed: ${last.slice(0, 200)}` : `Medusa failed without a message${exit}`,
    fix: "Run `pnpm --filter @shopblok/backend exec medusa exec ./src/scripts/doctor-markets.ts` to see the full log.",
  };
}
