import type { Instrumentation } from "next";

// Runs once when a server starts (Next's instrumentation hook). T59: the development timer that
// runs Payload's jobs, scheduled publishing among them (D74, `lib/cms/jobs-timer.ts`). T96 (M6
// D125): Sentry's server SDK, only in a build with `NEXT_PUBLIC_SENTRY_DSN` (without it the
// import is dead code and Sentry is never loaded).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const { startServerSentry } = await import("./lib/sentry/server");
    startServerSentry();
  }
  const { env } = await import("./lib/env");
  const { startJobsTimer } = await import("./lib/cms/jobs-timer");
  startJobsTimer({
    env,
    fetch,
    setInterval: (run, ms) => setInterval(run, ms).unref(),
    log: (message) => console.warn(message),
  });
}

// T96: an error a page, a layout, a route handler, a server action or the proxy threw, as Next
// reports it (the route, its kind and how it rendered), to Sentry with the DSN.
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};
