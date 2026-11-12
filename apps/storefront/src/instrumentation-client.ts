// Runs in the browser before the page hydrates (Next's client instrumentation), so it is in every
// page's first load (M6 D125, D129, T96). Without `NEXT_PUBLIC_SENTRY_DSN` at build the whole body
// is dead code and the file costs nothing. With it, this is the browser's part of Sentry that is on
// the page at first: a queue of at most 20 errors and unhandled rejections, then, once the page has
// loaded and the browser is idle, the SDK through a dynamic import (`lib/sentry/browser.ts`, its own
// chunk), which reports what the queue kept and takes over `window.onerror`.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const queue: unknown[] = [];
  const keep = (event: ErrorEvent | PromiseRejectionEvent) => {
    if (queue.length < 20) queue.push("reason" in event ? event.reason : event.error);
  };
  addEventListener("error", keep);
  addEventListener("unhandledrejection", keep);
  const load = () =>
    import("./lib/sentry/browser").then(
      ({ start }) => {
        removeEventListener("error", keep);
        removeEventListener("unhandledrejection", keep);
        start(queue.splice(0));
      },
      () => undefined,
    );
  const idle = () =>
    "requestIdleCallback" in window
      ? requestIdleCallback(load, { timeout: 3000 })
      : setTimeout(load, 1000);
  if (document.readyState === "complete") idle();
  else addEventListener("load", idle, { once: true });
}
