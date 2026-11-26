import { after, connection } from "next/server";
import {
  CSP_REPORT_FORWARD_BUDGET,
  CSP_REPORT_TYPES,
  CSP_REPORTS_PER_ADDRESS,
  ForwardBudget,
  RecentViolations,
  capFor,
  logLine,
  parseCspReport,
  sentrySecurityUrl,
  violationKey,
  type CspViolation,
} from "../../../lib/security/csp-report";
import { visitorAddress } from "../../../lib/security/client-signature";
import { memoryLimit } from "../../../lib/security/rate-limit";

// M7 D140 (T106): where the policy's `report-uri` and `report-to` send a violation. Both report
// formats; a body over its cap is a 413 (8 KB for one report, 64 KB for a Reporting API batch,
// whose entries are held to 8 KB each); the same violation within a minute is dropped; each URL
// loses its query string, its fragment and any secret path segment (`lib/security/csp-report.ts`);
// at most `CSP_REPORT_FORWARD_BUDGET` violations a minute go on; then Sentry's security endpoint for
// `NEXT_PUBLIC_SENTRY_DSN`, so the key stays on the server and no visitor's token reaches Sentry.
// Without a DSN, one log line per violation. The 204 goes back first: the forward runs in `after()`,
// so the browser never waits on Sentry. Under `/next`, which the proxy's matcher skips. M7 D142
// (T108): before any of that, at most `CSP_REPORTS_PER_ADDRESS` posts a minute per visitor's
// address, counted in this instance's memory (a 429 past it); it never asks Medusa.

const recent = new RecentViolations();
const budget = new ForwardBudget();

const perAddress = memoryLimit(CSP_REPORTS_PER_ADDRESS, 60_000);

/** How long Sentry gets before the forward gives up. */
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
  if (!perAddress.hit(visitorAddress(request.headers) ?? "unknown")) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60" },
    });
  }
  const declared = Number(request.headers.get("content-length") ?? "");
  const cap = capFor(type);
  if (Number.isFinite(declared) && declared > cap) {
    return plain(413, "Payload Too Large");
  }
  const text = await readCapped(request, cap);
  if (text === undefined) return plain(413, "Payload Too Large");
  const violations = parseCspReport(type, text);
  if (violations === undefined) return plain(400, "Bad Request");

  const now = Date.now();
  const fresh = violations.filter((violation) => {
    if (!recent.admit(violationKey(violation), now)) return false;
    const { ok, firstRefusal } = budget.take(now);
    if (firstRefusal) {
      console.warn(
        `csp-report: over ${CSP_REPORT_FORWARD_BUDGET} violations this minute; the rest are dropped`,
      );
    }
    return ok;
  });
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
  after(async () => {
    await Promise.all(fresh.map((violation) => forward(target, violation, userAgent)));
  });
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
