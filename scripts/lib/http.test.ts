import http from "node:http";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { codeOf, jsonOf, request } from "./http.ts";

const servers: http.Server[] = [];

function serve(handler: http.RequestListener): Promise<string> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    servers.push(server);
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${(server.address() as net.AddressInfo).port}`);
    });
  });
}

/** A port nothing listens on: bind one, note it, close it. */
async function closedPort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

describe("request", () => {
  it("returns the status and the body of any answer, an error status included", async () => {
    const url = await serve((req, res) => {
      res.statusCode = req.url === "/missing" ? 404 : 200;
      res.end(req.url === "/missing" ? "no" : "OK");
    });
    expect(await request(`${url}/health`)).toEqual({ kind: "response", status: 200, text: "OK" });
    expect(await request(`${url}/missing`)).toEqual({ kind: "response", status: 404, text: "no" });
  });

  it("does not follow a redirect: it is an answer", async () => {
    const url = await serve((_req, res) => {
      res.statusCode = 308;
      res.setHeader("location", "/elsewhere");
      res.end();
    });
    expect(await request(url)).toMatchObject({ kind: "response", status: 308 });
  });

  it("sends the headers, and a JSON body with its content type", async () => {
    let seen: { method?: string; key?: string | string[]; type?: string | string[]; body: string } =
      {
        body: "",
      };
    const url = await serve((req, res) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        seen = {
          ...(req.method === undefined ? {} : { method: req.method }),
          key: req.headers["x-publishable-api-key"],
          type: req.headers["content-type"],
          body,
        };
        res.end("{}");
      });
    });
    await request(url, {
      method: "POST",
      headers: { "x-publishable-api-key": "pk_x" },
      body: { entity: "product" },
    });
    expect(seen).toEqual({
      method: "POST",
      key: "pk_x",
      type: "application/json",
      body: '{"entity":"product"}',
    });
  });

  it("says refused when nothing listens (the server is not running)", async () => {
    const port = await closedPort();
    expect(await request(`http://127.0.0.1:${port}`)).toEqual({ kind: "refused" });
    // `localhost` can resolve to two addresses: a refusal on both is still a refusal.
    expect(await request(`http://localhost:${port}`)).toEqual({ kind: "refused" });
  });

  it("says unreachable, with the wait, when the server never answers", async () => {
    const url = await serve(() => {
      // never responds
    });
    const result = await request(url, { timeoutMs: 150 });
    expect(result).toEqual({ kind: "unreachable", reason: "no answer within 0.15 s" });
  });

  it("says unreachable for a host that does not exist", async () => {
    const result = await request("http://nonexistent.invalid/", { timeoutMs: 3000 });
    expect(result.kind).toBe("unreachable");
  });
});

describe("jsonOf", () => {
  it("parses a JSON body and gives undefined for anything else", () => {
    expect(jsonOf({ kind: "response", status: 200, text: '{"a":1}' })).toEqual({ a: 1 });
    expect(jsonOf({ kind: "response", status: 200, text: "not json" })).toBeUndefined();
    expect(jsonOf({ kind: "refused" })).toBeUndefined();
  });
});

describe("codeOf", () => {
  it("finds the code under fetch's wrapper, or inside an aggregate of several addresses", () => {
    expect(codeOf(new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }))).toBe(
      "ECONNREFUSED",
    );
    expect(
      codeOf(
        new TypeError("fetch failed", {
          cause: { errors: [{ message: "x" }, { code: "ECONNREFUSED" }] },
        }),
      ),
    ).toBe("ECONNREFUSED");
    expect(codeOf(new Error("plain"))).toBeUndefined();
    expect(codeOf(undefined)).toBeUndefined();
  });

  it("sees the refusal behind an IPv6 error, as Node reports it for a dual-address `localhost`", () => {
    // Measured in a container without IPv6: the AggregateError's own code is the first address's.
    const aggregate = Object.assign(new AggregateError([]), {
      code: "EAFNOSUPPORT",
      errors: [{ code: "EAFNOSUPPORT" }, { code: "ECONNREFUSED" }],
    });
    expect(codeOf(new TypeError("fetch failed", { cause: aggregate }))).toBe("ECONNREFUSED");
  });

  it("keeps the first code when no address refused", () => {
    const aggregate = Object.assign(new AggregateError([]), {
      code: "ETIMEDOUT",
      errors: [{ code: "ETIMEDOUT" }, { code: "EHOSTUNREACH" }],
    });
    expect(codeOf(new TypeError("fetch failed", { cause: aggregate }))).toBe("ETIMEDOUT");
  });
});
