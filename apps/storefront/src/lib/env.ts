// The one module that reads `process.env` (T12), besides `payload.config.ts` and `src/scripts/`.
// Nothing here is `server-only`: the proxy imports `env` and has no Payload, and a client module
// must not import it for a secret. Nothing is parsed when this file is imported, so `next build`
// works with no `.env` (CI has none); a value is checked where it is first needed.
import { z } from "zod";

/** The variables the app reads. All optional here; `medusaEnv()` says which ones a caller needs. */
export type RawEnv = {
  NODE_ENV?: string | undefined;
  NEXT_PHASE?: string | undefined;
  NEXT_PUBLIC_BASE_URL?: string | undefined;
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?: string | undefined;
  MEDUSA_BACKEND_URL?: string | undefined;
  PAYLOAD_DATABASE_URL?: string | undefined;
};

/**
 * A live view of the process environment: each property reads `process.env` when it is read, so a
 * test can change a value with `vi.stubEnv`, and `defaultAllowFallback(env)` sees `NEXT_PHASE` as it
 * is at the time of the call. Every name is a literal `process.env.NAME`: `next build` writes a
 * `NEXT_PUBLIC_*` value into the bundle only where it sees that exact expression, and it does not
 * replace a read through the `process.env` object (`{ ...process.env }` would find nothing in a
 * proxy or a browser bundle).
 */
export const env: RawEnv = {
  get NODE_ENV() {
    return process.env.NODE_ENV;
  },
  get NEXT_PHASE() {
    return process.env.NEXT_PHASE;
  },
  get NEXT_PUBLIC_BASE_URL() {
    return process.env.NEXT_PUBLIC_BASE_URL;
  },
  get NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  },
  get MEDUSA_BACKEND_URL() {
    return process.env.MEDUSA_BACKEND_URL;
  },
  get PAYLOAD_DATABASE_URL() {
    return process.env.PAYLOAD_DATABASE_URL;
  },
};

export function isProduction(source: RawEnv = env): boolean {
  return source.NODE_ENV === "production";
}

/** Where Medusa is, and the key that lets a storefront read its Store API. */
export type MedusaEnv = {
  backendUrl: string;
  publishableKey: string;
};

/** Where `pnpm dev` runs the backend (SPEC §5); used outside production only. */
export const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000";

/** Thrown with every problem found, so one start-up shows them all. */
export class EnvError extends Error {
  override name = "EnvError";
}

// A blank value in `.env` (`KEY=`) is "not set".
const blankIsUnset = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const medusaSchema = z.object({
  MEDUSA_BACKEND_URL: z.preprocess(
    blankIsUnset,
    z
      .url({ protocol: /^https?$/, error: "must be an http(s) URL such as http://localhost:9000" })
      .optional(),
  ),
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: z.preprocess(
    blankIsUnset,
    z
      .string({
        error:
          "is empty. Run `pnpm bootstrap`, or copy the key that apps/backend/src/scripts/print-publishable-key.ts prints",
      })
      .trim()
      .startsWith("pk_", {
        error: "must be the publishable key's token (pk_…), not its id (apk_…)",
      }),
  ),
});

/**
 * The Medusa settings, checked. The backend URL defaults to the local one outside production and is
 * required in production, where a missing value would otherwise send the shop to a localhost.
 */
export function medusaEnv(source: RawEnv = env): MedusaEnv {
  const parsed = medusaSchema.safeParse({
    MEDUSA_BACKEND_URL: source.MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: source.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });
  const problems = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`);
  const url = parsed.success ? parsed.data.MEDUSA_BACKEND_URL : undefined;
  if (parsed.success && url === undefined && isProduction(source)) {
    problems.push("MEDUSA_BACKEND_URL is required in production (https://api.example.com)");
  }
  if (!parsed.success || problems.length > 0) {
    throw new EnvError(`Medusa is not configured:\n- ${problems.join("\n- ")}`);
  }
  return {
    backendUrl: url ?? DEFAULT_MEDUSA_BACKEND_URL,
    publishableKey: parsed.data.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  };
}
