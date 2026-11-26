import { describe, expect, it } from "vitest";
import type { Config } from "payload";
import {
  MEDIA_PREFIX,
  mediaStorage,
  PRIVATE_PREFIXES,
  privateFileStorage,
  privateStorageSettings,
  publicFileUrl,
  SIGNED_DOWNLOAD_SECONDS,
  STORAGE_KEYS,
  storageSettings,
} from "./storage";

// Stand-ins, not keys (D115).
const R2 = {
  S3_ENDPOINT: " https://account.r2.cloudflarestorage.com ",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_BUCKET: "shopblok-dev",
  S3_PUBLIC_URL: "https://pub-abc.r2.dev/",
};

describe("storageSettings (M6 D127)", () => {
  it("turns R2 on only with every key, `auto` for a blank region", () => {
    expect(storageSettings(R2)).toEqual({
      endpoint: "https://account.r2.cloudflarestorage.com",
      region: "auto",
      accessKeyId: "id",
      secretAccessKey: "secret",
      bucket: "shopblok-dev",
      publicUrl: "https://pub-abc.r2.dev",
    });
    for (const key of STORAGE_KEYS) expect(storageSettings({ ...R2, [key]: " " })).toBeUndefined();
    expect(storageSettings({})).toBeUndefined();
  });

  it("links a file on R2's public domain under media's prefix", () => {
    expect(publicFileUrl("https://pub-abc.r2.dev", "hero-1920x1080.webp", MEDIA_PREFIX)).toBe(
      "https://pub-abc.r2.dev/media/hero-1920x1080.webp",
    );
    expect(publicFileUrl("https://pub-abc.r2.dev", "a bé.webp", "")).toBe(
      "https://pub-abc.r2.dev/a%20b%C3%A9.webp",
    );
  });
});

describe("mediaStorage", () => {
  const base = (): Config =>
    ({
      collections: [{ slug: "media", upload: { staticDir: "/tmp/media" }, fields: [] }],
    }) as unknown as Config;
  const apply = async (env: Record<string, string>) => mediaStorage(env)(base());
  const fieldNames = (config: Config) =>
    (config.collections?.[0]?.fields ?? []).map((field) => ("name" in field ? field.name : ""));

  it("gives media the same columns with and without the keys", async () => {
    const [off, on] = await Promise.all([apply({}), apply(R2)]);
    expect(fieldNames(off)).toEqual(expect.arrayContaining(["prefix", "_objectKey"]));
    expect(fieldNames(on)).toEqual(fieldNames(off));
    // The admin's import map always lists the client upload handler.
    for (const config of [off, on])
      expect(Object.keys(config.admin?.dependencies ?? {})).toContain(
        "@payloadcms/storage-s3/client#S3ClientUploadHandler",
      );
  });

  it("keeps local disk without the keys: no signed-URL endpoint, no upload handler", async () => {
    const off = await apply({});
    expect(off.endpoints ?? []).toEqual([]);
    expect(off.admin?.components?.providers ?? []).toEqual([]);
    const upload = off.collections?.[0]?.upload as { disableLocalStorage?: boolean };
    expect(upload.disableLocalStorage).toBeUndefined();
  });

  it("with the keys: R2 in place of the disk, direct uploads through a signed URL", async () => {
    const on = await apply(R2);
    const upload = on.collections?.[0]?.upload as {
      disableLocalStorage?: boolean;
      adapter?: string;
    };
    expect(upload.disableLocalStorage).toBe(true);
    expect(upload.adapter).toBe("s3");
    expect((on.endpoints ?? []).map((endpoint) => [endpoint.method, endpoint.path])).toEqual([
      ["post", "/storage-s3-generate-signed-url"],
    ]);
    expect(JSON.stringify(on.admin?.components?.providers)).toContain('"prefix":"media"');
  });
});

describe("privateFileStorage (M7 D148, 2; T111)", () => {
  const PRIVATE = { ...R2, S3_PRIVATE_BUCKET: " shopblok-dev-private " };
  const base = (): Config =>
    ({
      collections: [
        { slug: "exports", upload: { staticDir: "/tmp/exports" }, fields: [] },
        { slug: "imports", upload: { staticDir: "/tmp/imports" }, fields: [] },
        { slug: "media", upload: { staticDir: "/tmp/media" }, fields: [] },
      ],
    }) as unknown as Config;
  const apply = async (env: Record<string, string>) => privateFileStorage(env)(base());
  const collection = (config: Config, slug: string) =>
    config.collections?.find((each) => each.slug === slug);
  const fieldNames = (config: Config, slug: string) =>
    (collection(config, slug)?.fields ?? []).map((field) => ("name" in field ? field.name : ""));

  it("is on with every media key and a private bucket that is not the public one", () => {
    expect(privateStorageSettings(PRIVATE)).toMatchObject({
      bucket: "shopblok-dev",
      privateBucket: "shopblok-dev-private",
    });
    expect(privateStorageSettings(R2)).toBeUndefined();
    expect(
      privateStorageSettings({ ...PRIVATE, S3_PRIVATE_BUCKET: "shopblok-dev" }),
    ).toBeUndefined();
    expect(privateStorageSettings({ ...PRIVATE, S3_ACCESS_KEY_ID: "" })).toBeUndefined();
  });

  it("gives exports and imports the same columns with and without the keys", async () => {
    const [off, on] = await Promise.all([apply({}), apply(PRIVATE)]);
    for (const slug of ["exports", "imports"]) {
      expect(fieldNames(off, slug)).toEqual(expect.arrayContaining(["prefix"]));
      expect(fieldNames(on, slug)).toEqual(fieldNames(off, slug));
    }
    // Media is the other plugin's.
    expect(fieldNames(on, "media")).toEqual([]);
  });

  it("keeps local disk without the keys", async () => {
    const off = await apply({});
    for (const slug of ["exports", "imports"]) {
      const upload = collection(off, slug)?.upload as { disableLocalStorage?: boolean };
      expect(upload.disableLocalStorage, slug).toBeUndefined();
    }
  });

  it("with the keys: the private bucket under each prefix, signed downloads only, no browser upload", async () => {
    const on = await apply(PRIVATE);
    for (const slug of ["exports", "imports"] as const) {
      const upload = collection(on, slug)?.upload as {
        disableLocalStorage?: boolean;
        adapter?: string;
      };
      expect(upload.disableLocalStorage, slug).toBe(true);
      expect(upload.adapter, slug).toBe("s3");
      const prefix = collection(on, slug)?.fields.find(
        (field) => "name" in field && field.name === "prefix",
      ) as { defaultValue?: unknown } | undefined;
      expect(prefix?.defaultValue, slug).toBe(PRIVATE_PREFIXES[slug]);
    }
    // No signed-URL endpoint for uploads from the browser: the CSV goes through Payload's server.
    expect(on.endpoints ?? []).toEqual([]);
    expect(SIGNED_DOWNLOAD_SECONDS).toBeLessThanOrEqual(600);
  });
});
