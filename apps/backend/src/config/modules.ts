import type { InputConfigModules } from "@medusajs/framework/types";
import { isTruthy } from "@medusajs/framework/utils";

/**
 * The environment `buildModules` reads. `process.env` fits. Nothing in this file reads
 * `process.env` itself, so a unit test can pass any object.
 */
export type Env = Record<string, string | undefined>;

type ModuleEntry = InputConfigModules[number];

/**
 * True when every key is set to something other than blank. No keys is false, so a gate
 * that lost its keys can't switch a module on by accident.
 *
 * The plan writes this as `has(...keys)`. The environment is the first argument because this
 * file stays pure: it never reads `process.env`.
 */
export function has(env: Env, ...keys: string[]): boolean {
  return keys.length > 0 && keys.every((key) => (env[key] ?? "").trim() !== "");
}

/** PostHog's EU ingest host (M6 D124), when `POSTHOG_HOST` is blank. */
export const POSTHOG_EU = "https://eu.i.posthog.com";

/** `REDIS_URL` without surrounding blanks, or `undefined` when it isn't set. */
export function getRedisUrl(env: Env): string | undefined {
  return has(env, "REDIS_URL") ? env.REDIS_URL?.trim() : undefined;
}

/**
 * The module registry for `medusa-config.ts` (M0 plan, T06). Entries here replace Medusa's
 * defaults of the same module (the last one wins), so each one is listed in full.
 *
 * - Translation: always on. `featureFlags.translation` and `MEDUSA_FF_TRANSLATION` (which
 *   wins over the config) only decide whether its routes answer.
 * - Notification: the local provider logs to the console. It serves `feed`, because Medusa's
 *   own product import/export workflows notify on `feed` and fail without a provider for it,
 *   and `email` (verification links since M3) unless Resend has it: with `RESEND_API_KEY` and
 *   `RESEND_FROM_EMAIL` set, `src/modules/resend` sends `email` (M6 D121). A channel has one
 *   provider, so the local one then keeps `feed` alone.
 * - Event bus, workflow engine and locking: Redis when `REDIS_URL` is set, otherwise
 *   Medusa's in-memory defaults (dev only).
 * - Caching: only with `REDIS_URL` and `MEDUSA_FF_CACHING=true`. There is no in-memory
 *   provider here (`in_memory.enable` stays off), so dev matches production.
 *
 * - Payload (D75, T60): the Medusa → Payload sync, only with `PAYLOAD_SERVER_URL` and
 *   `PAYLOAD_API_KEY` (`pnpm bootstrap` writes both). Without it the sync's subscriber, jobs and
 *   route do nothing and say so once.
 *
 * - Analytics (M6 D124, SPEC §10.3): always registered, so the analytics subscribers always have
 *   it. PostHog with `POSTHOG_EVENTS_API_KEY` (the host `POSTHOG_HOST`, the EU's when blank),
 *   `analytics-local` otherwise, which only logs at debug level. The subscribers send only for a
 *   cart or order that carries the visitor's consent (`src/subscribers/analytics-*.ts`).
 *
 * Search (`search-postgres`), `file-local` and `pp_system_default` are
 * Medusa defaults and stay unregistered here. M6 adds Stripe, Resend (T98), PostHog, S3/R2,
 * Sentry and Meilisearch behind `has(env, ...)` gates in this function.
 */
export function buildModules(env: Env): InputConfigModules {
  const redisUrl = getRedisUrl(env);
  const resend = has(env, "RESEND_API_KEY", "RESEND_FROM_EMAIL");
  const posthog = has(env, "POSTHOG_EVENTS_API_KEY");

  const modules: (ModuleEntry | false)[] = [
    { resolve: "@medusajs/medusa/translation" },

    has(env, "PAYLOAD_SERVER_URL", "PAYLOAD_API_KEY") && {
      resolve: "./src/modules/payload",
      options: {
        serverUrl: env.PAYLOAD_SERVER_URL?.trim(),
        apiKey: env.PAYLOAD_API_KEY?.trim(),
        userCollection: env.PAYLOAD_USER_COLLECTION?.trim() || "integrations",
      },
    },

    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              name: "Local Notification Provider",
              channels: resend ? ["feed"] : ["email", "feed"],
            },
          },
          ...(resend
            ? [
                {
                  resolve: "./src/modules/resend",
                  id: "resend",
                  options: {
                    channels: ["email"],
                    api_key: env.RESEND_API_KEY?.trim(),
                    from: env.RESEND_FROM_EMAIL?.trim(),
                  },
                },
              ]
            : []),
        ],
      },
    },

    {
      resolve: "@medusajs/medusa/analytics",
      options: {
        providers: [
          posthog
            ? {
                resolve: "@medusajs/medusa/analytics-posthog",
                id: "posthog",
                options: {
                  posthogEventsKey: env.POSTHOG_EVENTS_API_KEY?.trim(),
                  posthogHost: env.POSTHOG_HOST?.trim() || POSTHOG_EU,
                },
              }
            : {
                resolve: "@medusajs/medusa/analytics-local",
                id: "local",
              },
        ],
      },
    },

    redisUrl !== undefined && {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { redisUrl },
    },

    redisUrl !== undefined && {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: { redis: { redisUrl } },
    },

    redisUrl !== undefined && {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-redis",
            id: "locking-redis",
            is_default: true,
            options: { redisUrl },
          },
        ],
      },
    },

    // Medusa reads MEDUSA_FF_CACHING with isTruthy too ("true" in any case), so the module and
    // its flag agree for every plain value. They differ only for a comma list such as
    // `true,x`, which Medusa turns into a flag object (on) and isTruthy reads as off.
    redisUrl !== undefined &&
      isTruthy(env.MEDUSA_FF_CACHING) && {
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: { redisUrl },
            },
          ],
        },
      },
  ];

  return modules.filter((entry): entry is ModuleEntry => Boolean(entry));
}
