import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { buildConfig } from './src/config/config'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// What the config holds, and why, is in src/config/config.ts and src/config/modules.ts.
module.exports = defineConfig(buildConfig(process.env))
