// Runs once when a server starts (Next's instrumentation hook). T59: the development timer that
// runs Payload's jobs, scheduled publishing among them (D74, `lib/cms/jobs-timer.ts`).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("./lib/env");
  const { startJobsTimer } = await import("./lib/cms/jobs-timer");
  startJobsTimer({
    env,
    fetch,
    setInterval: (run, ms) => setInterval(run, ms).unref(),
    log: (message) => console.warn(message),
  });
}
