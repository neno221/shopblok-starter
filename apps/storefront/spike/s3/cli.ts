// S3 PROTOTYPE: small commands for the shell scripts.
//   node spike/s3/cli.ts create <db>
//   node spike/s3/cli.ts drop <db>
//   node spike/s3/cli.ts migrate <db> [--four] [--rich] [--dir <path>]
import { createDb, dropDb, migrateVerified, copyDb } from "./lib.ts";

const [command, database, ...rest] = process.argv.slice(2);
if (!command || !database) throw new Error("usage: cli.ts <create|drop|migrate|copy> <db> [options]");

const flag = (name: string) => rest.includes(name);
const value = (name: string) => rest[rest.indexOf(name) + 1];

if (command === "create") {
  createDb(database);
  console.log(`created ${database}`);
} else if (command === "drop") {
  dropDb(database);
  console.log(`dropped ${database}`);
} else if (command === "copy") {
  copyDb(database, rest[0] as string);
  console.log(`copied ${database} to ${rest[0]}`);
} else if (command === "migrate") {
  const result = await migrateVerified({
    database,
    locales: flag("--four") ? "four" : undefined,
    rich: flag("--rich"),
    migrationDir: value("--dir"),
  });
  console.log(result.output.trim());
  console.log(`migrate: exit ${result.code}, ${result.ms} ms, ${result.tries} run(s)`);
  process.exit(result.code ?? 1);
} else {
  throw new Error(`unknown command ${command}`);
}
