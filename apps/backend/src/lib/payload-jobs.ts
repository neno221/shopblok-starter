// M7 D148 (1), T111: scheduled publishing on a deployment. Payload publishes a scheduled page or
// post only when something calls `GET /api/payload-jobs/run` (no `autoRun`: a publish must run in a
// Next request, where `revalidateTag` works; SETUP "CMS foundations (T59)"). In development
// `next dev`'s own timer calls it (`apps/storefront/src/lib/cms/jobs-timer.ts`); on a deployment
// Medusa's worker does, every minute (`jobs/payload-jobs-tick.ts`), instead of Vercel Cron, which
// works on every Vercel plan (§0, point b). Payload's access (`cronOrAdmin`) wants
// `Authorization: Bearer <CRON_SECRET>`, the storefront's value.
//
// The endpoint is a GET (Payload made it one for Vercel Cron), not the POST the plan named.

/** Payload's jobs endpoint, on the storefront (where Payload runs). */
export const PAYLOAD_JOBS_PATH = "/api/payload-jobs/run";

/** How long one call may take before it is given up (the next tick tries again). */
export const TICK_TIMEOUT_MS = 20_000;

/** A failing tick is logged at most this often, not every minute. */
export const FAILURE_LOG_INTERVAL_MS = 10 * 60 * 1000;

type Env = Readonly<Record<string, string | undefined>>;

type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

export type TickSettings = { url: string; secret: string };

/** Where and with what to call, or `undefined` (the tick is off) without either variable. */
export function tickSettings(env: Env): TickSettings | undefined {
  const server = (env.PAYLOAD_SERVER_URL ?? "").trim().replace(/\/+$/, "");
  const secret = (env.CRON_SECRET ?? "").trim();
  if (server === "" || secret === "") return undefined;
  return { url: `${server}${PAYLOAD_JOBS_PATH}`, secret };
}

export type TickResult = "off" | "ok" | "failed";

export type TickDeps = {
  fetch?: typeof fetch;
  now?: () => number;
  /** For a test: `TICK_TIMEOUT_MS` otherwise. */
  timeoutMs?: number;
};

/**
 * A tick with its own memory of the last failure it logged: each call reads the environment, calls
 * the endpoint once with the bearer and a 20 s timeout, and resolves; it never throws, so a broken
 * Payload never fails Medusa's job runner. A failure (no answer, a timeout, any status but 2xx) is
 * logged the first time and then at most once per ten minutes while it lasts, and the first success
 * after it is logged once. Off (one line, once) without `CRON_SECRET` or `PAYLOAD_SERVER_URL`.
 */
export function createPayloadJobsTick(deps: TickDeps = {}) {
  const fetchFn = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? TICK_TIMEOUT_MS;
  let lastFailureLog: number | undefined;
  let failing = false;
  let offLogged = false;

  return async function tick(env: Env, logger: Logger): Promise<TickResult> {
    const settings = tickSettings(env);
    if (settings === undefined) {
      if (!offLogged)
        logger.info(
          "payload-jobs-tick: off (CRON_SECRET or PAYLOAD_SERVER_URL is not set; in development next dev runs Payload's jobs itself).",
        );
      offLogged = true;
      return "off";
    }
    offLogged = false;
    let problem: string | undefined;
    try {
      const response = await fetchFn(settings.url, {
        method: "GET",
        headers: { authorization: `Bearer ${settings.secret}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      // The body is Payload's short JSON summary; read it so the connection is released.
      await response.text().catch(() => "");
      if (!response.ok)
        problem =
          response.status === 401
            ? "HTTP 401: Payload refused CRON_SECRET (it must be the storefront's)"
            : `HTTP ${response.status}`;
    } catch (error) {
      problem = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    if (problem === undefined) {
      if (failing) logger.info(`payload-jobs-tick: ${settings.url} answers again.`);
      failing = false;
      lastFailureLog = undefined;
      return "ok";
    }
    failing = true;
    const at = now();
    if (lastFailureLog === undefined || at - lastFailureLog >= FAILURE_LOG_INTERVAL_MS) {
      lastFailureLog = at;
      logger.warn(
        `payload-jobs-tick: ${settings.url} failed (${problem}); scheduled pages wait until it answers. Retried every minute, logged every ten.`,
      );
    }
    return "failed";
  };
}
