// A local stand-in for Sentry's ingest (M6 D125, T96): an HTTP server that takes envelopes on
// `/api/<project>/envelope/` (gzip or not, as the SDKs send them) and keeps their events, so that
// `e2e/integrations/sentry.spec.ts` runs without a Sentry account. CI's `integrations-live` points
// both apps' DSNs at it (`SENTRY_SINK_DSN`) when the Sentry secrets are not set; the spec starts it.
import { createServer, type Server } from "node:http";
import { gunzipSync, inflateSync } from "node:zlib";

/** The DSN CI gives both apps when it has no Sentry secret: this sink, on the runner. */
export const SINK_DSN = "http://e2esink@127.0.0.1:8970/1";

export type SinkEvent = Record<string, unknown> & {
  event_id?: string;
  exception?: { values?: { type?: string; value?: string }[] };
  request?: { url?: string; headers?: Record<string, string>; cookies?: unknown; data?: unknown };
  tags?: Record<string, unknown>;
  user?: Record<string, unknown>;
};

/** The events of an envelope (the items of type `event`), in order. Other items are skipped. */
export function eventsOf(envelope: string): SinkEvent[] {
  const lines = envelope.split("\n");
  const events: SinkEvent[] = [];
  // Line 0 is the envelope's header; then each item is a header line and a payload line.
  for (let index = 1; index + 1 < lines.length; index += 2) {
    const header = JSON.parse(lines[index]!) as { type?: string };
    if (header.type === "event") events.push(JSON.parse(lines[index + 1]!) as SinkEvent);
  }
  return events;
}

export type Sink = {
  events: SinkEvent[];
  /** Every envelope's path, for the count of what came in. */
  paths: string[];
  close: () => Promise<void>;
};

export async function startSink(port = Number(new URL(SINK_DSN).port)): Promise<Sink> {
  const events: SinkEvent[] = [];
  const paths: string[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks);
      const encoding = request.headers["content-encoding"];
      const body =
        encoding === "gzip" ? gunzipSync(raw) : encoding === "deflate" ? inflateSync(raw) : raw;
      paths.push(request.url ?? "");
      try {
        events.push(...eventsOf(body.toString("utf8")));
      } catch {
        // Not an envelope (a session, a client report in another shape): kept out of `events`.
      }
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    events,
    paths,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
