import type { InputConfigWithArrayModules } from "@medusajs/framework/types";

import { buildModules, getRedisUrl, type Env } from "./modules";

/** `NODE_ENV` values where Medusa may fall back to its default secret (it warns when it does). */
const DEFAULT_SECRET_ENVS = ["", "development", "test"];

/**
 * A secret from the environment. `.env.example` leaves `JWT_SECRET` and `COOKIE_SECRET` blank,
 * but `defineConfig` only falls back on `undefined` and hands a blank string to the User module,
 * which then refuses to start. So where Medusa may use its default (development, test) a blank
 * becomes `undefined`. Anywhere else it stays blank: production refuses it
 * (`http.jwtSecret not found`), and so does any other `NODE_ENV` such as staging, so a deploy
 * that forgot its secrets can't boot on Medusa's public `supersecret`.
 */
export function getSecret(env: Env, key: string): string | undefined {
  const value = env[key];
  return DEFAULT_SECRET_ENVS.includes(env.NODE_ENV ?? "") ? value || undefined : value;
}

/**
 * Everything `medusa-config.ts` passes to `defineConfig`. Pure, like `buildModules`: it never
 * reads `process.env`, so a unit test can pass any object.
 */
export function buildConfig(env: Env): InputConfigWithArrayModules {
  const redisUrl = getRedisUrl(env);

  return {
    projectConfig: {
      databaseUrl: env.DATABASE_URL,
      // Sessions use Redis when REDIS_URL is set, otherwise Medusa's in-memory store.
      ...(redisUrl ? { redisUrl } : {}),
      http: {
        storeCors: env.STORE_CORS!,
        adminCors: env.ADMIN_CORS!,
        authCors: env.AUTH_CORS!,
        jwtSecret: getSecret(env, "JWT_SECRET"),
        cookieSecret: getSecret(env, "COOKIE_SECRET"),
        // Required e-mail verification (D64, SPEC §8.4): always on, no env gate. A customer who
        // logs in unverified gets `verification_required` and a restricted token.
        authVerificationsPerActor: {
          customer: [{ entity_type: "email", auth_provider: "emailpass" }],
        },
      },
    },
    // Baked into the admin bundle at build time, so turbo.json's `build` task lists it.
    admin: {
      storefrontUrl: env.STOREFRONT_URL,
    },
    // The markets plugin (M4b, D89): `packages/medusa-markets`, built before the backend loads it
    // (`medusa plugin:build`, turbo's `^build`). Medusa registers its `markets` module, routes and
    // workflows from the package's `.medusa/server/src`; it takes no options.
    plugins: [{ resolve: "@shopblok/medusa-markets", options: {} }],
    // Translation is always registered (buildModules). MEDUSA_FF_TRANSLATION, when set, wins.
    featureFlags: {
      translation: true,
    },
    modules: buildModules(env),
  };
}
