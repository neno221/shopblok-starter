import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { attachDatabasePool } from "@vercel/functions";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { BUILD_DB_POOL_MAX, isBuildPhase } from "./lib/build-workers";
import { firstUserClosed, previewOrigins } from "./lib/env";
import { siteOrigin } from "./lib/site-origin";
import { BLOCKS } from "./payload/blocks";
import { Categories } from "./payload/collections/categories";
import { Collections } from "./payload/collections/collections";
import { Integrations } from "./payload/collections/integrations";
import { Media } from "./payload/collections/media";
import { NewsletterConfirmations } from "./payload/collections/newsletter-confirmations";
import { ConsentRecords } from "./payload/collections/consent-records";
import { consentRetentionTask } from "./payload/jobs/consent-retention";
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
import { SiteSettings } from "./payload/globals/site-settings";
import { Templates } from "./payload/globals/templates";
import { LIVE_PREVIEW_BREAKPOINTS, livePreviewUrl } from "./payload/live-preview";
import { redirects } from "./payload/redirects";
import { seo } from "./payload/seo";
import { DEFAULT_LOCALE, LOCALES } from "./payload/locales";
import { emailAdapter } from "./payload/email";
import { e2eThrowEndpoint } from "./payload/e2e-throw";
import { reportToSentry } from "./payload/sentry";
import { mediaStorage, privateFileStorage } from "./payload/storage";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// D15: the compose stack's Postgres on its host port. Payload creates a missing database on
// connect, so in development a wrong URL creates one on whichever server answers. Production
// doesn't: a deploy that forgot the URL fails on connect instead.
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:15432/payload";

/** Connections per Vercel function instance on a deployment (M7 D136). */
const DEPLOYED_POOL_MAX = 3;

// The site's own origin. Setting `serverURL` turns on Payload's CSRF check, and `cors` and `csrf`
// list that origin, and on a Vercel preview its deployment's and branch's addresses as well
// (`previewOrigins`), so the admin works at whichever of them it was opened.
const serverURL = siteOrigin();
const origins = [...new Set([serverURL, ...previewOrigins()])];

export default buildConfig({
  serverURL,
  cors: origins,
  csrf: origins,
  // M7 D136: on Vercel, the function instance stays alive until the pool's idle connections are
  // closed (Fluid compute's `waitUntil`), so a suspended instance never leaves them open on
  // Railway's Postgres. Off Vercel it does nothing.
  onInit: (payload) => {
    if ((process.env.VERCEL ?? "").trim() === "") return;
    const { pool } = payload.db as unknown as { pool?: Parameters<typeof attachDatabasePool>[0] };
    if (pool !== undefined) attachDatabasePool(pool);
  },
  // Empty on purpose when unset: Payload stops at start ("missing secret key") and `next build`,
  // which never starts Payload, still works with no .env.
  secret: process.env.PAYLOAD_SECRET ?? "",
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    // D108 (T90): Medusa Admin's look, light only (the shop has no dark mode, Q22): the colours,
    // typeface and corners in `app/(payload)/custom.scss`, Inter through a provider, and the shop's
    // logo and icon from the site settings in place of Payload's.
    theme: "light",
    components: {
      // D85: the integrations (SPEC §10) and whether each is on, above the collections.
      beforeDashboard: ["/payload/components/integrations-status#IntegrationsStatus"],
      graphics: {
        Logo: "/payload/components/logo#AdminLogo",
        Icon: "/payload/components/icon#AdminIcon",
      },
      providers: ["/payload/components/admin-font#AdminFont"],
    },
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
    NewsletterConfirmations,
    ConsentRecords,
  ],
  globals: [Header, Footer, SiteSettings, Templates],
  // D70, D79: SPEC §7.4's blocks, defined once here; `pages.layout` names them (`blockReferences`).
  blocks: BLOCKS,
  editor: lexicalEditor(),
  // M6 D121 (T98): Resend with its keys, else Mailpit with SMTP_HOST, else none (`payload/email.ts`).
  email: emailAdapter(),
  graphQL: { disable: true },
  // M6 D125 (T96): a server error to Sentry with the DSN (`payload/sentry.ts`), and the test-only
  // endpoint that throws one (`payload/e2e-throw.ts`, 404 unless E2E_TEST_ROUTES=true).
  hooks: { afterError: [reportToSentry] },
  endpoints: [e2eThrowEndpoint],
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
      // No JIT on Payload's connections: a read of a document with many blocks fields (the
      // `templates` global since T87 joins about 270 block tables) is one large query whose
      // estimated cost passes Postgres' JIT threshold on tables never analyzed yet (a fresh
      // database), and compiling it took about 4 s for a query that runs in 10 ms (PR 127's CI:
      // every templates save and read). Payload's queries are short, so JIT never pays off here.
      options: "-c jit=off",
      // W6 item 7: each `next build` worker has its own pool, so the build keeps it small (pg's
      // default, 10, otherwise); src/lib/build-workers.ts says why. On a deployment (M7 D136),
      // each Vercel function instance holds its own pool against Railway's Postgres, so it keeps
      // 3 connections, and lets idle ones go after 5 s (`attachDatabasePool` below keeps the
      // instance alive that long, so they are closed instead of leaked). TLS comes from the
      // connection string (`sslmode`), which `doctor --app=storefront` checks on a deployment.
      ...(isBuildPhase()
        ? { max: BUILD_DB_POOL_MAX }
        : firstUserClosed()
          ? { max: DEPLOYED_POOL_MAX, idleTimeoutMillis: 5_000 }
          : {}),
    },
    // D9: schema changes are saved migrations. Dev push is for experiments only.
    push: process.env.PAYLOAD_DB_PUSH === "true",
    disableCreateDatabase: process.env.NODE_ENV === "production",
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  // SPEC §7.1: 10 MiB per upload (Payload answers 413 above it).
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
  // D74: scheduled publishing runs on the jobs queue. Only the cron secret (Medusa's worker on a
  // deployment, M7 D148; `instrumentation.ts`'s timer in development) or an admin may run or queue jobs; no
  // `autoRun`, which would publish outside a Next request where `revalidateTag` cannot work. The
  // jobs collection stays Payload's: hidden, every operation denied.
  // M7 D145 (T109): the consent records' retention runs on the same queue, once a day.
  jobs: {
    access: { run: cronOrAdmin(), queue: cronOrAdmin(), cancel: cronOrAdmin() },
    deleteJobOnComplete: true,
    tasks: [consentRetentionTask],
  },
  // T57 (M4 D86 item 3): no type generation when Payload starts in development. It wrote the file
  // unformatted, so `next dev` left a 283-line diff (W5); `generate:types` writes and formats it,
  // and CI's `check` fails when the committed file is not what that writes.
  // D77: CSV export and import of `ui-strings`, admins only (`payload/import-export.ts`). D81: the
  // form builder, hardened (`payload/forms.ts`): submissions only through the shop's server action.
  // D82: the SEO fields on the pages and posts (`payload/seo.ts`; the synced collections have them
  // as content) and the redirects the proxy answers (`payload/redirects.ts`). M6 D127 (T95): `media`
  // on R2 with the S3_* keys, local disk without them (`payload/storage.ts`); M7 D148 (T111): the
  // CSV exports and imports on R2's private bucket with `S3_PRIVATE_BUCKET` too, downloaded only
  // through a signed link. The storage plugins come after `importExport`, whose collections they
  // change.
  plugins: [
    importExport,
    formBuilder,
    seo,
    redirects,
    mediaStorage(process.env),
    privateFileStorage(process.env),
  ],
  typescript: { autoGenerate: false, outputFile: path.resolve(dirname, "payload-types.ts") },
});
