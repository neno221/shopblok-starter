import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { eventsOf, startSink } from "./sentry-sink";

const envelope = [
  JSON.stringify({ event_id: "e1", dsn: "http://k@127.0.0.1/1" }),
  JSON.stringify({ type: "session" }),
  JSON.stringify({ status: "ok" }),
  JSON.stringify({ type: "event" }),
  JSON.stringify({ event_id: "e1", message: "boom" }),
  "",
].join("\n");

describe("the Sentry sink (T96)", () => {
  it("keeps an envelope's events and skips its other items", () => {
    expect(eventsOf(envelope)).toEqual([{ event_id: "e1", message: "boom" }]);
  });

  it("takes plain and gzip envelopes over HTTP", async () => {
    const sink = await startSink(18970);
    try {
      const post = (body: Uint8Array | string, gzip: boolean) =>
        fetch("http://127.0.0.1:18970/api/1/envelope/", {
          method: "POST",
          headers: gzip ? { "content-encoding": "gzip" } : {},
          body: typeof body === "string" ? body : new Blob([new Uint8Array(body)]),
        });
      expect((await post(envelope, false)).status).toBe(200);
      expect((await post(gzipSync(envelope), true)).status).toBe(200);
      expect(sink.events.map((event) => event.message)).toEqual(["boom", "boom"]);
      expect(sink.paths).toEqual(["/api/1/envelope/", "/api/1/envelope/"]);
    } finally {
      await sink.close();
    }
  });
});
