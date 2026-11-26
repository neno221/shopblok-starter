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
