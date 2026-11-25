// `pnpm r2:cors [--origin <url>]… [--dry-run]` (M6 T95, D127): sets the public R2 bucket's CORS
// rule so Payload's admin can upload straight to R2 (`clientUploads`: the browser PUTs each file to
// a presigned URL, SPEC §10.7). The admin runs on the storefront's origin (`NEXT_PUBLIC_BASE_URL`),
// so that origin goes in, with any `--origin` given (a second machine that shares a dev bucket).
// Idempotent: the rule that allows `PUT` keeps the origins it had and gains the new ones, every other
// rule is kept, and nothing is written when the bucket already has exactly that. Reads the S3_* keys
// and `NEXT_PUBLIC_BASE_URL` from the shell or `apps/storefront/.env`; prints no key.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { envValue } from "./lib/env-file.ts";
import { request, type HttpResult } from "./lib/http.ts";
import { redact } from "./lib/output.ts";
import {
  contentMd5,
  corsXml,
  parseCorsArgs,
  parseCorsRules,
  s3Url,
  signS3,
  withAdminOrigins,
  type S3Keys,
} from "./lib/s3.ts";

const root = path.resolve(import.meta.dirname, "..");
const readText = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");
const storefrontText = readText(path.join(root, "apps", "storefront", ".env"));
const storefront = (key: string) => envValue(process.env, storefrontText, key)?.trim() ?? "";

const USAGE = "pnpm r2:cors [--origin <url>]… [--dry-run]";

const describe = (answer: HttpResult) =>
  answer.kind === "response"
    ? `HTTP ${answer.status}`
    : answer.kind === "refused"
      ? "not running"
      : answer.reason;

async function main(): Promise<number> {
  const parsed = parseCorsArgs(process.argv.slice(2));
  if (typeof parsed === "string") {
    console.error(`${parsed}\n${USAGE}`);
    return 2;
  }
  const missing = ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET"].filter(
    (key) => storefront(key) === "",
  );
  if (missing.length > 0) {
    console.error(
      `${missing.join(", ")} not set (apps/storefront/.env or the shell): no bucket to set the rule on.`,
    );
    return 1;
  }
  const keys: S3Keys = {
    endpoint: storefront("S3_ENDPOINT").replace(/\/+$/, ""),
    region: storefront("S3_REGION") || "auto",
    accessKeyId: storefront("S3_ACCESS_KEY_ID"),
    secretAccessKey: storefront("S3_SECRET_ACCESS_KEY"),
  };
  const bucket = storefront("S3_BUCKET");
  let site: string;
  try {
    site = new URL(storefront("NEXT_PUBLIC_BASE_URL") || "http://localhost:8000").origin;
  } catch {
    console.error("NEXT_PUBLIC_BASE_URL is not a URL (https://shop.example).");
    return 1;
  }
  const url = s3Url(keys.endpoint, bucket, "", { cors: "" });

  const current = await request(url, {
    headers: signS3({ method: "GET", url, keys, now: new Date() }),
    timeoutMs: 15_000,
  });
  // 404 (`NoSuchCORSConfiguration`) is a bucket with no rule yet.
  if (current.kind !== "response" || (current.status !== 200 && current.status !== 404)) {
    console.error(`The CORS rules of ${bucket} could not be read: ${describe(current)}.`);
    return 1;
  }
  const before = current.status === 404 ? [] : parseCorsRules(current.text);
  const plan = withAdminOrigins(before, [site, ...parsed.origins]);
  console.log(`R2 bucket ${bucket}: uploads (PUT) allowed from ${plan.origins.join(", ")}.`);
  if (!plan.changed) {
    console.log("  unchanged: the bucket already has this rule.");
    return 0;
  }
  if (parsed.dryRun) {
    console.log("  would write the rule (dry run).");
    return 0;
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
    return 1;
  }
  console.log(`  written (${plan.rules.length} rule${plan.rules.length === 1 ? "" : "s"}).`);
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`r2-cors failed unexpectedly:\n${redact(message)}`);
  process.exitCode = 1;
}
