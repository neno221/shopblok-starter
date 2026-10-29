import { messageProblem } from "@shopblok/i18n/icu";
import type {
  AfterErrorHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldAccess,
  Validate,
} from "payload";
import { isAdmin, isStaff } from "../access/roles";
import { revalidateOnPublish } from "../hooks/revalidate-on-publish";

export const UI_STRINGS = "ui-strings";

/** A message's dotted path as the catalogs write it: `molecules.cartLineItem.remove`. */
const KEY = /^[A-Za-z][\w-]*(\.[A-Za-z0-9][\w-]*)+$/;

/** The namespace a key belongs to: its first segment (`molecules`). */
export const namespaceOf = (key: string): string => key.slice(0, key.indexOf("."));

/** Written by the seed alone, which runs with `overrideAccess` (T59's runner, D77). */
const seedOnly: FieldAccess = () => false;

export const validateKey: Validate<string> = (value) =>
  typeof value === "string" && KEY.test(value)
    ? true
    : "A key is the message's dotted path, such as molecules.cartLineItem.remove.";

/**
 * The ICU check on save (D77): a value must parse and use exactly the arguments of the code's
 * English (`source.message`), each of the same kind, or the save is refused with the reason. An
 * empty value is allowed: the language then falls back to English (Payload's fallback), then to the
 * code. A document without a source (an admin's own key) is checked for its syntax only.
 */
export const validateValue: Validate<string | null | undefined> = (value, { data }) => {
  if (value === undefined || value === null || value === "") return true;
  const source = (data as { source?: { message?: string | null } } | undefined)?.source?.message;
  return messageProblem(value, source ?? value) ?? true;
};

/** The namespace follows the key, so a namespace new in the catalog needs no migration (D77). */
const setNamespace: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const key = (data["key"] ?? originalDoc?.["key"]) as unknown;
  return typeof key === "string" ? { ...data, namespace: namespaceOf(key) } : data;
};

const revalidate = revalidateOnPublish({ tags: (locale) => [`ui-strings:${locale}`] });

/**
 * A refused save answers with its reason, field by field (`errors[0].data.errors`), which the
 * admin shows under the field. Payload's formatter keeps those details only for an error that is
 * `instanceof` its own `ValidationError`; in CI's build that check failed (PR 93) and the answer
 * kept "The following field is invalid: Value" alone, the reason lost. This puts the details back
 * for any error that carries them under that name.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const keepRefusalReason: AfterErrorHook = ({ error }) => {
  const data = (error as { data?: unknown }).data;
  if (error.name !== "ValidationError" || !isRecord(data)) return;
  return { response: { errors: [{ name: error.name, data, message: error.message }] } };
};

/**
 * The shop's microcopy (D77): one document per message of the code catalogs, edited in each
 * language and read by next-intl's loader (`src/i18n/request.ts`) over the code's text. No drafts:
 * a save is live, and it revalidates `ui-strings:<locale>` in every language, since a language
 * without its own value falls back to English's.
 *
 * - **Access:** read is public (it is the shop's own copy, on every page anyway); update is staff;
 *   create and delete are the seed's and admins' (the seed adds and removes keys as the code does).
 * - **`key`**, **`namespace`** and **`source`** are read-only: the seed writes them, and the
 *   namespace (the key's first segment) is what the list view filters by.
 * - **`seeded`** is the value the seed last wrote in each language, hidden. A later seed changes a
 *   value only while it still equals that, so an editor's text survives `pnpm bootstrap`.
 * - CSV export and import (`@payloadcms/plugin-import-export`, admins only) in `payload.config.ts`.
 */
export const UiStrings: CollectionConfig = {
  slug: UI_STRINGS,
  labels: { singular: "UI string", plural: "UI strings" },
  admin: {
    useAsTitle: "key",
    defaultColumns: ["key", "value", "namespace", "updatedAt"],
    listSearchableFields: ["key", "value"],
    description:
      "The shop's microcopy, one message per document. Placeholders such as {count} must stay as the English text has them; a save that changes one is refused.",
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isStaff,
    delete: isAdmin,
  },
  hooks: {
    ...revalidate,
    beforeChange: [...revalidate.beforeChange, setNamespace],
    afterError: [keepRefusalReason],
  },
  fields: [
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      index: true,
      validate: validateKey,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "namespace",
      type: "text",
      index: true,
      admin: { readOnly: true, position: "sidebar" },
      access: { create: seedOnly, update: seedOnly },
    },
    {
      name: "value",
      type: "textarea",
      localized: true,
      validate: validateValue,
      hooks: {
        // An empty value is no value: stored as `null`, Payload's fallback gives English's.
        beforeChange: [({ value }) => (value === "" ? null : value)],
      },
    },
    {
      name: "source",
      type: "group",
      admin: {
        readOnly: true,
        description: "The code's English text and its arguments, which every language keeps.",
      },
      access: { create: seedOnly, update: seedOnly },
      fields: [
        { name: "message", type: "textarea" },
        { name: "arguments", type: "text" },
      ],
    },
    { name: "note", type: "textarea", admin: { description: "For translators." } },
    {
      name: "seeded",
      type: "textarea",
      localized: true,
      admin: { hidden: true },
      access: { read: seedOnly, create: seedOnly, update: seedOnly },
      custom: { "plugin-import-export": { disabled: true } },
    },
  ],
};
