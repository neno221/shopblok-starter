// What an error boundary calls with the error it shows (`app/global-error.tsx`, the market's
// `error.tsx`): React keeps a caught error from `window.onerror`, so neither the queue nor the SDK
// would see it. Only an error of the browser's own: one with a `digest` came from the server, which
// reported it already (`onRequestError`). Without a DSN at build this is an empty function.
export function reportClientError(error: Error & { digest?: string }) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || error.digest !== undefined) return;
  void import("./browser").then(
    (sdk) => sdk.capture(error),
    () => undefined,
  );
}
