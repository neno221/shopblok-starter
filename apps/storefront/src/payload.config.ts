import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Integrations } from "./payload/collections/integrations";
import { Media } from "./payload/collections/media";
import { Pages } from "./payload/collections/pages";
import { Users } from "./payload/collections/users";
import { filterAvailableLocales } from "./payload/filter-available-locales";
import { Markets } from "./payload/globals/markets";
import { DEFAULT_LOCALE, LOCALES } from "./payload/locales";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// D15: the compose stack's Postgres on its host port. Payload creates a missing database on
// connect, so a wrong URL creates one on whichever server answers.
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:15432/payload";

// The site's own origin. Setting `serverURL` turns on Payload's CSRF check, and `cors` and `csrf`
// list the same single origin.
const serverURL = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export default buildConfig({
  serverURL,
  cors: [serverURL],
  csrf: [serverURL],
  // Empty on purpose when unset: Payload stops at start ("missing secret key") and `next build`,
  // which never starts Payload, still works with no .env.
  secret: process.env.PAYLOAD_SECRET ?? "",
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
  },
  collections: [Users, Integrations, Media, Pages],
  globals: [Markets],
  editor: lexicalEditor(),
  graphQL: { disable: true },
  localization: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    fallback: true,
    filterAvailableLocales,
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.PAYLOAD_DATABASE_URL ?? DEFAULT_DATABASE_URL },
    // D9: schema changes are saved migrations. Dev push is for experiments only.
    push: process.env.PAYLOAD_DB_PUSH === "true",
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
});
