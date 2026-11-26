import { s3Storage } from "@payloadcms/storage-s3";
import type { Plugin } from "payload";

// Payload's media on Cloudflare R2 (M6 D127, T95; SPEC §10.7), by env: with every `S3_*` key of the
// integration's storefront part (`@shopblok/integrations`), `media`'s files go to `S3_BUCKET` over
// R2's S3 API and are linked from `S3_PUBLIC_URL`; without them Payload keeps its local `staticDir`
// (development only: Vercel's disk is read-only). Pure: the env comes in, so a test can feed both.

export type StorageEnv = Readonly<Record<string, string | undefined>>;

/** The keys that turn R2 on for Payload (`S3_REGION` is optional: `auto`, R2's only region). */
export const STORAGE_KEYS = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "S3_PUBLIC_URL",
] as const;

/** Where `media`'s objects start in the bucket (Medusa's public files start with `medusa/`). */
export const MEDIA_PREFIX = "media";

/**
 * Where the CSV exports' and imports' objects start in the private bucket (M7 D148, 2; T111).
 * Medusa's private files start with `private/`, so the two apps may share the bucket.
 */
export const PRIVATE_PREFIXES = { exports: "payload-exports", imports: "payload-imports" } as const;

/** How long a signed download link of an export or an import lives (seconds). */
export const SIGNED_DOWNLOAD_SECONDS = 300;

const value = (env: StorageEnv, key: string): string => env[key]?.trim() ?? "";

/** R2's settings when every key is set, else `undefined` (local disk). */
export function storageSettings(env: StorageEnv):
  | {
      endpoint: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      publicUrl: string;
    }
  | undefined {
  if (STORAGE_KEYS.some((key) => value(env, key) === "")) return undefined;
  return {
    endpoint: value(env, "S3_ENDPOINT"),
    region: value(env, "S3_REGION") || "auto",
    accessKeyId: value(env, "S3_ACCESS_KEY_ID"),
    secretAccessKey: value(env, "S3_SECRET_ACCESS_KEY"),
    bucket: value(env, "S3_BUCKET"),
    publicUrl: value(env, "S3_PUBLIC_URL").replace(/\/+$/, ""),
  };
}

/** A file's public URL: `S3_PUBLIC_URL/<prefix>/<filename>`, each segment encoded. */
export function publicFileUrl(publicUrl: string, filename: string, prefix?: string): string {
  const key = [prefix, filename].filter((part): part is string => Boolean(part)).join("/");
  return `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The storage plugin, always in the config so the admin's import map and `media`'s columns are the
 * same with and without the keys (`alwaysInsertFields`: the plugin's `prefix` and `_objectKey`
 * fields; the import map always lists the client upload handler):
 *
 * - `clientUploads`: the admin's browser `PUT`s each file straight to R2 through a presigned URL
 *   (so Vercel's 4.5 MB body cap does not apply), and Payload then reads it back from R2 to make the
 *   image sizes. The bucket's CORS rule must let the admin's origin do that: `pnpm r2:cors`.
 * - `disablePayloadAccessControl` and `generateFileURL`: a file's URL (and each size's) is on R2's
 *   public domain, not `/api/media/file/…`, so pictures never pass through the shop's server. Every
 *   media file is public (`media`'s `read` access is open), which this matches.
 * - No ACL: R2 sets access per bucket and takes no `x-amz-acl`. Path-style requests, as R2 wants.
 */
export function mediaStorage(env: StorageEnv): Plugin {
  const settings = storageSettings(env);
  return s3Storage({
    enabled: settings !== undefined,
    alwaysInsertFields: true,
    clientUploads: true,
    bucket: settings?.bucket ?? "",
    collections: {
      media: {
        prefix: MEDIA_PREFIX,
        disablePayloadAccessControl: true,
        generateFileURL: ({ filename, prefix }) =>
          publicFileUrl(settings?.publicUrl ?? "", filename, prefix),
      },
    },
    config: {
      endpoint: settings?.endpoint,
      region: settings?.region ?? "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: settings?.accessKeyId ?? "",
        secretAccessKey: settings?.secretAccessKey ?? "",
      },
    },
  });
}

/**
 * R2's private bucket for Payload's CSV files (M7 D148, 2; T111): every media key and
 * `S3_PRIVATE_BUCKET`, a bucket other than `S3_BUCKET` (the public one serves every object to
 * anyone, so the same name keeps the files on local disk, and `doctor` says why). `undefined`
 * otherwise.
 */
export function privateStorageSettings(
  env: StorageEnv,
): (NonNullable<ReturnType<typeof storageSettings>> & { privateBucket: string }) | undefined {
  const settings = storageSettings(env);
  const privateBucket = value(env, "S3_PRIVATE_BUCKET");
  if (settings === undefined || privateBucket === "" || privateBucket === settings.bucket)
    return undefined;
  return { ...settings, privateBucket };
}

/**
 * The import-export plugin's own collections, `exports` and `imports` (D77), on R2's private bucket
 * (M7 D148, 2), under `payload-exports/` and `payload-imports/`. Vercel's disk is read-only, so
 * on a deployment they need it (`doctor` errors without the keys); without them they keep their
 * local `staticDir` (`import-export.ts`), as before.
 *
 * - Downloads only through a signed link: `/api/exports/file/<name>` (the admin's download link)
 *   checks Payload's `read` access (admins only, `adminOnly`), then answers 302 to a presigned URL
 *   that lives `SIGNED_DOWNLOAD_SECONDS`; the file is never public and never streamed by the shop.
 * - No `clientUploads`: an import's CSV goes to Payload's server, which reads it in the same request
 *   (the plugin takes `req.file` first, for cloud storage), so the bucket needs no CORS rule.
 * - `alwaysInsertFields`: their `prefix` column exists with or without the keys, as `media`'s does.
 */
export function privateFileStorage(env: StorageEnv): Plugin {
  const settings = privateStorageSettings(env);
  const collection = (prefix: string) => ({
    prefix,
    signedDownloads: { expiresIn: SIGNED_DOWNLOAD_SECONDS },
  });
  return s3Storage({
    enabled: settings !== undefined,
    alwaysInsertFields: true,
    bucket: settings?.privateBucket ?? "",
    // Its own client: the media plugin's is keyed by the public bucket's name.
    clientCacheKey: "s3:payload-private",
    collections: {
      exports: collection(PRIVATE_PREFIXES.exports),
      imports: collection(PRIVATE_PREFIXES.imports),
    },
    config: {
      endpoint: settings?.endpoint,
      region: settings?.region ?? "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: settings?.accessKeyId ?? "",
        secretAccessKey: settings?.secretAccessKey ?? "",
      },
    },
  });
}
