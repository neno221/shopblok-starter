// M7 D140 (T106): what `/next/csp-report` does with a browser's violation report, apart from the
// request itself (`app/next/csp-report/route.ts`). Pure but for the dedupe's clock, so the unit
// tests feed it both formats, the cap, a duplicate and a URL with a token.
//
// Browsers send two shapes: `report-uri`'s `application/csp-report` (one `{"csp-report": {…}}`,
// kebab-case names) and the Reporting API's `application/reports+json` (an array of
// `{type: "csp-violation", body: {…}}`, camelCase names, batched). Both become one `CspViolation`,
// with the query string and fragment taken off `document-uri`, `blocked-uri`, `source-file` and the
// referrer (a visitor's URL can hold a token: a reset link, a preview's secret), and the secret
// segments of a path replaced (`SECRET_PATHS`), and Sentry gets each in the `csp-report` shape its
// security endpoint documents.

/** The body cap for one report (`application/csp-report`, D140): a real one is under 2 KB. */
export const CSP_REPORT_MAX_BYTES = 8 * 1024;

/**
 * The body cap for a Reporting API batch (`application/reports+json`). Chromium sends every queued
 * report for the endpoint in one POST, each entry repeating the whole policy (about 1 KB with
 * Stripe's hosts), so D140's 8 KB would refuse a page's eight violations at once (PR 148's review,
 * item 2). Each entry is still held to `CSP_REPORT_MAX_BYTES` on its own.
 */
export const CSP_REPORT_BATCH_MAX_BYTES = 64 * 1024;

/** At most this many entries of one batch are read; the rest are dropped. */
export const CSP_REPORT_BATCH_MAX_ENTRIES = 20;

/**
 * How many violations one server process forwards to Sentry per window; past it they are dropped
 * with one warning per window. The dedupe is keyed on what the sender writes, so without this a
 * loop changing `blocked-uri` would spend Sentry's quota (PR 148's review, item 3). Each address
 * has its own limit too (`CSP_REPORTS_PER_ADDRESS`, T108).
 */
export const CSP_REPORT_FORWARD_BUDGET = 100;

/** How long the same violation is dropped after it was forwarded once (D140). */
export const CSP_REPORT_DEDUPE_MS = 60_000;

/**
 * M7 D142 (T108): the posts one visitor's address may send to one instance in a minute; past it the
 * route answers 429 before reading the body (`app/next/csp-report/route.ts`).
 */
export const CSP_REPORTS_PER_ADDRESS = 30;

/** The media types the route takes; anything else is a 415. */
export const CSP_REPORT_TYPES = ["application/csp-report", "application/reports+json"] as const;

/** One violation, in `report-uri`'s names, with its URLs stripped. */
export type CspViolation = {
  "document-uri": string;
  referrer: string;
  "blocked-uri": string;
  "effective-directive": string;
  "violated-directive": string;
  "original-policy": string;
  disposition: string;
  "status-code": number;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
  "script-sample"?: string;
};

/**
 * Paths that carry a secret in a segment, with what replaces it. The order transfer link
 * (`[market]/order/[id]/transfer/[token]`) is the shop's only route with a secret in its path
 * (PR 148's review, item 1); a route added with one belongs here.
 */
const SECRET_PATHS: readonly [RegExp, string][] = [
  [/\/order\/[^/]+\/transfer\/[^/]+/g, "/order/[id]/transfer/[token]"],
];

/**
 * A URL without its query string and fragment, and with `SECRET_PATHS`' segments replaced. A value
 * that is no URL (`inline`, `eval`, `self`, `data`, an empty string) stays as it is; a relative one
 * keeps only its path.
 */
export function stripUrl(value: string): string {
  const text = value.trim();
  if (text === "") return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text) && !text.startsWith("/")) return text;
  const cut = text.search(/[?#]/);
  const bare = cut === -1 ? text : text.slice(0, cut);
  return SECRET_PATHS.reduce(
    (url, [pattern, replacement]) => url.replace(pattern, replacement),
    bare,
  );
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const int = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;

/** The policy as the browser quotes it, cut at 2 KB (it holds no secret: the hosts and the route). */
const policyText = (value: unknown): string => str(value).slice(0, 2048);

function optional(fields: {
  "source-file": string;
  "line-number": number | undefined;
  "column-number": number | undefined;
  "script-sample": string;
}): Partial<CspViolation> {
  const out: Partial<CspViolation> = {};
  if (fields["source-file"] !== "") out["source-file"] = stripUrl(fields["source-file"]);
  if (fields["line-number"] !== undefined) out["line-number"] = fields["line-number"];
  if (fields["column-number"] !== undefined) out["column-number"] = fields["column-number"];
  // The sample is the first 40 characters of the blocked script or style (the browser's cut).
  if (fields["script-sample"] !== "") out["script-sample"] = fields["script-sample"].slice(0, 40);
  return out;
}

/** `report-uri`'s shape: `{"csp-report": {…}}`. */
function fromLegacy(body: Record<string, unknown>): CspViolation | undefined {
  const report = body["csp-report"];
  if (report === null || typeof report !== "object") return undefined;
  const r = report as Record<string, unknown>;
  const effective = str(r["effective-directive"]) || str(r["violated-directive"]);
  if (effective === "") return undefined;
  return {
    "document-uri": stripUrl(str(r["document-uri"])),
    referrer: stripUrl(str(r.referrer)),
    "blocked-uri": stripUrl(str(r["blocked-uri"])),
    "effective-directive": effective,
    "violated-directive": str(r["violated-directive"]) || effective,
    "original-policy": policyText(r["original-policy"]),
    disposition: str(r.disposition) || "enforce",
    "status-code": int(r["status-code"]) ?? 0,
    ...optional({
      "source-file": str(r["source-file"]),
      "line-number": int(r["line-number"]),
      "column-number": int(r["column-number"]),
      "script-sample": str(r["script-sample"]),
    }),
  };
}

/** The Reporting API's shape: `[{type: "csp-violation", body: {…}}, …]`; other types are dropped. */
function fromReportingApi(entry: unknown): CspViolation | undefined {
  if (entry === null || typeof entry !== "object") return undefined;
  const e = entry as Record<string, unknown>;
  if (e.type !== "csp-violation") return undefined;
  const body = e.body;
  if (body === null || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  const effective = str(b.effectiveDirective);
  if (effective === "") return undefined;
  return {
    "document-uri": stripUrl(str(b.documentURL) || str(e.url)),
    referrer: stripUrl(str(b.referrer)),
    "blocked-uri": stripUrl(str(b.blockedURL)),
    "effective-directive": effective,
    "violated-directive": effective,
    "original-policy": policyText(b.originalPolicy),
    disposition: str(b.disposition) || "enforce",
    "status-code": int(b.statusCode) ?? 0,
    ...optional({
      "source-file": str(b.sourceFile),
      "line-number": int(b.lineNumber),
      "column-number": int(b.columnNumber),
      "script-sample": str(b.sample),
    }),
  };
}

/**
 * The violations in a report body of `type`, or `undefined` when the body is not one (the route's
 * 400). An array may hold other report types (deprecation, intervention), which are left out.
 */
export function parseCspReport(type: string, text: string): CspViolation[] | undefined {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (type === "application/csp-report") {
    if (body === null || typeof body !== "object" || Array.isArray(body)) return undefined;
    const one = fromLegacy(body as Record<string, unknown>);
    return one === undefined ? undefined : [one];
  }
  if (!Array.isArray(body)) return undefined;
  return body.slice(0, CSP_REPORT_BATCH_MAX_ENTRIES).flatMap((entry) => {
    // An entry over one report's cap on its own is dropped; the rest of the batch is kept.
    if (JSON.stringify(entry).length > CSP_REPORT_MAX_BYTES) return [];
    const one = fromReportingApi(entry);
    return one === undefined ? [] : [one];
  });
}

/** The body cap for a report of `type` (one report, or a Reporting API batch). */
export function capFor(type: string): number {
  return type === "application/reports+json" ? CSP_REPORT_BATCH_MAX_BYTES : CSP_REPORT_MAX_BYTES;
}

/** What makes two reports the same violation: where, what and by which directive. */
export function violationKey(violation: CspViolation): string {
  return [
    violation["document-uri"],
    violation["blocked-uri"],
    violation["effective-directive"],
    violation["source-file"] ?? "",
    violation["line-number"] ?? "",
    violation.disposition,
  ].join("\n");
}

/**
 * Remembers which violations went out in the last minute (D140), per server process. A page
 * that breaks the policy on every view sends one report a minute, not one per visitor. At most
 * `limit` keys are kept; the oldest go first.
 */
export class RecentViolations {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly windowMs = CSP_REPORT_DEDUPE_MS,
    private readonly limit = 1000,
  ) {}

  /** `true` the first time a key is offered in the window (and records it), `false` after. */
  admit(key: string, now: number): boolean {
    for (const [k, at] of this.seen) {
      if (now - at < this.windowMs) break;
      this.seen.delete(k);
    }
    const at = this.seen.get(key);
    if (at !== undefined && now - at < this.windowMs) return false;
    this.seen.delete(key);
    this.seen.set(key, now);
    while (this.seen.size > this.limit) {
      const oldest = this.seen.keys().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }
    return true;
  }
}

/**
 * Counts the forwards of one server process per window (`CSP_REPORT_FORWARD_BUDGET`).
 * `take(now)` is `true` while the window has budget left; `exhausted` is `true` once per window,
 * the first time it says no, so the route warns once.
 */
export class ForwardBudget {
  private windowStart = 0;
  private used = 0;
  private warned = false;

  constructor(
    private readonly budget = CSP_REPORT_FORWARD_BUDGET,
    private readonly windowMs = CSP_REPORT_DEDUPE_MS,
  ) {}

  take(now: number): { ok: boolean; firstRefusal: boolean } {
    if (now - this.windowStart >= this.windowMs) {
      this.windowStart = now;
      this.used = 0;
      this.warned = false;
    }
    if (this.used < this.budget) {
      this.used += 1;
      return { ok: true, firstRefusal: false };
    }
    const firstRefusal = !this.warned;
    this.warned = true;
    return { ok: false, firstRefusal };
  }
}

/**
 * Sentry's security endpoint for a DSN (`https://<key>@<host>[/<path>]/<project>`):
 * `https://<host>[/<path>]/api/<project>/security/?sentry_key=<key>`, with the environment and
 * release when the build has them. `undefined` for no DSN or one that is not that shape.
 */
export function sentrySecurityUrl(
  dsn: string | undefined,
  extra: { environment?: string | undefined; release?: string | undefined } = {},
): string | undefined {
  const text = (dsn ?? "").trim();
  if (text === "") return undefined;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return undefined;
  }
  const key = url.username;
  const segments = url.pathname.split("/").filter(Boolean);
  const project = segments.pop();
  if (key === "" || project === undefined || !/^\d+$/.test(project)) return undefined;
  const prefix = segments.length > 0 ? `/${segments.join("/")}` : "";
  const target = new URL(`${url.protocol}//${url.host}${prefix}/api/${project}/security/`);
  target.searchParams.set("sentry_key", decodeURIComponent(key));
  const environment = extra.environment?.trim();
  if (environment) target.searchParams.set("sentry_environment", environment);
  const release = extra.release?.trim();
  if (release) target.searchParams.set("sentry_release", release);
  return target.toString();
}

/** The one log line a violation gets when no DSN is set (D140). */
export function logLine(violation: CspViolation): string {
  const blocked = violation["blocked-uri"] || "(nothing)";
  return `csp-report: ${violation.disposition} ${violation["effective-directive"]} blocked ${blocked} on ${violation["document-uri"] || "(unknown page)"}`;
}
