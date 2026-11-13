import type { AfterErrorHook } from "payload";

// Payload's errors to Sentry (M6 D125, T96): its own `afterError` hook in place of
// `@payloadcms/plugin-sentry`, which brings a second Sentry (v9) into the admin and sends the
// editor's e-mail and IP address. Only a server error (status 500 and up; a 4xx is the editor's or
// the caller's), with the collection's slug and the user's id and nothing else of the user, through
// the server's SDK (`lib/sentry/server.ts`; the scrubber runs in its `beforeSend`). Without
// `NEXT_PUBLIC_SENTRY_DSN` at build it does nothing and loads nothing; in Payload's CLI, where
// `instrumentation.ts` never ran, the SDK has no client and the report goes nowhere.

/** The HTTP status Payload answers for `error`: its own errors carry one, anything else is a 500. */
export function statusOf(error: unknown): number {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 100 && status <= 599 ? status : 500;
}

export const reportToSentry: AfterErrorHook = async ({ error, collection, req }) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || statusOf(error) < 500) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.withScope((scope) => {
    scope.setTag("app", "payload");
    if (collection !== undefined) scope.setTag("payload.collection", collection.slug);
    const user = req.user;
    if (user != null) {
      scope.setUser({ id: String(user.id) });
      scope.setTag("payload.user_collection", user.collection);
    }
    if (req.url !== undefined)
      scope.addEventProcessor((event) => ({
        ...event,
        request: { ...event.request, url: req.url, method: req.method ?? undefined },
      }));
    Sentry.captureException(error);
  });
};
