import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

export type Credentials = { email: string; password: string };

/** The admin bootstrap made: the environment first, then the backend's .env (bootstrap's step 5). */
export function adminCredentials(): Credentials {
  const email = process.env["E2E_ADMIN_EMAIL"];
  const password = process.env["E2E_ADMIN_PASSWORD"];
  if (email && password) return { email, password };
  const file = path.resolve(import.meta.dirname, "../../../backend/.env");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `No admin to log in with: ${file} does not exist. Run pnpm bootstrap, or set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.`,
    );
  }
  // `parseEnv` reads the file the way dotenv does (the last assignment wins, `export `, quotes and
  // an unquoted ` # comment`), as bootstrap's own reader and the servers do.
  const { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD } = parseEnv(text);
  if (!DEV_ADMIN_EMAIL || !DEV_ADMIN_PASSWORD) {
    throw new Error(
      `DEV_ADMIN_EMAIL or DEV_ADMIN_PASSWORD is not set in ${file}. Run pnpm bootstrap.`,
    );
  }
  return { email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD };
}
