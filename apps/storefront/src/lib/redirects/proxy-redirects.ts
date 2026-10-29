import { env as processEnv } from "../env";
import { appRouteUrl } from "../markets/proxy-market-map";
import { describeError, marketLoadTimeoutMs } from "../markets/source";
import { REDIRECT_TYPES, type RedirectEntry, type RedirectList } from "./rules";

/** Where the proxy reads the redirects: `app/next/redirects/route.ts`, which its matcher skips. */
export const REDIRECTS_ROUTE = "/next/redirects";

/** How long the proxy keeps the list (D82: refreshed every 30 s, like the market map, D10). */
export const REDIRECTS_TTL_MS = 30_000;

const NONE: RedirectList = { redirects: [] };

type Env = { NODE_ENV?: string; NEXT_PUBLIC_BASE_URL?: string };

type ProxyRedirectsOptions = {
  env?: Env;
  fetcher?: typeof fetch;
  /** A monotonic clock in ms; `performance.now()` by default. */
  now?: () => number;
  warn?: (message: string) => void;
};

const isEntry = (value: unknown): value is RedirectEntry => {
  if (value === null || typeof value !== "object") return false;
  const { from, type, to } = value as Partial<Record<keyof RedirectEntry, unknown>>;
  if (typeof from !== "string" || !(REDIRECT_TYPES as readonly unknown[]).includes(type))
    return false;
  if (to === null || typeof to !== "object") return false;
  const target = to as { url?: unknown; paths?: unknown };
  return (
    typeof target.url === "string" || (target.paths !== null && typeof target.paths === "object")
  );
};

/**
 * The CMS redirects for the proxy (D82): the redirect route's JSON, kept in process for 30 s with
 * the market map's rules (`proxy-market-map.ts`): callers share one read, past the TTL they get
 * the list held while a new one is read, and a read that fails or times out keeps the last good
 * list. Before any list is held, a failure is no redirects (with a warning): the shop answers its
 * pages without them rather than not at all. Imports no Payload (D10), and checks the shape it
 * reads, since anything could answer on the address.
 */
export function createProxyRedirects(options: ProxyRedirectsOptions = {}) {
  const env: Env = options.env ?? processEnv;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => performance.now());
  const warn = options.warn ?? ((message: string) => console.warn(message));
  const timeoutMs = marketLoadTimeoutMs(env);

  let current: { list: RedirectList; expires: number } | undefined;
  let reading: Promise<RedirectList> | undefined;

  async function load(): Promise<RedirectList> {
    const url = appRouteUrl(REDIRECTS_ROUTE, env);
    const response = await fetcher(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`${url.href} answered ${response.status}`);
    const body = (await response.json().catch(() => null)) as { redirects?: unknown } | null;
    if (!Array.isArray(body?.redirects))
      throw new Error(`${url.href} did not answer a list of redirects`);
    return { redirects: body.redirects.filter(isEntry) };
  }

  async function read(): Promise<RedirectList> {
    try {
      const list = await load();
      current = { list, expires: now() + REDIRECTS_TTL_MS };
      return list;
    } catch (error) {
      const kept = current?.list ?? NONE;
      warn(
        `redirects: the list could not be read (${describeError(error)}); ${current === undefined ? "answering without redirects" : "still serving the list read earlier"}`,
      );
      current = { list: kept, expires: now() + REDIRECTS_TTL_MS };
      return kept;
    }
  }

  return {
    /** The redirects, from the cache when they are younger than the TTL. */
    async get(): Promise<RedirectList> {
      if (current !== undefined && now() < current.expires) return current.list;
      reading ??= read().finally(() => {
        reading = undefined;
      });
      return current !== undefined ? current.list : reading;
    },
  };
}

export const getProxyRedirects = createProxyRedirects().get;
