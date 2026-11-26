// The few S3 API calls `pnpm run doctor --online` and `pnpm r2:cors` make on Cloudflare R2 (M6 T95,
// D127), with AWS Signature Version 4 from `node:crypto`, so the root scripts need no AWS SDK. Pure:
// a request comes in with the keys and the time, its signed headers go out; the CORS rules are read
// from and written to S3's XML. The requests themselves are in `doctor.ts` and `r2-cors.ts`.
import { createHash, createHmac } from "node:crypto";

export type S3Keys = {
  /** `S3_ENDPOINT`: `https://<account id>.r2.cloudflarestorage.com`. */
  endpoint: string;
  /** `S3_REGION`, `auto` (R2's only region) when blank. */
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** The SHA-256 of nothing, a body-less request's `x-amz-content-sha256`. */
const EMPTY_SHA256 = createHash("sha256").update("").digest("hex");

/** RFC 3986's unreserved characters stay; everything else is `%XX` (SigV4's `UriEncode`). */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** A path-style object or bucket URL: `<endpoint>/<bucket>[/<key>][?<query>]`, the key's segments encoded. */
export function s3Url(
  endpoint: string,
  bucket: string,
  key = "",
  query: Readonly<Record<string, string>> = {},
): string {
  const path = [bucket, ...(key === "" ? [] : key.split("/"))].map(uriEncode).join("/");
  const search = Object.entries(query)
    .map(([name, value]) =>
      value === "" ? uriEncode(name) : `${uriEncode(name)}=${uriEncode(value)}`,
    )
    .join("&");
  return `${endpoint.replace(/\/+$/, "")}/${path}${search === "" ? "" : `?${search}`}`;
}

const hmac = (key: Buffer | string, data: string) =>
  createHmac("sha256", key).update(data).digest();
const sha256Hex = (data: string) => createHash("sha256").update(data).digest("hex");

/** `20130524T000000Z`. */
export const amzDate = (now: Date) => now.toISOString().replace(/[:-]|\.\d{3}/g, "");

/**
 * The headers that sign one request with SigV4 for the `s3` service (an `Authorization` header,
 * not a presigned URL). `headers` are the request's own (a `content-md5`, a `range`), signed too.
 * S3 encodes the path once (no double encoding) and signs the payload's hash.
 */
export function signS3(input: {
  method: string;
  url: string;
  keys: S3Keys;
  now: Date;
  headers?: Readonly<Record<string, string>>;
  body?: string;
}): Record<string, string> {
  const url = new URL(input.url);
  const stamp = amzDate(input.now);
  const day = stamp.slice(0, 8);
  const region = input.keys.region.trim() || "auto";
  const payloadHash = input.body === undefined ? EMPTY_SHA256 : sha256Hex(input.body);
  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(input.headers ?? {}).map(([name, value]) => [
        name.toLowerCase(),
        value.trim(),
      ]),
    ),
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": stamp,
  };
  const names = Object.keys(headers).sort();
  // `URL` keeps the path as it was given (already encoded by `s3Url`); its query is re-encoded and sorted.
  const query = [...url.searchParams.entries()]
    .map(([name, value]) => [uriEncode(name), uriEncode(value)] as const)
    .sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : 1) : a < b ? -1 : 1))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const canonical = [
    input.method.toUpperCase(),
    url.pathname,
    query,
    names.map((name) => `${name}:${headers[name]}\n`).join(""),
    names.join(";"),
    payloadHash,
  ].join("\n");
  const scope = `${day}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonical)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.keys.secretAccessKey}`, day), region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(toSign).digest("hex");
  const { host: _host, ...rest } = headers;
  return {
    ...rest,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.keys.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  };
}

// ---------------------------------------------------------------------------------------------
// The bucket's CORS rules (`GET` and `PUT /<bucket>?cors`)

export type CorsRule = {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposeHeaders: string[];
  maxAgeSeconds?: number;
};

const unescapeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const all = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) =>
    unescapeXml(m[1]!.trim()),
  );

/** The rules of `GetBucketCors`' answer, in order. An answer with none (or no XML) has none. */
export function parseCorsRules(xml: string): CorsRule[] {
  return all(xml, "CORSRule").map((rule) => {
    const age = all(rule, "MaxAgeSeconds")[0];
    return {
      allowedOrigins: all(rule, "AllowedOrigin"),
      allowedMethods: all(rule, "AllowedMethod").map((method) => method.toUpperCase()),
      allowedHeaders: all(rule, "AllowedHeader"),
      exposeHeaders: all(rule, "ExposeHeader"),
      ...(age === undefined || !/^\d+$/.test(age) ? {} : { maxAgeSeconds: Number(age) }),
    };
  });
}

/** `PutBucketCors`' body for these rules. */
export function corsXml(rules: readonly CorsRule[]): string {
  const tags = (tag: string, values: readonly string[]) =>
    values.map((value) => `<${tag}>${escapeXml(value)}</${tag}>`).join("");
  const body = rules
    .map(
      (rule) =>
        `<CORSRule>${tags("AllowedOrigin", rule.allowedOrigins)}${tags("AllowedMethod", rule.allowedMethods)}${tags("AllowedHeader", rule.allowedHeaders)}${tags("ExposeHeader", rule.exposeHeaders)}${rule.maxAgeSeconds === undefined ? "" : `<MaxAgeSeconds>${rule.maxAgeSeconds}</MaxAgeSeconds>`}</CORSRule>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">${body}</CORSConfiguration>`;
}

/** `Content-MD5` of a body (S3 asks for it on `PutBucketCors`). */
export const contentMd5 = (body: string) => createHash("md5").update(body).digest("base64");

/** A rule `pnpm r2:cors` writes, without its origins: what one kind of browser upload needs. */
export type UploadRule = Omit<CorsRule, "allowedOrigins"> & {
  /** The request headers the browser sends with the upload, which the rule must allow. */
  sends: readonly string[];
};

/**
 * Payload's admin on the public bucket (`clientUploads`, SPEC §10.7): the browser `PUT`s each file
 * to a presigned URL with its type and `If-None-Match`, and reads `ETag` back. `GET` and `HEAD` let
 * the admin fetch a picture it shows (the focal point, the crop).
 */
export const ADMIN_UPLOAD_RULE: UploadRule = {
  allowedMethods: ["GET", "HEAD", "PUT"],
  allowedHeaders: ["*"],
  exposeHeaders: ["ETag"],
  maxAgeSeconds: 3600,
  sends: ["content-type", "if-none-match"],
};

/**
 * Medusa Admin's product import on the private bucket: `@medusajs/js-sdk`'s `createImport` asks
 * `/admin/uploads/presigned-urls` for a URL (private by default) and `PUT`s the CSV to it from Medusa
 * Admin's page, with the file's type. Nothing else from a browser.
 */
export const IMPORT_UPLOAD_RULE: UploadRule = {
  allowedMethods: ["PUT"],
  allowedHeaders: ["content-type"],
  exposeHeaders: [],
  maxAgeSeconds: 3600,
  sends: ["content-type"],
};

const ruleOf = ({ sends: _sends, ...rule }: UploadRule): Omit<CorsRule, "allowedOrigins"> => rule;

/** The rule `pnpm r2:cors` keeps: the one that allows `PUT` (others, a font's `GET` rule, are left as they are). */
const isUploadRule = (rule: CorsRule) => rule.allowedMethods.includes("PUT");

/** True when a rule lets `origin` upload: `PUT` from it (or `*`) with any header or the ones the upload sends. */
export function allowsUploadFrom(
  rules: readonly CorsRule[],
  origin: string,
  upload: UploadRule = ADMIN_UPLOAD_RULE,
): boolean {
  return rules.some(
    (rule) =>
      isUploadRule(rule) &&
      (rule.allowedOrigins.includes(origin) || rule.allowedOrigins.includes("*")) &&
      (rule.allowedHeaders.includes("*") ||
        upload.sends.every((header) =>
          rule.allowedHeaders.map((each) => each.toLowerCase()).includes(header),
        )),
  );
}

/**
 * The rules with the uploading origins added (idempotent): one upload rule, holding every origin
 * it held before and `origins`, with `upload`'s methods and headers; the other rules kept.
 * `changed` is false when the bucket already has exactly this, so nothing needs writing.
 */
export function withAdminOrigins(
  rules: readonly CorsRule[],
  origins: readonly string[],
  upload: UploadRule = ADMIN_UPLOAD_RULE,
): { rules: CorsRule[]; changed: boolean; origins: string[] } {
  const existing = rules.filter(isUploadRule);
  const others = rules.filter((rule) => !isUploadRule(rule));
  const merged = [...new Set([...existing.flatMap((rule) => rule.allowedOrigins), ...origins])];
  const next: CorsRule = { allowedOrigins: merged, ...ruleOf(upload) };
  const same = existing.length === 1 && JSON.stringify(existing[0]) === JSON.stringify(next);
  return { rules: [...others, next], changed: !same, origins: merged };
}

/** The rules as Cloudflare's dashboard takes them (R2 → the bucket → Settings → CORS policy). */
export function corsDashboardJson(rules: readonly CorsRule[]): string {
  return JSON.stringify(
    rules.map((rule) => ({
      AllowedOrigins: rule.allowedOrigins,
      AllowedMethods: rule.allowedMethods,
      ...(rule.allowedHeaders.length > 0 ? { AllowedHeaders: rule.allowedHeaders } : {}),
      ...(rule.exposeHeaders.length > 0 ? { ExposeHeaders: rule.exposeHeaders } : {}),
      ...(rule.maxAgeSeconds === undefined ? {} : { MaxAgeSeconds: rule.maxAgeSeconds }),
    })),
    null,
    2,
  );
}

/** `pnpm r2:cors`'s arguments: the `--origin` values (as origins), `--dry-run` and `--json`, or what is wrong. */
export function parseCorsArgs(
  args: readonly string[],
): { origins: string[]; dryRun: boolean; json: boolean } | string {
  const origins: string[] = [];
  let dryRun = false;
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--json") json = true;
    else if (arg === "--origin" || arg.startsWith("--origin=")) {
      const value = arg === "--origin" ? args[++i] : arg.slice("--origin=".length);
      try {
        origins.push(new URL(value ?? "").origin);
      } catch {
        return `--origin needs a URL such as https://shop.example (got ${JSON.stringify(value ?? "")})`;
      }
    } else return `unknown argument ${arg}`;
  }
  return { origins, dryRun, json };
}
