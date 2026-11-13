// What leaves the shop for Sentry (M6 D125, T96): one URL scrubber and the hooks built on it. Pure
// and free of Sentry's code (types only), so the browser's queue, the server's SDK, Payload's hook
// and the tests share it. The backend has the same rules in `apps/backend/src/lib/sentry-scrub.ts`;
// both run the cases in `packages/integrations/src/sentry-scrub-cases.json`, so they cannot drift.
//
// The rules: a query parameter whose name is `code` or holds `token`, `email`, `secret`, `password`,
// `auth`, `key` or `signature` keeps its name and loses its value (`[Filtered]`): the verification
// link (`/verify?code=`), the password reset (`/reset-password?token=&email=`), the newsletter's
// confirmation (`/newsletter/confirm?token=`, T99) and any other key in a URL. An e-mail address
// anywhere (a path, a value, a message) becomes `[email]`. A URL's fragment is dropped. A request
// keeps no cookies, no body and only harmless headers; a user keeps only an id.
import type { Breadcrumb, ErrorEvent, Event } from "@sentry/nextjs";

export const FILTERED = "[Filtered]";
export const EMAIL = "[email]";

/** A parameter name whose value is never sent. */
export function sensitiveName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === "code" || /token|e-?mail|secret|passw|auth|key|signature|session|cookie/.test(lower)
  );
}

// `name=value` in a URL, a query string or a message: the name is a word (brackets for `a[b]`).
const PAIR = /([A-Za-z0-9_.\-[\]]+)=([^&#\s"'<>]*)/g;
// An e-mail address, raw or percent-encoded (`%40`), as it can sit in a path or a value.
const ADDRESS = /[A-Za-z0-9._%+-]+(?:@|%40)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/gi;

/** A message, a span name or a query string with its sensitive values and e-mail addresses removed. */
export function scrubText(text: string): string {
  return text
    .replace(PAIR, (pair: string, name: string) =>
      sensitiveName(name.replace(/\[.*$/, "")) ? `${name}=${FILTERED}` : pair,
    )
    .replace(ADDRESS, EMAIL);
}

/** A URL (absolute or a path) without its fragment, its sensitive values or an e-mail address. */
export function scrubUrl(url: string): string {
  const hash = url.indexOf("#");
  return scrubText(hash === -1 ? url : url.slice(0, hash));
}

const scrubMaybe = <T>(value: T, scrub: (text: string) => string): T =>
  (typeof value === "string" ? scrub(value) : value) as T;

/** Headers a report may keep: none of them carries a credential, an address or a page's URL. */
const SAFE_HEADERS = new Set<string>([
  "accept",
  "accept-encoding",
  "accept-language",
  "content-length",
  "content-type",
  "host",
  "user-agent",
]);

type Request = NonNullable<Event["request"]>;

function scrubRequest(request: Request): Request {
  const headers =
    request.headers === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(request.headers).filter(([name]) => SAFE_HEADERS.has(name.toLowerCase())),
        );
  const query = request.query_string;
  const out: Request = {
    ...request,
    url: scrubMaybe(request.url, scrubUrl),
    query_string:
      typeof query === "string"
        ? scrubText(query)
        : Array.isArray(query)
          ? query.map(([name, value]) => [name, sensitiveName(name) ? FILTERED : scrubText(value)])
          : query === undefined
            ? undefined
            : Object.fromEntries(
                Object.entries(query).map(([name, value]) => [
                  name,
                  sensitiveName(name) ? FILTERED : scrubText(value),
                ]),
              ),
    ...(headers === undefined ? {} : { headers }),
  };
  delete out.cookies;
  delete out.data;
  delete out.env;
  if (out.query_string === undefined) delete out.query_string;
  return out;
}

/** A key whose text value is a URL (or a path), so its fragment goes too. */
const URL_NAME = /url|from|^to$|href|path|referer|target|route|query/i;
/** How deep `scrubValue` walks: Sentry's own normalisation stops at 3 levels by default. */
const MAX_DEPTH = 8;

/**
 * Any value as it can sit in a breadcrumb's `data`, a context or `extra`, scrubbed all the way
 * down: text through `scrubText` (or `scrubUrl` under a URL's name), the value under a sensitive
 * name dropped, arrays and objects walked, an `Error` (a console breadcrumb's arguments hold them)
 * turned into its scrubbed name and message. A copy: nothing given is changed.
 */
export function scrubValue(value: unknown, name = "", depth = 0): unknown {
  if (typeof value === "string") return URL_NAME.test(name) ? scrubUrl(value) : scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[Filtered]";
  if (value instanceof Error) return scrubText(`${value.name}: ${value.message}`);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, name, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveName(key) && item !== null && item !== undefined && typeof item !== "boolean"
        ? FILTERED
        : scrubValue(item, key, depth + 1),
    ]),
  );
}

/**
 * `beforeBreadcrumb`: the message and the whole of `data` (navigation `from`/`to`, fetch and xhr
 * `url`, and a console breadcrumb's `arguments`, the raw values the shop logged).
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data;
  return {
    ...breadcrumb,
    ...(breadcrumb.message === undefined ? {} : { message: scrubText(breadcrumb.message) }),
    ...(data === undefined ? {} : { data: scrubValue(data) as Record<string, unknown> }),
  };
}

/**
 * Every part of an error or a transaction that can carry a URL, a key or an address: the request
 * (cookies, body and headers but the harmless ones dropped), the user (only an id), the messages,
 * the exceptions' values, the transaction's name, the tags, the breadcrumbs, the contexts and
 * `extra`.
 */
export function scrubEvent<T extends Event>(event: T): T {
  const out: T = { ...event };
  if (out.request !== undefined) out.request = scrubRequest(out.request);
  if (out.user !== undefined) {
    const id = out.user.id;
    out.user = id === undefined ? {} : { id };
  }
  if (out.message !== undefined) out.message = scrubText(out.message);
  if (out.logentry?.message !== undefined)
    out.logentry = { ...out.logentry, message: scrubText(out.logentry.message) };
  if (out.transaction !== undefined) out.transaction = scrubUrl(out.transaction);
  if (out.exception?.values !== undefined)
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((value) => ({
        ...value,
        ...(value.value === undefined ? {} : { value: scrubText(value.value) }),
      })),
    };
  if (out.tags !== undefined)
    out.tags = Object.fromEntries(
      Object.entries(out.tags).map(([name, value]) => [name, scrubMaybe(value, scrubText)]),
    );
  if (out.breadcrumbs !== undefined) out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb);
  // `contexts.nextjs.request_path` (the storefront's `onRequestError`), the runtime's and the
  // trace's: all walked, as `extra` is.
  if (out.contexts !== undefined) out.contexts = scrubValue(out.contexts) as T["contexts"];
  if (out.extra !== undefined) out.extra = scrubValue(out.extra) as T["extra"];
  if (out.spans !== undefined)
    out.spans = out.spans.map((span) => ({
      ...span,
      ...(span.description === undefined ? {} : { description: scrubUrl(span.description) }),
      ...(span.data === undefined ? {} : { data: scrubAttributes(span.data) }),
    }));
  return out;
}

/** A span's attributes: URL-like ones through `scrubUrl`, other text through `scrubText`. */
export function scrubAttributes<T extends Record<string, unknown>>(attributes: T): T {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      name,
      /url|target|path|route|query|referer/i.test(name)
        ? scrubMaybe(value, scrubUrl)
        : scrubMaybe(value, scrubText),
    ]),
  ) as T;
}

/** A streamed span (`beforeSendSpan`, v11's default), the shape the hook gets. */
export type SpanLike = { name: string; attributes?: Record<string, unknown> };

/** `beforeSendSpan`: v11's streamed spans replace transactions, so the name and the URLs go here. */
export function scrubSpan<T extends SpanLike>(span: T): T {
  return {
    ...span,
    name: scrubUrl(span.name),
    ...(span.attributes === undefined ? {} : { attributes: scrubAttributes(span.attributes) }),
  };
}

/** The hooks every `Sentry.init` passes (the storefront's server, browser and Payload; Medusa's). */
export const scrubHooks = {
  beforeSend: (event: ErrorEvent) => scrubEvent(event),
  beforeBreadcrumb: (breadcrumb: Breadcrumb) => scrubBreadcrumb(breadcrumb),
  // v11 streams spans (`traceLifecycle: "stream"`, the default) and ignores `beforeSendTransaction`
  // with a warning: a transaction's name and URLs are scrubbed here, span by span, instead.
  beforeSendSpan: <T extends SpanLike>(span: T) => scrubSpan(span),
};

/**
 * What Sentry may collect at all (v11's `dataCollection` replaces `sendDefaultPii`, and with
 * nothing set collects everything): no user data, cookies, bodies, local variables or query data;
 * the harmless headers only. The hooks above remove what still gets through.
 */
export const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: [...SAFE_HEADERS] }, response: false },
  httpBodies: [],
  urlQueryParams: {
    deny: ["token", "code", "email", "secret", "password", "auth", "key", "signature", "session"],
  },
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
