import path from "node:path";
import { fileURLToPath } from "node:url";
import { importExportPlugin } from "@payloadcms/plugin-import-export";
import type { ImportBeforeHook } from "@payloadcms/plugin-import-export/types";
import { messageProblem } from "@shopblok/i18n/icu";
import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  Endpoint,
  Field,
  PayloadHandler,
} from "payload";
import { isAdmin, isAdminRequest } from "./access/roles";
import { UI_STRINGS } from "./collections/ui-strings";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Rows per batch of an import: the plugin's default, named so a problem's row number is right. */
export const IMPORT_BATCH_SIZE = 100;

/** `req.context` key: the values `checkImportedStrings` refused, for the import's summary. */
const PROBLEMS = "uiStringsImportProblems";

/** One refused value, in the shape of the plugin's own `summary.issueDetails`. */
type ImportProblem = { row: number; error: string; data: Record<string, unknown> };

type StoredString = {
  key: string;
  value?: Record<string, string | null | undefined> | null;
  source?: { message?: string | null } | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * What an import of `ui-strings` writes (D77), per batch, before the plugin saves it:
 *
 * - **Only what changed.** A language whose cell holds what is stored already (an empty cell for a
 *   language with no value, the 38 the export lists beside the shop's four) is left out, so a
 *   round trip of an untouched export saves nothing new.
 * - **The ICU check,** as on a save: a value that does not parse or changes the source's arguments
 *   is left out and reported in the import's summary (`reportImportProblems`). The plugin would
 *   refuse it too, but for a language other than English it only logs the refusal (3.92.1).
 * - **English first.** For a row without English, the plugin writes the row's first language into
 *   English (3.92.1: it saves the first column it finds in the default locale), so a translator's
 *   file with only `value_el` would overwrite the English text. Each row that changes a value
 *   therefore carries the stored English, or the edited one.
 *
 * A key that is not stored is left for the plugin, which reports it as not found (imports update
 * only: `adminOnly("imports")`).
 */
export const checkImportedStrings: ImportBeforeHook = async ({ batchNumber, data, req }) => {
  const rows = data as Record<string, unknown>[];
  const keys = rows.flatMap((row) => (typeof row["key"] === "string" ? [row["key"]] : []));
  const { docs } = await req.payload.find({
    collection: UI_STRINGS,
    where: { key: { in: keys } },
    locale: "all",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { key: true, value: true, source: true },
    req,
  });
  const stored = new Map((docs as unknown as StoredString[]).map((doc) => [doc.key, doc]));
  const problems = (req.context[PROBLEMS] ??= []) as ImportProblem[];
  return rows.map((row, index) => {
    const doc = typeof row["key"] === "string" ? stored.get(row["key"]) : undefined;
    const { value: cells, ...rest } = row;
    if (doc === undefined || !isRecord(cells)) return row;
    const changed: Record<string, string | null> = {};
    for (const [locale, cell] of Object.entries(cells)) {
      const next = typeof cell === "string" && cell !== "" ? cell : null;
      if (next === (doc.value?.[locale] ?? null)) continue;
      const problem = next === null ? null : messageProblem(next, doc.source?.message ?? next);
      if (problem === null) {
        changed[locale] = next;
        continue;
      }
      problems.push({
        row: (batchNumber - 1) * IMPORT_BATCH_SIZE + index + 1,
        error: `value_${locale}: ${problem}`,
        data: { key: doc.key, [`value_${locale}`]: next },
      });
    }
    if (Object.keys(changed).length === 0) return rest;
    return { ...rest, value: { en: doc.value?.["en"] ?? null, ...changed } };
  });
};

/**
 * Adds the values `checkImportedStrings` refused to the import's summary, after the plugin wrote
 * its own (its hook runs first): each refused value is an issue with its row and reason, and the
 * import is `partial`, or `failed` when it changed nothing.
 */
export const reportImportProblems: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  const problems = req.context[PROBLEMS] as ImportProblem[] | undefined;
  if (operation !== "create" || problems === undefined || problems.length === 0) return doc;
  delete req.context[PROBLEMS];
  const held = (doc.summary ?? {}) as {
    imported?: number;
    updated?: number;
    issues?: number;
    issueDetails?: ImportProblem[];
  };
  const summary = {
    ...held,
    issues: (held.issues ?? 0) + problems.length,
    issueDetails: [...(held.issueDetails ?? []), ...problems],
  };
  const status = (held.imported ?? 0) + (held.updated ?? 0) === 0 ? "failed" : "partial";
  await req.payload.update({
    collection: "imports",
    id: doc.id,
    data: { status, summary },
    overrideAccess: true,
    req,
  });
  return { ...doc, status, summary };
};

/**
 * An import updates the documents the seed made, matched by `key`: ids differ between databases,
 * and a new key comes from the code (the seed), not from a translator's file.
 */
function updateByKey(field: Field): Field {
  if (!("name" in field)) return field;
  if (field.name === "importMode" && field.type === "select") {
    return {
      ...field,
      defaultValue: "update",
      validate: (value: unknown) =>
        value === "update" || "UI strings are imported into the documents that exist: Update.",
    };
  }
  if (field.name === "matchField" && field.type === "text") {
    return {
      ...field,
      defaultValue: "key",
      validate: (value: unknown) =>
        value === "key" || "UI strings are matched by their key: enter key.",
    };
  }
  return field;
}

function adminHandler(handler: PayloadHandler): PayloadHandler {
  return (req) =>
    isAdminRequest(req)
      ? handler(req)
      : Response.json({ errors: [{ message: "Only an admin may do that." }] }, { status: 403 });
}

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
    endpoints: (collection.endpoints || []).map((endpoint): Endpoint => ({
      ...endpoint,
      handler: adminHandler(endpoint.handler),
    })),
    ...(slug === "imports"
      ? {
          fields: collection.fields.map(updateByKey),
          hooks: {
            ...collection.hooks,
            afterChange: [...(collection.hooks?.afterChange ?? []), reportImportProblems],
          },
        }
      : {}),
    // The files, git-ignored beside the media's (T01). A shared disk or bucket in production (M7).
    upload: {
      ...(typeof collection.upload === "object" ? collection.upload : {}),
      staticDir: path.resolve(dirname, `../../media/${slug}`),
    },
  });
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
      import: {
        disableJobsQueue: true,
        batchSize: IMPORT_BATCH_SIZE,
        hooks: { before: checkImportedStrings },
      },
    },
  ],
  overrideExportCollection: adminOnly("exports"),
  overrideImportCollection: adminOnly("imports"),
});
