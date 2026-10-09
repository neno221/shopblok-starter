import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { buildModules, getRedisUrl } from './src/config/modules'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Which modules are registered depends on the environment (src/config/modules.ts).
// Translation is always registered; MEDUSA_FF_TRANSLATION, when set, overrides the flag below.
const redisUrl = getRedisUrl(process.env)

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Sessions use Redis when REDIS_URL is set, otherwise Medusa's in-memory store.
    ...(redisUrl ? { redisUrl } : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      // `|| undefined`: .env.example leaves both blank on purpose. defineConfig hands a blank
      // string to the User module as its jwt_secret (it only falls back on undefined), and the
      // module then refuses to start. Undefined falls back to Medusa's default in development
      // and still fails in production.
      jwtSecret: process.env.JWT_SECRET || undefined,
      cookieSecret: process.env.COOKIE_SECRET || undefined,
    }
  },
  admin: {
    storefrontUrl: process.env.STOREFRONT_URL,
  },
  featureFlags: {
    translation: true,
  },
  modules: buildModules(process.env),
})
