// `pnpm r2:cors [--origin <url>]… [--dry-run] [--json]` (M6 T95, D127): sets the two R2 buckets'
// CORS rules, which the browser's direct uploads need.
// - The public bucket (`S3_BUCKET`): Payload's admin `PUT`s each file to a presigned URL
//   (`clientUploads`, SPEC §10.7). The admin runs on the storefront's origin (`NEXT_PUBLIC_BASE_URL`),
//   so that origin goes in, with any `--origin` given (a second machine that shares a dev bucket).
// - The private bucket (`S3_PRIVATE_BUCKET`): Medusa Admin's product import `PUT`s the CSV to a
//   presigned URL from Medusa Admin's page, so the backend's origin (`MEDUSA_BACKEND_URL`) goes in.
// Idempotent: the rule that allows `PUT` keeps the origins it had and gains the new ones, every other
// rule is kept, and nothing is written when a bucket already has exactly that.
//
// R2's Object Read & Write token, the apps' `S3_ACCESS_KEY_ID`, cannot read or change a bucket's
// settings, CORS among them; that takes an Admin Read & Write token. So the script signs with
// `R2_ADMIN_ACCESS_KEY_ID` and `R2_ADMIN_SECRET_ACCESS_KEY` from the shell only (never an .env file,
// CI or the cloud environment), once per new origin. `--json` needs no token: it prints each
// bucket's rule for Cloudflare's dashboard instead. Bucket names, the endpoint and the origins come
// from the shell or the apps' .env files. Prints no key.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { envValue } from "./lib/env-file.ts";
import { request, type HttpResult } from "./lib/http.ts";
import { redact } from "./lib/output.ts";
import {
  ADMIN_UPLOAD_RULE,
  IMPORT_UPLOAD_RULE,
  contentMd5,
  corsDashboardJson,
  corsXml,
  parseCorsArgs,
  parseCorsRules,
  s3Url,
  signS3,
  withAdminOrigins,
  type S3Keys,
  type UploadRule,
} from "./lib/s3.ts";

const root = path.resolve(import.meta.dirname, "..");
const readText = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");
const appEnv = (app: "backend" | "storefront") => {
  const text = readText(path.join(root, "apps", app, ".env"));
  return (key: string) => envValue(process.env, text, key)?.trim() ?? "";
};
const storefront = appEnv("storefront");
const backend = appEnv("backend");

const USAGE = "pnpm r2:cors [--origin <url>]… [--dry-run] [--json]";
const ADMIN_KEYS = ["R2_ADMIN_ACCESS_KEY_ID", "R2_ADMIN_SECRET_ACCESS_KEY"];

const describe = (answer: HttpResult) =>
  answer.kind === "response"
    ? `HTTP ${answer.status}`
    : answer.kind === "refused"
      ? "not running"
      : answer.reason;

const originOf = (value: string, fallback: string): string | undefined => {
  try {
    return new URL(value || fallback).origin;
  } catch {
    return undefined;
  }
};

type Target = {
  bucket: string;
  name: string;
  origins: string[];
  upload: UploadRule;
  purpose: string;
};

async function applyRule(keys: S3Keys, target: Target, dryRun: boolean): Promise<boolean> {
  const url = s3Url(keys.endpoint, target.bucket, "", { cors: "" });
  const current = await request(url, {
    headers: signS3({ method: "GET", url, keys, now: new Date() }),
    timeoutMs: 15_000,
  });
  // 404 (`NoSuchCORSConfiguration`) is a bucket with no rule yet.
  if (current.kind !== "response" || (current.status !== 200 && current.status !== 404)) {
    const hint =
      current.kind === "response" && current.status === 403
        ? " (the token needs Admin Read & Write: an Object Read & Write token cannot read bucket settings)"
        : "";
    console.error(
      `The CORS rules of ${target.bucket} could not be read: ${describe(current)}${hint}.`,
    );
    return false;
  }
  const before = current.status === 404 ? [] : parseCorsRules(current.text);
  const plan = withAdminOrigins(before, target.origins, target.upload);
  console.log(
    `R2 bucket ${target.bucket}: ${target.purpose} (PUT) allowed from ${plan.origins.join(", ")}.`,
  );
  if (!plan.changed) {
    console.log("  unchanged: the bucket already has this rule.");
    return true;
  }
  if (dryRun) {
    console.log("  would write the rule (dry run).");
    return true;
  }
  const body = corsXml(plan.rules);
  const headers = { "content-md5": contentMd5(body), "content-type": "application/xml" };
  const written = await request(url, {
    method: "PUT",
    headers: signS3({ method: "PUT", url, keys, now: new Date(), headers, body }),
    text: body,
    timeoutMs: 15_000,
  });
  if (written.kind !== "response" || written.status < 200 || written.status >= 300) {
    console.error(`  FAILED to write the rule: ${describe(written)}.`);
    return false;
  }
  console.log(`  written (${plan.rules.length} rule${plan.rules.length === 1 ? "" : "s"}).`);
  return true;
}

async function main(): Promise<number> {
  const parsed = parseCorsArgs(process.argv.slice(2));
  if (typeof parsed === "string") {
    console.error(`${parsed}\n${USAGE}`);
    return 2;
  }
  const site = originOf(storefront("NEXT_PUBLIC_BASE_URL"), "http://localhost:8000");
  const medusa = originOf(backend("MEDUSA_BACKEND_URL"), "http://localhost:9000");
  if (site === undefined || medusa === undefined) {
    console.error(
      "NEXT_PUBLIC_BASE_URL (apps/storefront) or MEDUSA_BACKEND_URL (apps/backend) is not a URL (https://shop.example).",
    );
    return 1;
  }
  const publicBucket = storefront("S3_BUCKET") || backend("S3_BUCKET");
  const privateBucket = backend("S3_PRIVATE_BUCKET");
  const targets: Target[] = [
    {
      bucket: publicBucket,
      name: "S3_BUCKET",
      origins: [site, ...parsed.origins],
      upload: ADMIN_UPLOAD_RULE,
      purpose: "Payload's admin uploads",
    },
    {
      bucket: privateBucket,
      name: "S3_PRIVATE_BUCKET",
      origins: [medusa],
      upload: IMPORT_UPLOAD_RULE,
      purpose: "Medusa Admin's product import",
    },
  ];

  if (parsed.json) {
    for (const target of targets) {
      const { rules } = withAdminOrigins([], target.origins, target.upload);
      console.log(
        `${target.bucket || target.name} (${target.purpose}), R2 → the bucket → Settings → CORS policy:`,
      );
      console.log(corsDashboardJson(rules));
    }
    return 0;
  }

  const missing = [
    ...(storefront("S3_ENDPOINT") || backend("S3_ENDPOINT") ? [] : ["S3_ENDPOINT"]),
    ...(publicBucket ? [] : ["S3_BUCKET"]),
    ...(privateBucket ? [] : ["S3_PRIVATE_BUCKET"]),
  ];
  if (missing.length > 0) {
    console.error(
      `${missing.join(", ")} not set (the apps' .env files or the shell): no bucket to set the rule on.`,
    );
    return 1;
  }
  // The admin token only from the shell: it can change every bucket's settings in the account.
  const absent = ADMIN_KEYS.filter((key) => (process.env[key]?.trim() ?? "") === "");
  if (absent.length > 0) {
    console.error(
      `${absent.join(", ")} not set in the shell. Changing a bucket's CORS rules needs an R2 token with Admin Read & Write (Cloudflare → R2 → Manage API tokens); the apps' Object Read & Write token cannot. Set it for this one command only, never in an .env file, CI or the cloud environment, or paste \`pnpm r2:cors --json\` into the dashboard.`,
    );
    return 1;
  }
  const keys: S3Keys = {
    endpoint: (storefront("S3_ENDPOINT") || backend("S3_ENDPOINT")).replace(/\/+$/, ""),
    region: storefront("S3_REGION") || backend("S3_REGION") || "auto",
    accessKeyId: process.env.R2_ADMIN_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_ADMIN_SECRET_ACCESS_KEY!.trim(),
  };
  let ok = true;
  for (const target of targets) ok = (await applyRule(keys, target, parsed.dryRun)) && ok;
  return ok ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`r2-cors failed unexpectedly:\n${redact(message)}`);
  process.exitCode = 1;
}
