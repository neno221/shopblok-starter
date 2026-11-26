import { connection } from "next/server";
import {
  CSP_REPORT_MAX_BYTES,
  CSP_REPORT_TYPES,
  RecentViolations,
  logLine,
  parseCspReport,
  sentrySecurityUrl,
  violationKey,
  type CspViolation,
} from "../../../lib/security/csp-report";

// M7 D140 (T106): where the policy's `report-uri` and `report-to` send a violation. Both report
// formats; a body over 8 KB is a 413; the same violation within a minute is dropped; each URL loses
// its query string and fragment (`lib/security/csp-report.ts`); then Sentry's security endpoint for
// `NEXT_PUBLIC_SENTRY_DSN`, so the key stays on the server and no visitor's query string reaches
// Sentry. Without a DSN, one log line per violation and a 204. Under `/next`, which the proxy's
// matcher skips. T108 adds its rate limit (D142).

const recent = new RecentViolations();

/** How long Sentry gets before the route gives up on a forward (the browser never waits on it). */
const FORWARD_TIMEOUT_MS = 3_000;

const noContent = () => new Response(null, { status: 204 });
const plain = (status: number, text: string) =>
  new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(request: Request): Promise<Response> {
  await connection();
  const type =
    (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!(CSP_REPORT_TYPES as readonly string[]).includes(type)) {
    return plain(415, "Unsupported Media Type");
  }
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > CSP_REPORT_MAX_BYTES) {
    return plain(413, "Payload Too Large");
  }
  const text = await readCapped(request, CSP_REPORT_MAX_BYTES);
  if (text === undefined) return plain(413, "Payload Too Large");
  const violations = parseCspReport(type, text);
  if (violations === undefined) return plain(400, "Bad Request");

  const now = Date.now();
  const fresh = violations.filter((violation) => recent.admit(violationKey(violation), now));
  if (fresh.length === 0) return noContent();

  // The literals, as every Sentry module reads them (T96): `next build` writes the DSN in.
  const target = sentrySecurityUrl(process.env.NEXT_PUBLIC_SENTRY_DSN, {
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.SENTRY_RELEASE,
  });
  if (target === undefined) {
    for (const violation of fresh) console.warn(logLine(violation));
    return noContent();
  }
  const userAgent = request.headers.get("user-agent") ?? "";
  await Promise.all(fresh.map((violation) => forward(target, violation, userAgent)));
  return noContent();
}

/** The body as text, or `undefined` past `limit` bytes (a body sent without `Content-Length`). */
async function readCapped(request: Request, limit: number): Promise<string | undefined> {
  if (request.body === null) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function forward(target: string, violation: CspViolation, userAgent: string) {
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/csp-report",
        ...(userAgent === "" ? {} : { "User-Agent": userAgent }),
      },
      body: JSON.stringify({ "csp-report": violation }),
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) console.warn(`csp-report: Sentry answered ${response.status}`);
  } catch (error) {
    console.warn(`csp-report: could not reach Sentry (${(error as Error).name})`);
  }
}
