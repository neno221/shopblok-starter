// S3 PROTOTYPE (not for main). Throwaway databases in the compose Postgres, and a Payload CLI runner
// that does not believe a silent exit (SETUP.md, T14 item 4: `payload migrate` and `payload run`
// exit 0 without doing anything in about 1 run in 20). It checks the database afterwards.
//
// Safety: every database here is called `payload_s3_<something>`; the helpers refuse any other name
// and never touch `payload`.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { runPayload, type RunResult } from "../../../../scripts/lib/exec.ts";

export const storefront = path.resolve(import.meta.dirname, "../..");
export const POSTGRES_CONTAINER = process.env["S3_PG_CONTAINER"] ?? "shopblok-starter-postgres-1";

export function assertThrowaway(name: string): void {
  if (!/^payload_s3_[a-z0-9_]+$/.test(name)) {
    throw new Error(`refusing to touch database "${name}": S3 uses payload_s3_* only`);
  }
}

export const dbUrl = (name: string): string => {
  assertThrowaway(name);
  return `postgres://postgres:postgres@localhost:15432/${name}`;
};

/** `psql` inside the compose container, as the superuser. Returns trimmed stdout. */
export function psql(database: string, sql: string): string {
  const result = spawnSync(
    "docker",
    ["exec", "-i", POSTGRES_CONTAINER, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`psql (${database}): ${result.stderr.trim() || result.stdout.trim()}`);
  return result.stdout.trim();
}

export function createDb(name: string): void {
  assertThrowaway(name);
  psql("postgres", `DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  psql("postgres", `CREATE DATABASE ${name}`);
}

export function dropDb(name: string): void {
  assertThrowaway(name);
  psql("postgres", `DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
}

export function copyDb(from: string, to: string): void {
  assertThrowaway(from);
  assertThrowaway(to);
  psql("postgres", `DROP DATABASE IF EXISTS ${to} WITH (FORCE)`);
  psql("postgres", `CREATE DATABASE ${to} TEMPLATE ${from}`);
}

export type S3Env = {
  database: string;
  /** "four" or unset for the 42 */
  locales?: "four";
  rich?: boolean;
  migrationDir?: string;
  plus?: string;
  minus?: string;
};

export function envFor(options: S3Env): Record<string, string | undefined> {
  return {
    PAYLOAD_DATABASE_URL: dbUrl(options.database),
    // production: Payload must not create a missing database (disableCreateDatabase)
    NODE_ENV: "production",
    NO_COLOR: "1",
    S3_LOCALES: options.locales,
    S3_RICH: options.rich ? "1" : undefined,
    S3_MIGRATION_DIR: options.migrationDir,
    S3_PLUS: options.plus,
    S3_MINUS: options.minus,
  };
}

export type CliResult = RunResult & { ms: number; attempts: number };

/** Payload's CLI with S3's environment. `runPayload` repeats a silent exit up to 3 times. */
export async function payloadCli(args: string[], options: S3Env, timeoutMs = 300_000): Promise<CliResult> {
  const started = performance.now();
  const result = await runPayload(args, { cwd: path.resolve(storefront, "../.."), env: envFor(options), timeoutMs });
  return { ...result, ms: Math.round(performance.now() - started), attempts: 1 };
}

/** Names of the migrations the database has run, in order (empty when the table is missing). */
export function ranMigrations(database: string): string[] {
  const exists = psql(database, "select to_regclass('public.payload_migrations') is not null");
  if (exists !== "t") return [];
  const rows = psql(database, "select name from payload_migrations where batch > 0 order by id");
  return rows === "" ? [] : rows.split("\n");
}

/** The migration files in a folder, without extension, in name order. */
export function migrationFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

/**
 * `payload migrate`, then a check that the database really has every migration of the folder. A run
 * that exits 0 and has not migrated is run again, up to `tries` times; a run that fails is returned.
 */
export async function migrateVerified(options: S3Env, tries = 4): Promise<CliResult & { tries: number }> {
  const dir = options.migrationDir ?? path.resolve(storefront, "src/migrations");
  const want = migrationFiles(dir);
  let last: CliResult | undefined;
  for (let n = 1; n <= tries; n++) {
    last = await payloadCli(["migrate"], options);
    if (last.code !== 0) return { ...last, tries: n };
    const ran = ranMigrations(options.database);
    if (want.every((name) => ran.includes(name))) return { ...last, tries: n };
    console.error(`  migrate exited 0 but ${want.filter((w) => !ran.includes(w)).join(", ")} did not run; again (${n}/${tries})`);
  }
  throw new Error("payload migrate exited 0 four times without migrating");
}
