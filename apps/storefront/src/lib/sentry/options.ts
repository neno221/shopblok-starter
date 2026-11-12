// The options every `Sentry.init` of the storefront shares (M6 D125, T96): the server's, the
// browser's and, through the server's, Payload's. Only with `NEXT_PUBLIC_SENTRY_DSN`; nothing here
// loads Sentry's SDK (the callers import it, and only when the DSN is set).
//
// `next build` writes every value below into the bundles: the DSN because it is `NEXT_PUBLIC_*`,
// the environment, the release and the traces' rate through `next.config.ts`'s `env`, so the server
// and the browser report the same release and environment (D125: the release is the commit).
import { dataCollection, scrubHooks } from "./scrub";

/** The DSN the build was made with, or `undefined`: the one switch of the storefront's Sentry. */
export function sentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;
}

/** `SENTRY_TRACES_SAMPLE_RATE` as a rate, 0 (no tracing, D125's default) when blank or invalid. */
export function tracesRate(value: string | undefined): number {
  const rate = Number((value ?? "").trim() || "0");
  return Number.isFinite(rate) && rate > 0 && rate <= 1 ? rate : 0;
}

export function sentryOptions() {
  const rate = tracesRate(process.env.SENTRY_TRACES_SAMPLE_RATE);
  return {
    dsn: sentryDsn(),
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || undefined,
    release: process.env.SENTRY_RELEASE?.trim() || undefined,
    dataCollection,
    ...scrubHooks,
    // Without a rate, no tracing at all (not a rate of 0, which still starts spans).
    ...(rate > 0 ? { tracesSampleRate: rate } : {}),
  };
}
