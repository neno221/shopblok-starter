import type {
  CheckboxField,
  DateField,
  Field,
  NumberField,
  RelationshipField,
  TextField,
} from "payload";
import { isMedusaSyncField } from "../access/roles";

/**
 * A field Medusa owns (D75): the sync writes it, nobody else. Read-only in the admin, and its
 * `create` and `update` access let only the `medusa-sync` integration through, so an editor's
 * value for it is dropped (Payload strips a field the request may not write) and the document
 * keeps Medusa's. `custom.synced` marks it for the shared fixture's test (`synced.test.ts`).
 */
type SyncedField = CheckboxField | DateField | NumberField | RelationshipField | TextField;

export function synced<F extends SyncedField>(field: F): F {
  return {
    ...field,
    admin: { ...field.admin, readOnly: true },
    access: { ...field.access, create: isMedusaSyncField, update: isMedusaSyncField },
    custom: { ...field.custom, synced: true },
  } as F;
}

/** Medusa's id (`prod_…`, `pcat_…`, `pcol_…`): what the sync finds a document by. */
export const medusaIdField = (): TextField =>
  synced<TextField>({
    name: "medusaId",
    type: "text",
    required: true,
    unique: true,
    index: true,
    admin: { position: "sidebar" },
  });

/** The document's handle in Medusa, which the storefront's URLs and cache tags use. */
export const handleField = (): TextField =>
  synced<TextField>({ name: "handle", type: "text", required: true, index: true });

export const titleField = (): TextField =>
  synced<TextField>({ name: "title", type: "text", required: true });

/**
 * Soft delete: Medusa deleted it. The document stays, so the CMS content and references to it
 * survive; pickers and pages leave such documents out.
 */
export const deletedInMedusaField = (): CheckboxField =>
  synced<CheckboxField>({
    name: "deletedInMedusa",
    type: "checkbox",
    defaultValue: false,
    index: true,
    admin: { position: "sidebar" },
  });

/** Medusa's `updated_at` of the version written: the reconcile job compares it (D75). */
export const medusaUpdatedAtField = (): DateField =>
  synced<DateField>({
    name: "medusaUpdatedAt",
    type: "date",
    admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
  });

/** When the sync last wrote the document. */
export const syncedAtField = (): DateField =>
  synced<DateField>({
    name: "syncedAt",
    type: "date",
    admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
  });

/** A reference the sync writes as a Payload id, after the document itself (a category's parent). */
export const syncedReference = (name: string, relationTo: "categories"): RelationshipField =>
  synced<RelationshipField>({ name, type: "relationship", relationTo, hasMany: false });

/** The names of a collection's synced fields, in order. */
export function syncedFieldNames(fields: readonly Field[]): string[] {
  return fields.flatMap((field) =>
    "name" in field && (field.custom as { synced?: boolean } | undefined)?.synced === true
      ? [field.name]
      : [],
  );
}
