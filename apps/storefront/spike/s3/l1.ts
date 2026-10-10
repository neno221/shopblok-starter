// S3 PROTOTYPE. L1: `payload migrate:create` with the full list, then `payload migrate` on an empty
// database; the same for the 4-locale config, and for both with the many-localized-fields collection.
//   node spike/s3/l1.ts <scratch-dir>
import { mkdirSync, readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { createDb, migrateVerified, payloadCli, psql, type S3Env } from "./lib.ts";

const scratch = process.argv[2];
if (!scratch) throw new Error("usage: l1.ts <scratch-dir>");

type Variant = { name: string; locales?: "four"; rich: boolean };
const variants: Variant[] = [
  { name: "full", rich: false },
  { name: "four", locales: "four", rich: false },
  { name: "full_rich", rich: true },
  { name: "four_rich", locales: "four", rich: true },
];

const rows: Record<string, unknown>[] = [];
for (const v of variants) {
  const database = `payload_s3_l1_${v.name}`;
  const migrationDir = path.join(scratch, `migrations-${v.name}`);
  mkdirSync(migrationDir, { recursive: true });
  createDb(database);
  const env: S3Env = { database, locales: v.locales, rich: v.rich, migrationDir };

  const created = await payloadCli(["migrate:create", "initial"], env);
  const files = readdirSync(migrationDir).filter((f) => f !== "index.ts");
  const ts = files.find((f) => f.endsWith(".ts"));
  const json = files.find((f) => f.endsWith(".json"));
  if (created.code !== 0 || !ts || !json) {
    console.error(created.output);
    throw new Error(`${v.name}: migrate:create failed (exit ${created.code}, files ${files.join(",")})`);
  }
  const migrated = await migrateVerified(env);
  const enumCount = (name: string) =>
    psql(database, `select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='${name}'`);
  const sql = readFileSync(path.join(migrationDir, ts), "utf8");
  rows.push({
    variant: v.name,
    migrateCreateMs: created.ms,
    migrationBytes: statSync(path.join(migrationDir, ts)).size,
    snapshotBytes: statSync(path.join(migrationDir, json)).size,
    migrateExit: migrated.code,
    migrateTotalMs: migrated.ms,
    migrateRuns: migrated.tries,
    migrationRunMs: /Migrated:\s+\S+\s+\((\d+)ms\)/.exec(migrated.output)?.[1],
    tables: psql(database, "select count(*) from information_schema.tables where table_schema='public'"),
    localesEnumValues: enumCount("_locales"),
    enumsWithCodes: psql(
      database,
      "select string_agg(t.typname||'='||c, ', ' order by t.typname) from (select t.typname, count(*) c from pg_enum e join pg_type t on t.oid=e.enumtypid group by t.typname having count(*) in (4,42)) x join pg_type t on t.typname=x.typname",
    ),
    alterTypeStatements: (sql.match(/CREATE TYPE/g) ?? []).length,
  });
  console.log(JSON.stringify(rows.at(-1)));
}
console.table(rows);
