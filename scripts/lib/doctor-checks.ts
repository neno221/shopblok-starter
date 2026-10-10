// What `pnpm run doctor` concludes (T14), as pure functions: the env of both apps and the answers
// of the servers come in, `Check`s come out. `doctor.ts` does the looking (reads the files, opens the
// sockets, calls the servers); every decision that can be wrong lives here, with a test.
import type { RunResult } from "./exec.ts";
import { jsonOf, type HttpResult } from "./http.ts";
import { isSet, type AppEnvs, type IntegrationStatus } from "./integrations.ts";
import type { BackendMarkets, MarketMapData } from "./markets-check.ts";
import type { Check } from "./report.ts";

// What each check is called, once: the table, `--json` and CI key on these.
const PAYLOAD_AUTH = { id: "payload-auth", title: "Payload accepts the integrations key" } as const;
const MEDUSA_MARKETS = {
  id: "medusa-markets",
  title: "Medusa matches the storefront's map",
} as const;
const MEDUSA_ORPHANS = { id: "medusa-orphans", title: "Medusa regions left over" } as const;
const SEARCH_INDEX = { id: "search-index", title: "Search index currencies" } as const;

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
    message: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set in the backend, so the Medusa → Payload sync (M4) could not sign in to Payload.`,
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
  live: { regions: readonly LiveRegion[]; locales?: readonly string[] | undefined },
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
  // Locales that could not be read are not compared (the caller says so), not reported as missing.
  const { locales } = live;
  if (locales !== undefined) {
    const used = new Set(map.countries.filter((c) => c.enabled).flatMap((c) => c.languages));
    for (const code of used) {
      const locale = map.languages.find((language) => language.code === code)?.medusaLocale;
      if (locale && !locales.includes(locale)) {
        problems.push(`Medusa's store has no locale "${locale}" (language "${code}")`);
      }
    }
  }
  return problems;
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

/** How a server that gave no answer is described: "is not running" or "does not answer (reason)". */
export function describeUnreachable(result: Exclude<HttpResult, { kind: "response" }>): string {
  return result.kind === "refused" ? "is not running" : `does not answer (${result.reason})`;
}

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
 * Medusa's regions and locales against the storefront's map. `answers` is `undefined` when the
 * storefront has no publishable key to ask with. The regions come back when the later checks (the
 * leftover regions, the search index) can go on.
 */
export function medusaMarketsChecks(
  medusaUrl: string,
  answers: { regions: HttpResult; locales: HttpResult } | undefined,
  map: MarketMapData | undefined,
): { checks: Check[]; regions: LiveRegion[] | undefined } {
  if (answers === undefined) {
    return {
      regions: undefined,
      checks: [
        {
          ...MEDUSA_MARKETS,
          level: "warn",
          message: "not checked: the storefront has no publishable key.",
          fix: "Run `pnpm bootstrap`.",
        },
      ],
    };
  }
  if (answers.regions.kind !== "response") {
    return {
      regions: undefined,
      checks: [
        {
          ...MEDUSA_MARKETS,
          level: "warn",
          message: `not checked: Medusa at ${medusaUrl} ${describeUnreachable(answers.regions)}.`,
          fix: "Start it with `pnpm dev`.",
        },
      ],
    };
  }
  const regions = readRegions({
    status: answers.regions.status,
    body: jsonOf(answers.regions),
  });
  if (typeof regions === "string") {
    return {
      regions: undefined,
      checks: [
        {
          ...MEDUSA_MARKETS,
          level: "error",
          message: `GET /store/regions with the storefront's key failed: ${regions}.`,
          fix: "The key belongs to the database. Run `pnpm bootstrap` (it writes the current key), then build the storefront again.",
        },
      ],
    };
  }

  if (map === undefined) {
    return {
      regions,
      checks: [
        {
          ...MEDUSA_MARKETS,
          level: "warn",
          message:
            "not compared: no market map could be read (the Markets checks above say why), so there is nothing to compare Medusa's regions and locales with.",
        },
      ],
    };
  }
  const locales = localesOf(answers.locales);
  const problems = compareWithMedusa(
    { regions, ...(typeof locales === "string" ? {} : { locales }) },
    map,
  );
  const details = [
    ...problems,
    ...(typeof locales === "string"
      ? [
          `could not read Medusa's locales (${locales}), so the languages were not compared; /store/locales is served by the translation feature (MEDUSA_FF_TRANSLATION must not be false)`,
        ]
      : []),
  ];
  return {
    regions,
    checks: [
      details.length === 0
        ? {
            ...MEDUSA_MARKETS,
            level: "ok",
            message: `${regions.length} regions and ${(locales as string[]).length} locales cover every open country and language.`,
          }
        : {
            ...MEDUSA_MARKETS,
            level: "warn",
            message:
              problems.length > 0
                ? "the running Medusa does not have what the storefront's map expects (D17)."
                : "Medusa's regions match the storefront's map, but its locales could not be compared.",
            details,
            fix: "Run `pnpm bootstrap`: it seeds the regions and locales from apps/backend/src/config/markets.ts.",
          },
    ],
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
// From `payload run`

/** How long doctor lets `payload run src/scripts/doctor-payload.ts` take. */
export const PAYLOAD_RUN_TIMEOUT_MS = 60_000;

/** Why `payload run src/scripts/doctor-payload.ts` did not give its result: the run itself, then its log. */
export function explainPayloadRun(
  result: Pick<RunResult, "code" | "output" | "prompt" | "timedOut" | "error">,
): { cause: string; fix: string } {
  if (result.error !== undefined) {
    return {
      cause: `pnpm could not be started (${result.error})`,
      fix: "Check that pnpm is installed and on the PATH (`corepack enable`).",
    };
  }
  if (result.prompt !== undefined) {
    return { cause: `Payload asked "${result.prompt}"`, fix: "Run `pnpm bootstrap`." };
  }
  if (result.timedOut) {
    return {
      cause: `Payload did not start within ${PAYLOAD_RUN_TIMEOUT_MS / 1000} s`,
      fix: "Check that the database answers (`pnpm infra:up`).",
    };
  }
  return explainPayloadFailure(result.output, result.code);
}

/** Why `payload run src/scripts/doctor-payload.ts` failed, from its log: the known causes, else its last line. */
export function explainPayloadFailure(
  output: string,
  code?: number | null,
): { cause: string; fix: string } {
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
  const exit =
    code === undefined ? "" : code === null ? " (stopped by a signal)" : ` (exit code ${code})`;
  return {
    cause: last
      ? `Payload failed: ${last.slice(0, 200)}`
      : `Payload failed without a message${exit}`,
    fix: "Run `pnpm --filter @shopblok/storefront exec payload run src/scripts/doctor-payload.ts` to see the full log.",
  };
}
