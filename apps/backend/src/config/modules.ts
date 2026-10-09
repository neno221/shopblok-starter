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
 * - Notification: the local provider logs to the console. It serves `email` (verification
 *   links in M3) and `feed`, because Medusa's own product import/export workflows notify
 *   on `feed` and fail without a provider for it.
 * - Event bus, workflow engine and locking: Redis when `REDIS_URL` is set, otherwise
 *   Medusa's in-memory defaults (dev only).
 * - Caching: only with `REDIS_URL` and `MEDUSA_FF_CACHING=true`. There is no in-memory
 *   provider here (`in_memory.enable` stays off), so dev matches production.
 *
 * Search (`search-postgres`), `file-local`, `analytics-local` and `pp_system_default` are
 * Medusa defaults and stay unregistered here. M6 adds Stripe, Resend, PostHog, S3/R2,
 * Sentry and Meilisearch behind `has(env, ...)` gates in this function.
 */
export function buildModules(env: Env): InputConfigModules {
  const redisUrl = getRedisUrl(env);

  const modules: (ModuleEntry | false)[] = [
    { resolve: "@medusajs/medusa/translation" },

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

    // Medusa reads MEDUSA_FF_CACHING with isTruthy too (only the string "true" counts), so the
    // module and its flag can't disagree.
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
