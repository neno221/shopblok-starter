import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { isPrivateKey, PRIVATE_PREFIX, PUBLIC_PREFIX, R2FileProviderService } from "../service";

/**
 * M6 D127 (T95): the R2 provider against a fake S3 API (a local server that records each request
 * and answers as S3 does), through Medusa's own `file-s3` services and the AWS SDK they use. What it
 * shows: which bucket each call reaches (public files to `S3_BUCKET`, private ones and Medusa's
 * default to `S3_PRIVATE_BUCKET`), that no ACL header is sent (`acl: false`), and that a presigned
 * link names the bucket that holds the file. The live check against R2 itself is
 * `e2e/integrations/r2.spec.ts` (with the secrets).
 */

type Received = { method: string; path: string; headers: IncomingMessage["headers"]; body: string };

let server: Server;
let endpoint: string;
const received: Received[] = [];

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      const path = request.url ?? "";
      received.push({ method: request.method ?? "", path, headers: request.headers, body });
      if (request.method === "POST" && path.includes("?delete")) {
        response.writeHead(200, { "content-type": "application/xml" });
        response.end('<?xml version="1.0" encoding="UTF-8"?><DeleteResult></DeleteResult>');
        return;
      }
      if (request.method === "GET") {
        response.writeHead(200, { "content-type": "text/csv", "content-length": "7" });
        response.end("a,b\n1,2");
        return;
      }
      response.writeHead(200, { etag: '"etag"' });
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  received.length = 0;
});

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

const options = () => ({
  endpoint,
  region: "auto",
  access_key_id: "stand-in-id",
  secret_access_key: "stand-in-secret",
  bucket: "shop-public",
  private_bucket: "shop-private",
  file_url: "https://media.example.com/",
});

const provider = () => new R2FileProviderService({ logger: logger as never }, options());

/** The bucket and key of a path-style request (`/<bucket>/<key>`). */
const target = (path: string) => {
  const [bucket, ...rest] = path.split("?")[0]!.slice(1).split("/");
  return { bucket, key: decodeURIComponent(rest.join("/")) };
};

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

describe("R2FileProviderService", () => {
  it("puts a public upload in the public bucket under medusa/, with no ACL header, linked from S3_PUBLIC_URL", async () => {
    const result = await provider().upload({
      filename: "shirt.png",
      mimeType: "image/png",
      content: png,
      access: "public",
    });

    expect(received).toHaveLength(1);
    const put = received[0]!;
    expect(put.method).toBe("PUT");
    expect(target(put.path).bucket).toBe("shop-public");
    expect(target(put.path).key).toMatch(/^medusa\/shirt-[0-9A-Z]{26}\.png$/);
    expect(put.headers["x-amz-acl"]).toBeUndefined();
    expect(result.key).toBe(target(put.path).key);
    expect(result.url).toBe(`https://media.example.com/${result.key}`);
  });

  it("puts a private upload, and one with no access (Medusa's default), in the private bucket under private/", async () => {
    const service = provider();
    const one = await service.upload({
      filename: "import.csv",
      mimeType: "text/csv",
      content: "a,b",
      access: "private",
    });
    const two = await service.upload({ filename: "other.csv", mimeType: "text/csv", content: "a" });

    expect(received.map((r) => target(r.path).bucket)).toEqual(["shop-private", "shop-private"]);
    for (const [request, result] of [
      [received[0]!, one],
      [received[1]!, two],
    ] as const) {
      expect(request.headers["x-amz-acl"]).toBeUndefined();
      expect(request.headers["cache-control"]).toBe("private, no-store");
      expect(result.key.startsWith(PRIVATE_PREFIX)).toBe(true);
      // Never a link on the public domain.
      expect(result.url.startsWith("https://media.example.com")).toBe(false);
      expect(result.url).toBe(`${endpoint}/shop-private/${result.key}`);
    }
  });

  it("streams an export (Medusa passes no access) into the private bucket", async () => {
    const { writeStream, promise, fileKey } = await provider().getUploadStream({
      filename: "1700000000000-product-exports.csv",
      mimeType: "text/csv",
    });
    writeStream.end("Product Id,Product Handle\n");
    await promise;

    expect(fileKey).toMatch(/^private\/1700000000000-product-exports-[0-9A-Z]{26}\.csv$/);
    expect(received.map((r) => [r.method, target(r.path).bucket])).toEqual([
      ["PUT", "shop-private"],
    ]);
    expect(received[0]!.headers["x-amz-acl"]).toBeUndefined();
  });

  it("signs an upload link for the private bucket unless the file is public", async () => {
    const service = provider();
    const csv = await service.getPresignedUploadUrl({
      filename: "import.csv",
      mimeType: "text/csv",
    });
    const pic = await service.getPresignedUploadUrl({
      filename: "pic.webp",
      mimeType: "image/webp",
      access: "public",
    });

    const csvUrl = new URL(csv.url);
    expect(csvUrl.origin).toBe(endpoint);
    expect(target(csvUrl.pathname).bucket).toBe("shop-private");
    expect(csv.key).toBe("private/import.csv");
    expect(csvUrl.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(csvUrl.searchParams.get("x-amz-acl")).toBeNull();

    expect(target(new URL(pic.url).pathname).bucket).toBe("shop-public");
    expect(pic.key).toBe("medusa/pic.webp");
    expect(new URL(pic.url).searchParams.get("x-amz-acl")).toBeNull();
  });

  it("signs a download link in the bucket that holds the file, by its key", async () => {
    const service = provider();
    const priv = new URL(
      await service.getPresignedDownloadUrl({ fileKey: "private/export-01.csv" }),
    );
    const pub = new URL(await service.getPresignedDownloadUrl({ fileKey: "medusa/shirt-01.png" }));

    expect(priv.origin).toBe(endpoint);
    expect(target(priv.pathname)).toEqual({ bucket: "shop-private", key: "private/export-01.csv" });
    expect(priv.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(Number(priv.searchParams.get("X-Amz-Expires"))).toBe(3600);
    expect(target(pub.pathname)).toEqual({ bucket: "shop-public", key: "medusa/shirt-01.png" });
    // Signing makes no request.
    expect(received).toHaveLength(0);
  });

  it("reads a private file from the private bucket", async () => {
    const buffer = await provider().getAsBuffer({ fileKey: "private/export-01.csv" });

    expect(buffer.toString()).toBe("a,b\n1,2");
    expect(received.map((r) => [r.method, r.path.split("?")[0]])).toEqual([
      ["GET", "/shop-private/private/export-01.csv"],
    ]);
  });

  it("deletes each file in its own bucket", async () => {
    await provider().delete([
      { fileKey: "private/export-01.csv" },
      { fileKey: "medusa/shirt-01.png" },
      { fileKey: "private/import-02.csv" },
    ]);

    const byBucket = Object.fromEntries(
      received.map((r) => [
        target(r.path).bucket,
        [...r.body.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]),
      ]),
    );
    expect(byBucket).toEqual({
      "shop-private": ["private/export-01.csv", "private/import-02.csv"],
      "shop-public": ["medusa/shirt-01.png"],
    });
    expect(received.every((r) => r.method === "POST" && r.path.includes("?delete"))).toBe(true);
  });

  it("routes by the key's start: only private/ is private", () => {
    expect(isPrivateKey("private/a.csv")).toBe(true);
    expect(isPrivateKey(`${PUBLIC_PREFIX}private/a.png`)).toBe(false);
    expect(isPrivateKey("privateer.png")).toBe(false);
  });

  it("keeps a public file named private/… in the public bucket", async () => {
    const result = await provider().upload({
      filename: "private/look.png",
      mimeType: "image/png",
      content: png,
      access: "public",
    });

    expect(target(received[0]!.path).bucket).toBe("shop-public");
    expect(result.key).toMatch(/^medusa\/private\/look-[0-9A-Z]{26}\.png$/);
    expect(isPrivateKey(result.key)).toBe(false);
  });

  it("refuses a missing key and one bucket for both", () => {
    expect(
      () =>
        new R2FileProviderService(
          { logger: logger as never },
          { ...options(), private_bucket: " " },
        ),
    ).toThrow(/private_bucket/);
    expect(
      () =>
        new R2FileProviderService(
          { logger: logger as never },
          { ...options(), private_bucket: "shop-public" },
        ),
    ).toThrow(/another bucket/);
  });
});
