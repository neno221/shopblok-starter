// S3 PROTOTYPE. A fresh throwaway database (migrated), ready for `server.sh start <suffix>`.
//   node spike/s3/fresh.ts <suffix> [four]
// The migration for each config is generated once into $S3_RUN_DIR/migrations-<full|four>_rich.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { createDb, migrateVerified, payloadCli, type S3Env } from "./lib.ts";

const [suffix, mode] = process.argv.slice(2);
if (!suffix) throw new Error("usage: fresh.ts <suffix> [four]");
const four = mode === "four";
const runDir = process.env["S3_RUN_DIR"] ?? "/tmp/s3-run";
const migrationDir = path.join(runDir, `migrations-${four ? "four" : "full"}_rich`);
const database = `payload_s3_${suffix}`;

createDb(database);
const env: S3Env = { database, locales: four ? "four" : undefined, rich: true, migrationDir };
if (!existsSync(migrationDir) || readdirSync(migrationDir).filter((f) => f.endsWith(".ts") && f !== "index.ts").length === 0) {
  mkdirSync(migrationDir, { recursive: true });
  const created = await payloadCli(["migrate:create", "initial"], env);
  if (created.code !== 0) throw new Error(`migrate:create failed: ${created.output}`);
}
const migrated = await migrateVerified(env);
if (migrated.code !== 0) throw new Error(`migrate failed: ${migrated.output}`);
console.log(`fresh ${database}: ${four ? "4" : "42"} locales, migrated in ${migrated.ms} ms (${migrated.tries} run)`);
