import "server-only";
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./options";

// The server's SDK (M6 D125, T96), started by `instrumentation.ts`'s `register()` only when the
// build has a DSN, so a shop without one never loads it. Payload runs in the same server, so its
// `afterError` hook (`payload.ts`) reports through this client.
export function startServerSentry() {
  Sentry.init({
    ...sentryOptions(),
    // v11 patches libraries through Node's module hooks for its channel-based spans; Turbopack
    // bundles that runtime (`buildTimeInstrumentation: false` in `next.config.ts`), so it cannot
    // register and warns at every start. Errors do not need it, and tracing is off by default.
    enableRuntimeChannelInjection: false,
  });
}
