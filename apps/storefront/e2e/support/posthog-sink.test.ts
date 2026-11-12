import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { decodeBody, eventsIn, startSink, type Sink } from "./posthog-sink";

// T97: the stand-in reads what `posthog-js` and `posthog-node` send.
const batch = [{ event: "$pageview", properties: { distinct_id: "anon_1", market: "en-us" } }];

describe("the PostHog sink", () => {
  it("decodes gzip-js, base64 and plain bodies", () => {
    const json = JSON.stringify(batch);
    expect(decodeBody("/e/?compression=gzip-js", {}, gzipSync(json))).toEqual(batch);
    const form = `data=${encodeURIComponent(Buffer.from(json).toString("base64"))}`;
    expect(decodeBody("/e/?compression=base64", {}, Buffer.from(form))).toEqual(batch);
    expect(decodeBody("/e/", {}, Buffer.from(json))).toEqual(batch);
    expect(
      decodeBody("/batch/", { "content-encoding": "gzip" }, gzipSync(JSON.stringify({ batch }))),
    ).toEqual({ batch });
  });

  it("reads the browser's batch and the server's", () => {
    expect(eventsIn(batch, "/e/", "POST")).toEqual([
      {
        event: "$pageview",
        distinctId: "anon_1",
        properties: batch[0]!.properties,
        path: "/e/",
        method: "POST",
      },
    ]);
    const server = {
      api_key: "x",
      batch: [{ event: "order_placed", distinct_id: "d", properties: {} }],
    };
    expect(
      eventsIn(server, "/batch/", "POST").map((each) => [each.event, each.distinctId]),
    ).toEqual([["order_placed", "d"]]);
    expect(eventsIn({ flags: {} }, "/flags/", "POST")).toEqual([]);
  });

  let sink: Sink | undefined;
  afterEach(async () => {
    await sink?.close();
  });

  it("keeps what it is sent", async () => {
    sink = await startSink(0);
    const answer = await fetch(`http://127.0.0.1:${sink.port}/e/?compression=gzip-js`, {
      method: "POST",
      body: gzipSync(JSON.stringify(batch)),
    });
    expect(answer.status).toBe(200);
    expect(sink.events.map((each) => [each.event, each.path])).toEqual([
      ["$pageview", "/e/?compression=gzip-js"],
    ]);
    expect(sink.requests).toEqual(["POST /e/?compression=gzip-js"]);
  });
});
