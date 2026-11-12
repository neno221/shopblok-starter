// A local stand-in for PostHog's ingest (M6 D124, T97): an HTTP server that takes what `posthog-js`
// sends through the site's `/ingest` (Next's rewrite forwards it here) and what Medusa's PostHog
// provider sends (`posthog-node`, `/batch/`), decodes it (gzip, base64 or plain, as either sends it)
// and keeps the events, so that `e2e/integrations/posthog.spec.ts` runs without a PostHog account.
// CI's `integrations-live` builds the storefront and starts Medusa with `SINK_KEY` and `SINK_HOST`
// when the PostHog secrets are not set; the spec starts the sink. The key is a stand-in, not a key:
// the sink takes any.
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";

export const SINK_HOST = "http://127.0.0.1:8971";
/** The project key CI gives both apps when it has no PostHog secret. */
export const SINK_KEY = "phc_ShopblokE2eSinkStandIn";

export type SinkEvent = {
  event: string;
  distinctId: string | undefined;
  properties: Record<string, unknown>;
  /** The path it came on (`/e/`, `/batch/`, …), with its query. */
  path: string;
  method: string;
};

type Raw = Record<string, unknown> & {
  event?: unknown;
  distinct_id?: unknown;
  properties?: unknown;
};

/** The JSON a request holds, as `posthog-js` or `posthog-node` sent it. */
export function decodeBody(path: string, headers: IncomingHttpHeaders, raw: Buffer): unknown {
  const query = new URL(path, SINK_HOST).searchParams;
  let body = raw;
  // gzip by its header, its query, or its first two bytes: posthog-js 1.447 sends a gzipped body
  // to `/e/` with neither (`text/plain`).
  const gzipped = body.length > 1 && body[0] === 0x1f && body[1] === 0x8b;
  if (headers["content-encoding"] === "gzip" || query.get("compression") === "gzip-js" || gzipped)
    body = gunzipSync(body);
  let text = body.toString("utf8");
  if (text.startsWith("data=")) {
    const data = new URLSearchParams(text).get("data") ?? "";
    text =
      query.get("compression") === "base64" || !/^[[{]/.test(data)
        ? Buffer.from(data, "base64").toString("utf8")
        : data;
  }
  return JSON.parse(text) as unknown;
}

/** The events in a decoded body: a batch (`[…]` or `{ batch: […] }`) or one event. */
export function eventsIn(json: unknown, path: string, method: string): SinkEvent[] {
  const list: Raw[] = Array.isArray(json)
    ? (json as Raw[])
    : typeof json === "object" &&
        json !== null &&
        Array.isArray((json as { batch?: unknown }).batch)
      ? (json as { batch: Raw[] }).batch
      : typeof json === "object" && json !== null && "event" in json
        ? [json as Raw]
        : [];
  return list
    .filter((each) => typeof each.event === "string")
    .map((each) => {
      const properties = (each.properties ?? {}) as Record<string, unknown>;
      const id = each.distinct_id ?? properties["distinct_id"];
      return {
        event: each.event as string,
        distinctId: typeof id === "string" ? id : undefined,
        properties,
        path,
        method,
      };
    });
}

export type Sink = {
  events: SinkEvent[];
  /** Every request's method and path, for what came in at all. */
  requests: string[];
  /** The port it listens on (the given one, or the system's pick for 0). */
  port: number;
  close: () => Promise<void>;
};

export async function startSink(port = Number(new URL(SINK_HOST).port)): Promise<Sink> {
  const events: SinkEvent[] = [];
  const requests: string[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const path = request.url ?? "";
      const method = request.method ?? "";
      requests.push(`${method} ${path}`);
      try {
        const raw = Buffer.concat(chunks);
        if (raw.length > 0)
          events.push(...eventsIn(decodeBody(path, request.headers, raw), path, method));
      } catch {
        // Not an event batch (a flags request, a script): kept out of `events`.
      }
      response.writeHead(200, { "content-type": "application/json" }).end('{"status":1}');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    events,
    requests,
    port: (server.address() as AddressInfo).port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
