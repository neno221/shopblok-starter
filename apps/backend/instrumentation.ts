// Medusa calls `register()` once when the server starts (`medusa start`, and `medusa develop`'s
// server), before it loads the app. M6 D125 (T96): Sentry, only with `SENTRY_DSN`; without it
// nothing is started and Sentry's SDK is never loaded (`src/lib/sentry.ts` imports it when it
// starts). Medusa does not wait for `register()`, so the start runs on, and a failure is printed
// rather than stopping the server: the shop works without Sentry.
import { sentryDsn, startSentry } from "./src/lib/sentry"

export function register() {
  if (sentryDsn(process.env) === undefined) return
  startSentry(process.env).then(
    () => console.info("sentry: reporting Medusa's errors"),
    (error: unknown) => console.error("sentry: could not start:", error),
  )
}
