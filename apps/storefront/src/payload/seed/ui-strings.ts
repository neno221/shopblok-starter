import { DEFAULT_LOCALE, LOCALES, type Locale } from "@shopblok/i18n";
import { describeArguments, messageArguments } from "@shopblok/i18n/icu";
import type { Payload } from "payload";
import { codeMessages } from "../../i18n/messages";
import { namespaceOf, UI_STRINGS } from "../collections/ui-strings";

/** What a `ui-strings` seed did, by document. */
export type UiStringCounts = {
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
};

/** One message of the code catalogs as the seed writes it. */
export type CodeString = {
  key: string;
  namespace: string;
  source: { message: string; arguments: string };
  /** The message in each catalog language. */
  values: Record<Locale, string>;
};

/** A stored document as the seed reads it: every language at once (`locale: "all"`). */
export type StoredString = {
  id: number | string;
  key: string;
  namespace?: string | null;
  source?: { message?: string | null; arguments?: string | null } | null;
  value?: Partial<Record<string, string | null>> | null;
  seeded?: Partial<Record<string, string | null>> | null;
};

/** What one document needs: `null` when it is as the seed would leave it. */
export type StringChange = {
  namespace?: string;
  source?: CodeString["source"];
  value?: Partial<Record<Locale, string>>;
  seeded?: Partial<Record<Locale, string>>;
};

/** Every message of the code catalogs, 718 at T62, in the four catalog languages (D77). */
export function codeStrings(): CodeString[] {
  const english = codeMessages(DEFAULT_LOCALE);
  return [...english].map(([key, message]) => ({
    key,
    namespace: namespaceOf(key),
    source: { message, arguments: describeArguments(messageArguments(message)) },
    values: Object.fromEntries(
      LOCALES.map((locale) => [locale, codeMessages(locale).get(key) ?? message]),
    ) as Record<Locale, string>,
  }));
}

const isEmpty = (value: unknown) => value === undefined || value === null || value === "";

/**
 * D77's update rule for one document, per language: an empty value, or one that still equals what
 * the seed last wrote (`seeded`), takes the code's message; anything else is an editor's and stays.
 * Where the editor's value already is the code's, only `seeded` moves on, so the next release's
 * change gets through. `source` and `namespace` always follow the code.
 */
export function changeFor(code: CodeString, stored: StoredString): StringChange | null {
  const change: StringChange = {};
  if (stored.namespace !== code.namespace) change.namespace = code.namespace;
  if (
    stored.source?.message !== code.source.message ||
    stored.source?.arguments !== code.source.arguments
  ) {
    change.source = code.source;
  }
  for (const locale of LOCALES) {
    const next = code.values[locale];
    const current = stored.value?.[locale];
    const seeded = stored.seeded?.[locale];
    if (current === next) {
      if (seeded !== next) (change.seeded ??= {})[locale] = next;
    } else if (isEmpty(current) || current === seeded) {
      (change.value ??= {})[locale] = next;
      (change.seeded ??= {})[locale] = next;
    }
  }
  return Object.keys(change).length === 0 ? null : change;
}

/** Seeds write many documents: no revalidation per save (the running site has none to refresh). */
const CONTEXT = { disableRevalidate: true };

/**
 * The `ui-strings` seed (D77, T62 step 4): every message of `@shopblok/i18n` in en, el, de and fr.
 * One read of the whole collection in every language, then a create (all languages in one call)
 * for each missing key, an update for each document `changeFor` has changes for, and one delete of
 * the keys the code no longer has. A second run reads and writes nothing more. A system task:
 * access control is off, and nothing is revalidated.
 */
export async function seedUiStrings(
  payload: Payload,
  strings: CodeString[] = codeStrings(),
): Promise<UiStringCounts> {
  const counts: UiStringCounts = { created: 0, updated: 0, unchanged: 0, deleted: 0 };
  const { docs } = await payload.find({
    collection: UI_STRINGS,
    locale: "all",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { key: true, namespace: true, source: true, value: true, seeded: true },
  });
  const stored = new Map((docs as unknown as StoredString[]).map((doc) => [doc.key, doc]));
  for (const code of strings) {
    const doc = stored.get(code.key);
    if (doc === undefined) {
      await payload.create({
        collection: UI_STRINGS,
        locale: "all",
        data: {
          key: code.key,
          namespace: code.namespace,
          source: code.source,
          value: code.values,
          seeded: code.values,
        },
        overrideAccess: true,
        context: CONTEXT,
      } as never);
      counts.created++;
      continue;
    }
    const change = changeFor(code, doc);
    if (change === null) {
      counts.unchanged++;
      continue;
    }
    await payload.update({
      collection: UI_STRINGS,
      id: doc.id,
      locale: "all",
      data: change,
      overrideAccess: true,
      context: CONTEXT,
    } as never);
    counts.updated++;
  }
  const keys = new Set(strings.map((code) => code.key));
  const removed = [...stored.values()].filter((doc) => !keys.has(doc.key)).map((doc) => doc.id);
  if (removed.length > 0) {
    const { docs: deleted } = await payload.delete({
      collection: UI_STRINGS,
      where: { id: { in: removed } },
      overrideAccess: true,
      context: CONTEXT,
    });
    counts.deleted = deleted.length;
  }
  return counts;
}
