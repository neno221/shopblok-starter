// M7 D140 (T106): what `/next/csp-report` does with a browser's violation report, apart from the
// request itself (`app/next/csp-report/route.ts`). Pure but for the dedupe's clock, so the unit
// tests feed it both formats, the cap, a duplicate and a URL with a token.
//
// Browsers send two shapes: `report-uri`'s `application/csp-report` (one `{"csp-report": {…}}`,
// kebab-case names) and the Reporting API's `application/reports+json` (an array of
// `{type: "csp-violation", body: {…}}`, camelCase names, batched). Both become one `CspViolation`,
// with the query string and fragment taken off `document-uri`, `blocked-uri`, `source-file` and the
// referrer (a visitor's URL can hold a token: a reset link, a preview's secret), and Sentry gets
// each in the `csp-report` shape its security endpoint documents.

/** The body cap (D140): a real report is well under 2 KB; above this the route answers 413. */
export const CSP_REPORT_MAX_BYTES = 8 * 1024;

/** How long the same violation is dropped after it was forwarded once (D140). */
export const CSP_REPORT_DEDUPE_MS = 60_000;

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
 * A URL without its query string and fragment. A value that is no URL (`inline`, `eval`, `self`,
 * `data`, an empty string) stays as it is; a relative one keeps only its path.
 */
export function stripUrl(value: string): string {
  const text = value.trim();
  if (text === "") return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text) && !text.startsWith("/")) return text;
  const cut = text.search(/[?#]/);
  return cut === -1 ? text : text.slice(0, cut);
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
  return body.flatMap((entry) => {
    const one = fromReportingApi(entry);
    return one === undefined ? [] : [one];
  });
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
