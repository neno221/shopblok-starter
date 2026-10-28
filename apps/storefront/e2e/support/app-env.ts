import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

/** A value from an app's `.env` (what bootstrap wrote), the environment first. */
export function appEnv(app: "backend" | "storefront", name: string): string {
  const fromShell = process.env[name];
  if (fromShell) return fromShell;
  const file = path.resolve(import.meta.dirname, `../../../${app}/.env`);
  const value = parseEnv(readFileSync(file, "utf8"))[name];
  if (!value) throw new Error(`${name} is not set in ${file}. Run pnpm bootstrap.`);
  return value;
}
