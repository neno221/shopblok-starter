// Masks the keys in log files before CI uploads them (M6 D114, T93): `integrations-live` runs the
// servers with the integrations' test keys, and GitHub masks a secret in a step's output but not in
// the files a job uploads. Run with plain `node scripts/mask-keys.ts <file or folder>...`; each text
// file is rewritten in place with every key-shaped string (`lib/no-keys.ts`) and the value of every
// variable named in `MASK_KEYS_FROM` (a comma-separated list of names, read from this process's
// environment) replaced by `***`. A folder is read with everything below it. Prints how many it
// masked, never what.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBinary, maskKeys } from "./lib/no-keys.ts";

const names = (process.env["MASK_KEYS_FROM"] ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name !== "");
const values = names.flatMap((name) => {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? [] : [value.trim()];
});

function files(target: string): string[] {
  let stat;
  try {
    stat = statSync(target);
  } catch {
    return [];
  }
  if (stat.isFile()) return [target];
  if (!stat.isDirectory()) return [];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() || entry.isFile() ? files(path.join(target, entry.name)) : [],
  );
}

let changed = 0;
let read = 0;
for (const file of process.argv.slice(2).flatMap(files)) {
  const bytes = readFileSync(file);
  if (isBinary(bytes)) continue;
  read += 1;
  const text = bytes.toString("utf8");
  const masked = maskKeys(text, values);
  if (masked !== text) {
    writeFileSync(file, masked);
    changed += 1;
  }
}
console.log(
  `mask-keys: ${read} files read, ${changed} masked (by pattern, and by the values of ${values.length} of ${names.length} named variables).`,
);
