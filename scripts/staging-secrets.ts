// `pnpm staging:secrets` (M7 D134, T114): staging's secrets, the integrations' test keys and
// Payload's database address, written straight into Railway's `staging` environment and Vercel's
// Production and Preview environments. Run with plain `node scripts/staging-secrets.ts` in the
// cloud session that holds VERCEL_TOKEN, RAILWAY_TOKEN and the two project ids (CLOUD.md); it
// prints names only. The runner, and what it promises, is `lib/staging-secrets.ts`.
//
//   pnpm staging:secrets [--dry-run] [--rotate=<NAME> [--force]]
import { runStagingSecrets } from "./lib/staging-secrets.ts";

process.exitCode = await runStagingSecrets({
  argv: process.argv.slice(2),
  env: process.env,
  fetch: (url, init) => fetch(url, init),
  log: (line) => console.log(line),
});
