// Which integrations are on, from the two apps' environments (T14, SPEC §10). Pure: the env comes in
// as plain objects and nothing is read from `process.env` or from disk, so the tests can feed every
// combination. A package since T61 (D85): doctor prints it, and Payload's dashboard shows the same list
// from the storefront's own environment (`payload/components/integrations-status.tsx`). It imports
// nothing, so plain Node runs it from `scripts/` and Next bundles it into the admin.
//
// A value that is not there, or is blank, counts as not set (`has()` in the backend's `modules.ts`
// reads it the same way). The result never holds a value, only names, so it is safe to print.

export type AppName = "backend" | "storefront";

/** One app's environment: the shell's variables over its `.env` file, for the keys that matter. */
export type EnvLike = Readonly<Record<string, string | undefined>>;
export type AppEnvs = Readonly<Record<AppName, EnvLike>>;

export type IntegrationId =
  "stripe" | "resend" | "posthog" | "sentry" | "meilisearch" | "redis" | "r2";

type PartSpec = {
  app: AppName;
  /** What this part of the integration is, for the sentence that names what is missing. */
  what: string;
  /** All of these turn the part on. */
  keys: readonly string[];
  /** Useful but not needed to turn it on (named when absent). */
  optional?: readonly string[];
};

type Spec = {
  id: IntegrationId;
  name: string;
  /** `third-party` needs an account's keys; `local` is part of the compose stack and set by default. */
  kind: "third-party" | "local";
  parts: readonly PartSpec[];
  /** What runs when the integration is on, and what runs in its place when it is not. */
  live: string;
  fallback: string;
  /**
   * Whether the code that uses the keys exists. In M0 only Redis is wired (T06): the other six arrive
   * in M6 (SPEC §17.1), so keys set today change nothing. Doctor says so instead of calling the
   * integration live.
   */
  wired: boolean;
  arrives?: string;
};

const S3_KEYS = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "S3_PUBLIC_URL",
] as const;

/**
 * R2's region is always `auto`, which both apps use when it is blank (M6 D127). Another S3-compatible
 * store may need it.
 */
const S3_OPTIONAL = ["S3_REGION"] as const;

/** SPEC §10's table, one row each. Edit this when an integration gets wired or its keys change. */
const SPECS: readonly Spec[] = [
  {
    id: "stripe",
    name: "Stripe",
    kind: "third-party",
    parts: [
      {
        app: "backend",
        what: "payment provider",
        keys: ["STRIPE_API_KEY", "STRIPE_WEBHOOK_SECRET"],
      },
      { app: "storefront", what: "Payment Element", keys: ["NEXT_PUBLIC_STRIPE_KEY"] },
    ],
    live: "Stripe (pp_stripe_stripe)",
    fallback: "pp_system_default (manual payment)",
    wired: false,
    arrives: "M6",
  },
  {
    id: "resend",
    name: "Resend",
    kind: "third-party",
    parts: [
      {
        app: "backend",
        what: "Medusa notification provider",
        keys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      },
      {
        app: "storefront",
        what: "Payload email adapter",
        keys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
        // The newsletter's segment (M6 D122): without it a confirmed address is kept as a form
        // submission, as with no key.
        optional: ["RESEND_NEWSLETTER_SEGMENT_ID"],
      },
    ],
    live: "Resend",
    fallback: "notification-local (console) and Mailpit",
    // T98 (M6 D121): Medusa's `email` channel and Payload's adapter.
    wired: true,
  },
  {
    id: "posthog",
    name: "PostHog",
    kind: "third-party",
    parts: [
      {
        app: "backend",
        what: "Analytics Module provider",
        keys: ["POSTHOG_EVENTS_API_KEY"],
        // The EU host is the default (M6 D124), as in the storefront.
        optional: ["POSTHOG_HOST"],
      },
      {
        app: "storefront",
        what: "posthog-js",
        keys: ["NEXT_PUBLIC_POSTHOG_KEY"],
        // The EU host is the default (M6 D124); only another region's project sets it.
        optional: ["NEXT_PUBLIC_POSTHOG_HOST"],
      },
    ],
    live: "PostHog",
    fallback: "analytics-local (no client script)",
    // T97 (M6 D124): Medusa's Analytics Module with the PostHog provider and its three
    // subscribers, and `posthog-js` after the visitor's analytics consent.
    wired: true,
  },
  {
    id: "sentry",
    name: "Sentry",
    kind: "third-party",
    parts: [
      {
        app: "backend",
        what: "instrumentation.ts",
        keys: ["SENTRY_DSN"],
        // M6 D125: `environment` and the traces' sample rate (0 when blank); T96: the release, else
        // the commit Railway or GitHub Actions runs.
        optional: ["SENTRY_ENVIRONMENT", "SENTRY_TRACES_SAMPLE_RATE", "SENTRY_RELEASE"],
      },
      {
        app: "storefront",
        what: "@sentry/nextjs",
        keys: ["NEXT_PUBLIC_SENTRY_DSN"],
        // Only the build uses the last three, to upload source maps; errors are reported without them.
        optional: [
          "SENTRY_ENVIRONMENT",
          "SENTRY_TRACES_SAMPLE_RATE",
          "SENTRY_RELEASE",
          "SENTRY_AUTH_TOKEN",
          "SENTRY_ORG",
          "SENTRY_PROJECT",
        ],
      },
    ],
    live: "Sentry",
    fallback: "not initialised",
    // T96 (M6 D125): Medusa's `instrumentation.ts`, the storefront's server and browser SDKs, and
    // Payload's `afterError` hook.
    wired: true,
  },
  {
    id: "meilisearch",
    name: "Meilisearch",
    kind: "local",
    parts: [
      {
        app: "backend",
        what: "Search Module provider",
        keys: ["MEILISEARCH_HOST", "MEILISEARCH_API_KEY"],
      },
    ],
    live: "Meilisearch",
    fallback: "search-postgres",
    wired: false,
    arrives: "M6",
  },
  {
    id: "redis",
    name: "Redis",
    kind: "local",
    parts: [
      {
        app: "backend",
        what: "event bus, workflow engine, locking and sessions",
        keys: ["REDIS_URL"],
      },
    ],
    live: "Redis",
    fallback: "in-memory modules (development only)",
    wired: true,
  },
  {
    id: "r2",
    name: "Cloudflare R2",
    kind: "third-party",
    parts: [
      // Medusa's private files (CSV imports and exports) go to a second bucket with no public access
      // (M6 D127); Payload's media are all public, so the storefront has no private bucket.
      {
        app: "backend",
        what: "Medusa file provider",
        keys: [...S3_KEYS, "S3_PRIVATE_BUCKET"],
        optional: S3_OPTIONAL,
      },
      { app: "storefront", what: "Payload media storage", keys: S3_KEYS, optional: S3_OPTIONAL },
    ],
    live: "Cloudflare R2 (S3 API)",
    fallback: "local disk (development only; Vercel needs R2)",
    wired: false,
    arrives: "M6",
  },
];

export type PartStatus = {
  app: AppName;
  what: string;
  /** Every required key is set. */
  configured: boolean;
  set: string[];
  missing: string[];
  /** Optional keys that are absent. */
  optionalMissing: string[];
};

export type IntegrationStatus = {
  id: IntegrationId;
  name: string;
  kind: Spec["kind"];
  /** `live` only when every part has its keys and the code that uses them exists. */
  state: "live" | "fallback";
  /** What SPEC §10 calls "turns on when": every required key of every part is set. */
  configured: boolean;
  /** False while the provider is still to be built: keys can be set, and change nothing. */
  wired: boolean;
  arrives?: string;
  /** What runs now. */
  using: string;
  /** What runs when the integration is not live. */
  fallback: string;
  /** Some but not all of the required keys are set: a mistake worth a warning. */
  half: boolean;
  parts: PartStatus[];
};

/** Whether `key` is set to something other than blank: the rule `has()` in the backend's `modules.ts` uses. */
export const isSet = (env: EnvLike, key: string): boolean => (env[key] ?? "").trim() !== "";

function statusOf(spec: Spec, envs: AppEnvs): IntegrationStatus {
  const parts = spec.parts.map((part): PartStatus => {
    const env = envs[part.app];
    const set = part.keys.filter((key) => isSet(env, key));
    return {
      app: part.app,
      what: part.what,
      configured: set.length === part.keys.length,
      set,
      missing: part.keys.filter((key) => !isSet(env, key)),
      optionalMissing: (part.optional ?? []).filter((key) => !isSet(env, key)),
    };
  });
  const configured = parts.every((part) => part.configured);
  const anySet = parts.some((part) => part.set.length > 0);
  const state = configured && spec.wired ? "live" : "fallback";
  return {
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    state,
    configured,
    wired: spec.wired,
    ...(spec.arrives === undefined ? {} : { arrives: spec.arrives }),
    using: state === "live" ? spec.live : spec.fallback,
    fallback: spec.fallback,
    half: anySet && !configured,
    parts,
  };
}

/** The status of every integration in SPEC §10, in the table's order . */
export function getIntegrationStatus(envs: AppEnvs): IntegrationStatus[] {
  return SPECS.map((spec) => statusOf(spec, envs));
}

/** Every variable name `getIntegrationStatus` looks at, so a caller reads just those from a file. */
export const INTEGRATION_KEYS: readonly string[] = [
  ...new Set(
    SPECS.flatMap((spec) => spec.parts.flatMap((part) => [...part.keys, ...(part.optional ?? [])])),
  ),
];

const appPath = (app: AppName): string => `apps/${app}`;

/** The keys still to set, grouped by app: `STRIPE_API_KEY (apps/backend), NEXT_PUBLIC_STRIPE_KEY (apps/storefront)`. */
export function describeMissing(status: IntegrationStatus): string {
  const missing = status.parts.filter((part) => part.missing.length > 0);
  const [first] = missing;
  // Keys missing in every app (Resend's, R2's shared ones): said once, then each app's own extra
  // ones (R2's `S3_PRIVATE_BUCKET`, the backend's only: M6 D127).
  if (first !== undefined && status.parts.length > 1 && missing.length === status.parts.length) {
    const common = first.missing.filter((key) =>
      missing.every((part) => part.missing.includes(key)),
    );
    if (common.length > 0) {
      const extras = missing
        .map((part) => ({ part, own: part.missing.filter((key) => !common.includes(key)) }))
        .filter(({ own }) => own.length > 0)
        .map(({ part, own }) => `${own.join(", ")} (${appPath(part.app)})`);
      return [`${common.join(", ")} (each app)`, ...extras].join("; ");
    }
  }
  return missing.map((part) => `${part.missing.join(", ")} (${appPath(part.app)})`).join("; ");
}

/** What the table says about one integration: what runs, and, off the fallback's path, why. */
export function describeIntegration(status: IntegrationStatus): { using: string; why?: string } {
  if (status.state === "live") return { using: status.using };
  if (status.configured && !status.wired) {
    return {
      using: status.using,
      why: `the keys are set, but the ${status.name} code arrives in ${status.arrives ?? "a later milestone"}`,
    };
  }
  const missing = describeMissing(status);
  return missing === ""
    ? { using: status.using }
    : { using: status.using, why: `not set: ${missing}` };
}
