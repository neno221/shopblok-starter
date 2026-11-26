/**
 * M7 D136 (5), T109: Express's `trust proxy` for one hop. Medusa 2.23 sets it to 1 itself, before
 * any of the shop's code runs (`express-loader.js`), and offers no option for it: behind Railway's
 * one proxy, `req.ip` is the address that proxy saw (the rate limits' own address, D142), and a
 * visitor's own `X-Forwarded-For` entries before it count for nothing. This test reads Medusa's
 * loader, so an upgrade that changes the hop count, or drops the line, fails here.
 */
import { readFileSync } from "node:fs";
import { createServer, request, type Server } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

const loaderFile = path.join(
  path.dirname(require.resolve("@medusajs/framework/http")),
  "express-loader.js",
);

/** The Express Medusa itself loads (the backend has no Express of its own). */
const express = createRequire(loaderFile)("express") as () => {
  set(name: string, value: unknown): void;
  get(
    path: string,
    handler: (req: { ip?: string }, res: { json(body: unknown): void }) => void,
  ): void;
} & Parameters<typeof createServer>[1];

describe("trust proxy", () => {
  it("is set to one hop by Medusa's own loader, once", () => {
    const source = readFileSync(loaderFile, "utf8");
    expect(source.match(/app\.set\("trust proxy", ([^)]+)\)/g)).toEqual([
      'app.set("trust proxy", 1)',
    ]);
  });

  describe("with one hop, as Express reads it", () => {
    let server: Server;
    let port = 0;

    beforeAll(async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.get("/", (req, res) => {
        res.json({ ip: req.ip });
      });
      server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      port = (server.address() as { port: number }).port;
    });

    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

    const ipFor = (forwarded?: string) =>
      new Promise<string>((resolve, reject) => {
        const req = request(
          {
            host: "127.0.0.1",
            port,
            path: "/",
            headers: forwarded === undefined ? {} : { "x-forwarded-for": forwarded },
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve((JSON.parse(body) as { ip: string }).ip));
          },
        );
        req.on("error", reject);
        req.end();
      });

    it("takes the address the proxy added, not the ones the visitor wrote before it", async () => {
      expect(await ipFor("203.0.113.9")).toBe("203.0.113.9");
      expect(await ipFor("198.51.100.1, 203.0.113.9")).toBe("203.0.113.9");
      expect(await ipFor()).toBe("127.0.0.1");
    });
  });
});
