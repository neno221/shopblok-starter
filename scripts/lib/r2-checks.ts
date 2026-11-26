// Cloudflare R2's checks (M6 T95, D127), as pure functions: what `pnpm run doctor` concludes from
// the S3_* keys and from R2's answers. The requests (signed with `s3.ts`) are in `doctor.ts`; no key
// is ever printed.
import { isSet, type AppEnvs, type AppName } from "@shopblok/integrations";
import { describeUnreachable, type HttpResult } from "./http.ts";
import type { Check } from "./report.ts";
import { ADMIN_UPLOAD_RULE, IMPORT_UPLOAD_RULE, allowsUploadFrom, parseCorsRules } from "./s3.ts";

const R2_KEYS_CHECK = { id: "r2-keys", title: "R2 buckets and URLs" } as const;
const R2_BUCKET = { id: "r2-bucket", title: "R2 bucket answers" } as const;
const R2_CORS = {
  public: {
    id: "r2-cors",
    title: "R2 CORS rule for Payload's admin uploads",
    upload: ADMIN_UPLOAD_RULE,
    what: "Payload's direct uploads",
  },
  private: {
    id: "r2-cors-private",
    title: "R2 CORS rule for Medusa Admin's product import",
    upload: IMPORT_UPLOAD_RULE,
    what: "Medusa Admin's product import",
  },
} as const;
const R2_PRIVATE = {
  id: "r2-private",
  title: "R2 private files refused without a signature",
} as const;

/** Medusa's private files' keys start here (`apps/backend/src/modules/r2-file/service.ts`). */
export const PRIVATE_PREFIX = "private/";

/** What each app's R2 part is, for the checks' titles. */
export type R2Bucket = {
  apps: AppName[];
  bucket: string;
  /** `public`: pictures, served from `S3_PUBLIC_URL`; `private`: Medusa's CSV files. */
  role: "public" | "private";
};

/** What an app needs before doctor can sign a request to its bucket. */
const SIGNED_KEYS = ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET"];

const value = (env: Readonly<Record<string, string | undefined>>, key: string) =>
  env[key]?.trim() ?? "";

const appsLabel = (apps: readonly AppName[]) => apps.map((app) => `apps/${app}`).join(" and ");

/**
 * The buckets doctor asks about: the public one (once if both apps name the same) and the
 * backend's private one, only for an app whose R2 keys are all set.
 */
export function r2Buckets(envs: AppEnvs): R2Bucket[] {
  const buckets: R2Bucket[] = [];
  for (const app of ["backend", "storefront"] as const) {
    const env = envs[app];
    if (!SIGNED_KEYS.every((key) => isSet(env, key))) continue;
    const bucket = value(env, "S3_BUCKET");
    const same = buckets.find((each) => each.role === "public" && each.bucket === bucket);
    if (same) same.apps.push(app);
    else buckets.push({ apps: [app], bucket, role: "public" });
  }
  if (
    isSet(envs.backend, "S3_PRIVATE_BUCKET") &&
    SIGNED_KEYS.every((key) => isSet(envs.backend, key))
  )
    buckets.push({
      apps: ["backend"],
      bucket: value(envs.backend, "S3_PRIVATE_BUCKET"),
      role: "private",
    });
  return buckets;
}

/**
 * From the environment alone: the private bucket is not a public one (an error: R2 makes a whole
 * bucket public, so customers' exports would be served to anyone with a key), `S3_ENDPOINT` and
 * `S3_PUBLIC_URL` are URLs, and `S3_PUBLIC_URL` is not the S3 API's endpoint (which serves nothing
 * without a signature, so every picture would be broken).
 */
export function r2KeyChecks(envs: AppEnvs): Check[] {
  const errors: string[] = [];
  const warnings: string[] = [];
  const privateBucket = value(envs.backend, "S3_PRIVATE_BUCKET");
  for (const app of ["backend", "storefront"] as const) {
    const env = envs[app];
    const bucket = value(env, "S3_BUCKET");
    if (privateBucket !== "" && bucket === privateBucket)
      errors.push(
        `apps/${app}: S3_BUCKET is the backend's S3_PRIVATE_BUCKET (${privateBucket}), so private and public files would share one bucket`,
      );
    for (const key of ["S3_ENDPOINT", "S3_PUBLIC_URL"]) {
      const url = value(env, key);
      if (url !== "" && !/^https?:\/\/[^/\s]+(\/\S*)?$/.test(url))
        errors.push(`apps/${app}: ${key} is not a URL such as https://media.example.com`);
    }
    const publicUrl = value(env, "S3_PUBLIC_URL");
    try {
      if (publicUrl !== "" && /\.r2\.cloudflarestorage\.com$/i.test(new URL(publicUrl).hostname))
        errors.push(
          `apps/${app}: S3_PUBLIC_URL is the S3 API's endpoint, which serves no file without a signature`,
        );
    } catch {
      // Not a URL: reported above.
    }
  }
  const [a, b] = [value(envs.backend, "S3_PUBLIC_URL"), value(envs.storefront, "S3_PUBLIC_URL")];
  const [x, y] = [value(envs.backend, "S3_BUCKET"), value(envs.storefront, "S3_BUCKET")];
  // Medusa's product pictures carry the backend's URL and are drawn through `next/image`, which
  // takes only the storefront's `S3_PUBLIC_URL` (`images.remotePatterns`, `media-host.ts`).
  if (a !== "" && b !== "" && !coveredBy(a, b))
    errors.push(
      `apps/backend: S3_PUBLIC_URL is not under the storefront's (${b}), so the shop's image optimiser refuses every product picture uploaded in Medusa Admin: use one public bucket and one S3_PUBLIC_URL in both apps`,
    );
  else if (a !== "" && a === b && x !== "" && y !== "" && x !== y)
    warnings.push(
      "the apps name one S3_PUBLIC_URL for two buckets (S3_BUCKET differs): one app's files would not be on that URL",
    );
  const checks: Check[] = [];
  if (errors.length > 0)
    checks.push({
      ...R2_KEYS_CHECK,
      level: "error",
      message: "An R2 key is set to something that cannot work.",
      details: errors,
      fix: "S3_BUCKET is the public bucket (its r2.dev URL or custom domain in S3_PUBLIC_URL), S3_PRIVATE_BUCKET a second one with no public access, S3_ENDPOINT https://<account id>.r2.cloudflarestorage.com (SPEC §10.7).",
    });
  if (warnings.length > 0)
    checks.push({ ...R2_KEYS_CHECK, id: "r2-urls", level: "warn", message: warnings[0]! });
  return checks;
}

/** True when `url` is at or under `base`: the same origin, and `base`'s path as its path's start. */
function coveredBy(url: string, base: string): boolean {
  try {
    const [inner, outer] = [new URL(url), new URL(base)];
    const prefix = outer.pathname.replace(/\/+$/, "");
    const path = inner.pathname.replace(/\/+$/, "");
    return inner.origin === outer.origin && (path === prefix || path.startsWith(`${prefix}/`));
  } catch {
    return true; // Not a URL: reported above.
  }
}

/** `--online`: R2's answer to a signed `ListObjectsV2` of one key (what an Object Read & Write token may do). */
export function r2BucketCheck(target: R2Bucket, answer: HttpResult): Check {
  const check = (c: Omit<Check, "id" | "title">): Check => ({
    id: `${R2_BUCKET.id}-${target.role}`,
    title: `${R2_BUCKET.title}: ${target.role} (${appsLabel(target.apps)})`,
    ...c,
  });
  const name = `the ${target.role} bucket ${target.bucket}`;
  if (answer.kind !== "response")
    return check({ level: "warn", message: `not checked: R2 ${describeUnreachable(answer)}.` });
  if (answer.status >= 200 && answer.status < 300)
    return check({ level: "ok", message: `R2 answers for ${name} with these keys.` });
  if (answer.status === 404)
    return check({
      level: "error",
      message: `R2 has no ${name} (HTTP 404), so every upload to it fails.`,
      fix: "Create the bucket in Cloudflare's dashboard (R2), or correct the name.",
    });
  if (answer.status === 400 || answer.status === 401 || answer.status === 403)
    return check({
      level: "error",
      message: `R2 refuses these keys for ${name} (HTTP ${answer.status}): the token is wrong, revoked, or not allowed on this bucket.`,
      fix: "Make an R2 API token with Object Read & Write on both buckets (Cloudflare → R2 → Manage API tokens) and set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY from it.",
    });
  return check({ level: "warn", message: `not checked: R2 answered HTTP ${answer.status}.` });
}

/**
 * `--online`: a bucket's CORS rules (`GET /<bucket>?cors`) let `origin` upload: on the public
 * bucket, the storefront's (Payload's admin); on the private one, the backend's (Medusa Admin's
 * product import). The apps' Object Read & Write token may not read bucket settings, so a 403 is
 * a warning that says where to look.
 */
export function r2CorsCheck(target: R2Bucket, origin: string, answer: HttpResult): Check {
  const kind = R2_CORS[target.role];
  const check = (c: Omit<Check, "id" | "title">): Check => ({
    id: kind.id,
    title: kind.title,
    ...c,
  });
  const fix =
    "Run `pnpm r2:cors` with an Admin Read & Write token in the shell (R2_ADMIN_ACCESS_KEY_ID, R2_ADMIN_SECRET_ACCESS_KEY), or paste `pnpm r2:cors --json` into the dashboard (R2 → the bucket → Settings → CORS policy).";
  if (answer.kind !== "response")
    return check({ level: "warn", message: `not checked: R2 ${describeUnreachable(answer)}.` });
  if (answer.status === 403)
    return check({
      level: "warn",
      message: `not checked: these keys may not read ${target.bucket}'s CORS rules (HTTP 403; an Object Read & Write token cannot). Check in the dashboard that ${origin} may PUT, for ${kind.what}.`,
      fix,
    });
  if (answer.status === 404)
    return check({
      level: "error",
      message: `The ${target.role} bucket ${target.bucket} has no CORS rule, so the browser refuses ${kind.what} from ${origin}.`,
      fix,
    });
  if (answer.status < 200 || answer.status >= 300)
    return check({ level: "warn", message: `not checked: R2 answered HTTP ${answer.status}.` });
  const rules = parseCorsRules(answer.text);
  if (!allowsUploadFrom(rules, origin, kind.upload))
    return check({
      level: "error",
      message: `No CORS rule of ${target.bucket} lets ${origin} upload (PUT), so the browser refuses ${kind.what}.`,
      ...(rules.length > 0
        ? {
            details: rules.map(
              (rule) =>
                `${rule.allowedMethods.join(", ")} from ${rule.allowedOrigins.join(", ") || "no origin"}`,
            ),
          }
        : {}),
      fix,
    });
  if (
    rules.some((rule) => rule.allowedMethods.includes("PUT") && rule.allowedOrigins.includes("*"))
  )
    return check({
      level: "warn",
      message: `${target.bucket}'s CORS rule lets any origin upload (*); presigned URLs still guard each upload.`,
      fix: "List the admins' origins instead (`pnpm r2:cors` writes NEXT_PUBLIC_BASE_URL's and MEDUSA_BACKEND_URL's).",
    });
  return check({ level: "ok", message: `${origin} may upload to ${target.bucket} (PUT).` });
}

/** The first key of `ListObjectsV2`'s answer, or `undefined` when the bucket lists none. */
export function firstKey(answer: HttpResult): string | undefined {
  if (answer.kind !== "response" || answer.status < 200 || answer.status >= 300) return undefined;
  const match = /<Key>([\s\S]*?)<\/Key>/.exec(answer.text);
  return match?.[1]
    ?.replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * `--online`: a private object is refused without a signature. `api` is R2's answer to an unsigned
 * `GET` of the object on the S3 API (an existing private file's key, else one that does not exist:
 * R2 refuses before it looks); `publicDomain`, when there is an existing file, the answer of
 * `S3_PUBLIC_URL/<key>`, which must not serve it.
 */
export function r2PrivateCheck(input: {
  bucket: string;
  key: string | undefined;
  api: HttpResult;
  publicDomain: HttpResult | undefined;
}): Check {
  const check = (c: Omit<Check, "id" | "title">): Check => ({ ...R2_PRIVATE, ...c });
  const what =
    input.key === undefined ? `${input.bucket} (no private file yet)` : `a file of ${input.bucket}`;
  const { api, publicDomain } = input;
  if (publicDomain?.kind === "response" && publicDomain.status >= 200 && publicDomain.status < 300)
    return check({
      level: "error",
      message: `S3_PUBLIC_URL serves ${what} without a signature (HTTP ${publicDomain.status}): customers' exports are public.`,
      fix: "Point S3_PUBLIC_URL at the public bucket's domain, and turn off public access (r2.dev and custom domains) on the private bucket.",
    });
  if (api.kind !== "response")
    return check({ level: "warn", message: `not checked: R2 ${describeUnreachable(api)}.` });
  if (api.status >= 200 && api.status < 300)
    return check({
      level: "error",
      message: `R2 serves ${what} without a signature (HTTP ${api.status}): customers' exports are public.`,
      fix: "Turn off public access on the private bucket (Cloudflare → R2 → the bucket → Settings).",
    });
  if (api.status === 404)
    return check({
      level: "warn",
      message: `R2 looked ${what} up without a signature (HTTP 404) instead of refusing the request: check that the private bucket allows no public reads.`,
    });
  if ([400, 401, 403].includes(api.status))
    return check({
      level: "ok",
      message: `R2's S3 API refuses an unsigned read of ${what} (HTTP ${api.status})${
        publicDomain?.kind === "response"
          ? `, and the file is not under S3_PUBLIC_URL (HTTP ${publicDomain.status})`
          : ""
      }.`,
      // R2's S3 API refuses every unsigned request, and S3_PUBLIC_URL is the public bucket's: neither
      // shows whether the private bucket has an r2.dev URL or a custom domain of its own.
      details: [
        `Not visible with these keys: check in the dashboard (R2 → ${input.bucket} → Settings → Public access) that it has no r2.dev URL and no custom domain.`,
      ],
    });
  return check({ level: "warn", message: `not checked: R2 answered HTTP ${api.status}.` });
}
