import type { InputConfigModules } from "@medusajs/framework/types";
import { isTruthy } from "@medusajs/framework/utils";

import { MEILISEARCH_PROVIDER_ID } from "../modules/meilisearch-search/locales";

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

/** `REDIS_URL` without surrounding blanks, or `undefined` when it isn't set. */
export function getRedisUrl(env: Env): string | undefined {
  return has(env, "REDIS_URL") ? env.REDIS_URL?.trim() : undefined;
}

/**
 * `MEILISEARCH_INDEX_PREFIX`, checked: it becomes the Search Module's `index_prefix`, the start of
 * every physical index name (`<prefix>_product_v<N>__<locale>`), so it may hold only what a
 * Meilisearch index uid and a Postgres table name both take.
 */
export function getIndexPrefix(env: Env): string | undefined {
  const prefix = env.MEILISEARCH_INDEX_PREFIX?.trim();

  if (!prefix) {
    return undefined;
  }

  if (!/^[a-z0-9][a-z0-9_]{0,39}$/.test(prefix)) {
    throw new Error(
      `MEILISEARCH_INDEX_PREFIX "${prefix}" may hold only lowercase letters, digits and underscores (at most 40, starting with a letter or digit)`,
    );
  }

  return prefix;
}

/**
 * The module registry for `medusa-config.ts` (M0 plan, T06). Entries here replace Medusa's
 * defaults of the same module (the last one wins), so each one is listed in full.
 *
 * - Translation: always on. `featureFlags.translation` and `MEDUSA_FF_TRANSLATION` (which
 *   wins over the config) only decide whether its routes answer.
 * - Notification: the local provider logs to the console. It serves `email` (verification
 *   links in M3) and `feed`, because Medusa's own product import/export workflows notify
 *   on `feed` and fail without a provider for it.
 * - Event bus, workflow engine and locking: Redis when `REDIS_URL` is set, otherwise
 *   Medusa's in-memory defaults (dev only).
 * - Caching: only with `REDIS_URL` and `MEDUSA_FF_CACHING=true`. There is no in-memory
 *   provider here (`in_memory.enable` stays off), so dev matches production.
 *
 * - Payload (D75, T60): the Medusa → Payload sync, only with `PAYLOAD_SERVER_URL` and
 *   `PAYLOAD_API_KEY` (`pnpm bootstrap` writes both). Without it the sync's subscriber, jobs and
 *   route do nothing and say so once.
 *
 * - Search (D126, T94): with `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`, the Search Module
 *   gets the Meilisearch provider (`src/modules/meilisearch-search`, one index per locale) as its
 *   `default_provider`, beside `search-postgres`, which stays registered so a switch between the
 *   two can drop the other's indexes at `db:migrate` (as Medusa's own default does), and
 *   `MEILISEARCH_INDEX_PREFIX` as its `index_prefix` (two environments on one server). Without
 *   the keys the module keeps Medusa's default: `search-postgres` alone (M3's index, D63).
 *
 * `file-local`, `analytics-local` and `pp_system_default` are Medusa defaults and stay
 * unregistered here. M6 adds Stripe, Resend, PostHog, S3/R2 and Sentry behind `has(env, ...)`
 * gates in this function.
 */
export function buildModules(env: Env): InputConfigModules {
  const redisUrl = getRedisUrl(env);
  const meilisearch = has(env, "MEILISEARCH_HOST", "MEILISEARCH_API_KEY");
  const indexPrefix = meilisearch ? getIndexPrefix(env) : undefined;

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
              channels: ["email", "feed"],
            },
          },
        ],
      },
    },

    meilisearch && {
      resolve: "@medusajs/medusa/search",
      options: {
        default_provider: MEILISEARCH_PROVIDER_ID,
        ...(indexPrefix ? { index_prefix: indexPrefix } : {}),
        providers: [
          {
            resolve: "@medusajs/medusa/search-postgres",
            id: "postgres",
            options: { engine: "native" },
          },
          {
            resolve: "./src/modules/meilisearch-search",
            id: MEILISEARCH_PROVIDER_ID,
            options: {
              host: env.MEILISEARCH_HOST?.trim(),
              api_key: env.MEILISEARCH_API_KEY?.trim(),
            },
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
