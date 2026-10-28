import path from "node:path";
import { fileURLToPath } from "node:url";
import { importExportPlugin } from "@payloadcms/plugin-import-export";
import type { CollectionConfig, Endpoint, PayloadHandler } from "payload";
import { isAdmin, isAdminRequest } from "./access/roles";
import { UI_STRINGS } from "./collections/ui-strings";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Admins only, for the plugin's own collections (`exports`, `imports`) and their endpoints. Its
 * defaults let any signed-in principal create an export or an import and read every one (an
 * export's file is readable by whoever reads `exports`, an integration's API key included), and its
 * endpoints (`/api/exports/download`, the previews) check nothing themselves.
 */
export function adminOnly(slug: "exports" | "imports") {
  return ({ collection }: { collection: CollectionConfig }): CollectionConfig => ({
    ...collection,
    access: {
      ...collection.access,
      read: isAdmin,
      create: isAdmin,
      update: () => false,
      delete: isAdmin,
    },
    admin: {
      ...collection.admin,
      hidden: ({ user }) => user?.collection !== "users" || user["role"] !== "admin",
    },
    endpoints: (collection.endpoints || []).map(
      (endpoint): Endpoint => ({ ...endpoint, handler: adminHandler(endpoint.handler) }),
    ),
    // The files, git-ignored beside the media's (T01). A shared disk or bucket in production (M7).
    upload: {
      ...(typeof collection.upload === "object" ? collection.upload : {}),
      staticDir: path.resolve(dirname, `../../media/${slug}`),
    },
  });
}

function adminHandler(handler: PayloadHandler): PayloadHandler {
  return (req) =>
    isAdminRequest(req)
      ? handler(req)
      : Response.json({ errors: [{ message: "Only an admin may do that." }] }, { status: 403 });
}

/**
 * CSV export and import of `ui-strings` for an offline translation (D77, SPEC §7.8): the export
 * has a `value_<locale>` column per language, and the import matches rows by `key`. Both run in the
 * request (`disableJobsQueue`), so an import's saves revalidate the pages as the admin's do.
 */
export const importExport = importExportPlugin({
  collections: [
    {
      slug: UI_STRINGS,
      export: { format: "csv", disableJobsQueue: true },
      import: { disableJobsQueue: true },
    },
  ],
  overrideExportCollection: adminOnly("exports"),
  overrideImportCollection: adminOnly("imports"),
});
