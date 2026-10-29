import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { siteOrigin } from "./lib/site-origin";
import { BLOCKS } from "./payload/blocks";
import { Categories } from "./payload/collections/categories";
import { Collections } from "./payload/collections/collections";
import { Integrations } from "./payload/collections/integrations";
import { Media } from "./payload/collections/media";
import { EmailTemplates } from "./payload/collections/email-templates";
import { Pages } from "./payload/collections/pages";
import { Posts } from "./payload/collections/posts";
import { Products } from "./payload/collections/products";
import { UiStrings } from "./payload/collections/ui-strings";
import { Users } from "./payload/collections/users";
import { cronOrAdmin } from "./payload/access/jobs";
import { filterAvailableLocales } from "./payload/filter-available-locales";
import { formBuilder } from "./payload/forms";
import { CONTENT_GLOBALS } from "./payload/globals/content-global";
import { Footer } from "./payload/globals/footer";
import { Header } from "./payload/globals/header";
import { importExport } from "./payload/import-export";
import { Markets } from "./payload/globals/markets";
import { SiteSettings } from "./payload/globals/site-settings";
import { LIVE_PREVIEW_BREAKPOINTS, livePreviewUrl } from "./payload/live-preview";
import { redirects } from "./payload/redirects";
import { seo } from "./payload/seo";
import { DEFAULT_LOCALE, LOCALES } from "./payload/locales";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// D15: the compose stack's Postgres on its host port. Payload creates a missing database on
// connect, so in development a wrong URL creates one on whichever server answers. Production
// doesn't: a deploy that forgot the URL fails on connect instead.
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:15432/payload";

// The site's own origin. Setting `serverURL` turns on Payload's CSRF check, and `cors` and `csrf`
// list the same single origin.
const serverURL = siteOrigin();

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
    // D85: the integrations (SPEC §10) and whether each is on, above the collections.
    components: { beforeDashboard: ["/payload/components/integrations-status#IntegrationsStatus"] },
    // D74: the edited language's market in three frames, through `/next/preview`. The globals show
    // the market's home (T61), a post its page in the journal (T66).
    livePreview: {
      breakpoints: LIVE_PREVIEW_BREAKPOINTS,
      collections: ["pages", "posts"],
      globals: [...CONTENT_GLOBALS],
      url: livePreviewUrl,
    },
  },
  collections: [
    Users,
    Integrations,
    Media,
    Pages,
    Posts,
    Products,
    Categories,
    Collections,
    EmailTemplates,
    UiStrings,
  ],
  globals: [Markets, Header, Footer, SiteSettings],
  // D70, D79: SPEC §7.4's blocks, defined once here; `pages.layout` names them (`blockReferences`).
  blocks: BLOCKS,
  editor: lexicalEditor(),
  graphQL: { disable: true },
  localization: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    fallback: true,
    filterAvailableLocales,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_DATABASE_URL ?? DEFAULT_DATABASE_URL,
      // pg waits for ever by default, so a database host that has gone silent would hang everything
      // that needs Payload, and `getPayload` would keep awaiting the same attempt. With a limit the
      // attempt fails and the next call starts a new one.
      connectionTimeoutMillis: 10_000,
    },
    // D9: schema changes are saved migrations. Dev push is for experiments only.
    push: process.env.PAYLOAD_DB_PUSH === "true",
    disableCreateDatabase: process.env.NODE_ENV === "production",
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  // SPEC §7.1: 10 MiB per upload (Payload answers 413 above it).
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
  // D74: scheduled publishing runs on the jobs queue. Only the cron secret (Vercel Cron in
  // production, `instrumentation.ts`'s timer in development) or an admin may run or queue jobs; no
  // `autoRun`, which would publish outside a Next request where `revalidateTag` cannot work. The
  // jobs collection stays Payload's: hidden, every operation denied.
  jobs: {
    access: { run: cronOrAdmin(), queue: cronOrAdmin(), cancel: cronOrAdmin() },
    deleteJobOnComplete: true,
  },
  // T57 (M4 D86 item 3): no type generation when Payload starts in development. It wrote the file
  // unformatted, so `next dev` left a 283-line diff (W5); `generate:types` writes and formats it,
  // and CI's `check` fails when the committed file is not what that writes.
  // D77: CSV export and import of `ui-strings`, admins only (`payload/import-export.ts`). D81: the
  // form builder, hardened (`payload/forms.ts`): submissions only through the shop's server action.
  // D82: the SEO fields on the pages and posts (`payload/seo.ts`; the synced collections have them
  // as content) and the redirects the proxy answers (`payload/redirects.ts`).
  plugins: [importExport, formBuilder, seo, redirects],
  typescript: { autoGenerate: false, outputFile: path.resolve(dirname, "payload-types.ts") },
});
