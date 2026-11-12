import "server-only";
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./options";

// The server's SDK (M6 D125, T96), started by `instrumentation.ts`'s `register()` only when the
// build has a DSN, so a shop without one never loads it. Payload runs in the same server, so its
// `afterError` hook (`payload.ts`) reports through this client.
export function startServerSentry() {
  Sentry.init(sentryOptions());
}
