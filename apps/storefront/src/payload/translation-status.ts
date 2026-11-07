import type { Block, Field, PayloadRequest } from "payload";
import { fieldAffectsData, tabHasName, toWords } from "payload/shared";
import { DEFAULT_LOCALE } from "./locales";

// D107 (T89): which of a document's texts each open language has still to translate, computed from
// one read of the document in every language (`locale: "all"`, no fallback) when its form opens.

type Data = Record<string, unknown>;

/** A text a language has not translated: where it is in the form, and its name there. */
export type Missing = {
  /** The form's path to link to (`layout.0.heading`): the text itself, or the field that holds it. */
  path: string;
  /** The labels from the form's top to the text: `Layout › FAQ 1 › Heading`. */
  label: string;
};

export type LanguageState = "complete" | "partial" | "not-started";

export type LanguageStatus = {
  language: string;
  state: LanguageState;
  missing: Missing[];
};

export type TranslationStatus = {
  /** The localized texts English has filled: what a language translates. */
  texts: number;
  languages: LanguageStatus[];
};

/** The field types a language's own copy of English's content carries text in. */
const TEXT_TYPES: ReadonlySet<string> = new Set(["text", "textarea", "richText"]);

/** Lexical nodes that hold nothing of their own: their text is in their children. */
const LEXICAL_WRAPPERS: ReadonlySet<string> = new Set([
  "root",
  "paragraph",
  "text",
  "linebreak",
  "tab",
  "heading",
  "list",
  "listitem",
  "quote",
  "link",
  "autolink",
]);

/** Whether a Lexical node has content: some text, or a node of its own (an upload, a block, a rule). */
function lexicalHasContent(node: unknown): boolean {
  if (node === null || typeof node !== "object") return false;
  const { text, type, children } = node as { text?: unknown; type?: unknown; children?: unknown };
  if (typeof text === "string" && text.trim() !== "") return true;
  if (typeof type === "string" && !LEXICAL_WRAPPERS.has(type)) return true;
  return Array.isArray(children) && children.some(lexicalHasContent);
}

/**
 * Whether a value is filled in. Payload's fallback treats an empty text as none, and an editor's
 * emptied rich text (a root with an empty paragraph) shows nothing, so both count as empty.
 */
export function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    if ("root" in value) return lexicalHasContent((value as { root: unknown }).root);
    // A group (a localized one reads `{ heading: null }` in a language that has none of it).
    return Object.values(value).some(filled);
  }
  return true;
}

type Label = unknown;

/** A label as the form shows it: Payload's string, English from a translated one, else the name in words. */
function labelOf(label: Label, fallback: string): string {
  if (typeof label === "string" && label !== "") return label;
  if (label !== null && typeof label === "object") {
    const byLanguage = label as Record<string, unknown>;
    const text = byLanguage[DEFAULT_LOCALE] ?? Object.values(byLanguage)[0];
    if (typeof text === "string" && text !== "") return text;
  }
  return toWords(fallback);
}

const fieldLabel = (field: Field): string =>
  labelOf("label" in field ? field.label : undefined, "name" in field ? String(field.name) : "");

const blockLabel = (block: Block): string => labelOf(block.labels?.singular, block.slug);

const join = (path: string, name: string | number) =>
  path === "" ? String(name) : `${path}.${name}`;

const rowsOf = (value: unknown): Data[] =>
  Array.isArray(value)
    ? value.filter((row): row is Data => row !== null && typeof row === "object")
    : [];

type Walk = {
  /** The language whose texts are compared with English's. */
  language: string;
  /** The whole document, for the fields' conditions. */
  root: Data;
  /** The root config's blocks by slug, as a shared field holds them (their texts still `localized`). */
  sharedBlocks: ReadonlyMap<string, Block>;
  user: PayloadRequest["user"];
  texts: number;
  missing: Missing[];
};

/**
 * Inside a localized field (a group, an array or blocks): its English value, whose texts a language
 * without a value of its own reads (Payload's fallback). `link` is the localized field's path, the
 * nearest place a language without rows of its own can be sent to; `shared` says the fields come
 * from a shared block's config, so their `localized` says which are texts.
 */
type EnglishCopy = { link: string; shared: boolean; found: Missing[] };

/** Whether the form shows the field: hidden, disabled and read-only fields are not the editor's to translate. */
function shown(
  field: Field,
  sibling: Data,
  path: string,
  walk: Walk,
  blockData: Data | undefined,
): boolean {
  if ("hidden" in field && field.hidden === true) return false;
  const admin = field.admin as
    { hidden?: boolean; disabled?: boolean; readOnly?: boolean; condition?: unknown } | undefined;
  if (admin?.hidden === true || admin?.disabled === true || admin?.readOnly === true) return false;
  if (typeof admin?.condition !== "function") return true;
  try {
    const condition = admin.condition as NonNullable<
      NonNullable<Extract<Field, { name: string }>["admin"]>["condition"]
    >;
    // The conditions read the shared settings (a block's `variant`, a page's `layoutPerLanguage`),
    // which a read in every language gives as they are.
    return (
      condition(walk.root, sibling, {
        blockData: blockData ?? {},
        operation: "update",
        path: path === "" ? [] : path.split("."),
        user: walk.user,
      }) !== false
    );
  } catch {
    return true;
  }
}

function walkFields(
  fields: readonly Field[],
  sibling: Data,
  path: string,
  labels: string[],
  walk: Walk,
  copy: EnglishCopy | null,
  blockData?: Data,
): void {
  for (const field of fields) visit(field, sibling, path, labels, walk, copy, blockData);
}

function visit(
  field: Field,
  sibling: Data,
  path: string,
  labels: string[],
  walk: Walk,
  copy: EnglishCopy | null,
  blockData: Data | undefined,
): void {
  const name = "name" in field && typeof field.name === "string" ? field.name : undefined;
  if (!shown(field, sibling, name === undefined ? path : join(path, name), walk, blockData)) return;
  switch (field.type) {
    case "ui":
      return;
    case "row":
    case "collapsible":
      walkFields(field.fields, sibling, path, labels, walk, copy, blockData);
      return;
    case "tabs":
      for (const tab of field.tabs) {
        const tabLabels = [...labels, labelOf(tab.label, tabHasName(tab) ? tab.name : "")];
        if (!tabHasName(tab)) {
          walkFields(tab.fields, sibling, path, tabLabels, walk, copy, blockData);
          continue;
        }
        // A named tab holds its fields as a group does.
        visitData(
          { ...tab, type: "group", name: tab.name } as unknown as Field,
          tab.name,
          sibling,
          path,
          tabLabels,
          walk,
          copy,
          blockData,
        );
      }
      return;
    case "group":
      if (name === undefined) {
        walkFields(field.fields, sibling, path, labels, walk, copy, blockData);
        return;
      }
  }
  if (!fieldAffectsData(field) || name === undefined) return;
  visitData(field, name, sibling, path, [...labels, fieldLabel(field)], walk, copy, blockData);
}

/** The block a row is, from the field's own blocks or the root config's (`blockReferences`). */
function blockOf(field: Field, slug: unknown, walk: Walk): Block | undefined {
  if (typeof slug !== "string" || field.type !== "blocks") return undefined;
  const own = field.blocks.find((block) => block.slug === slug);
  if (own !== undefined) return own;
  const referenced = field.blockReferences?.find(
    (block) => (typeof block === "string" ? block : block.slug) === slug,
  );
  if (referenced === undefined) return undefined;
  return typeof referenced === "string" ? walk.sharedBlocks.get(referenced) : referenced;
}

function visitData(
  field: Field,
  name: string,
  sibling: Data,
  path: string,
  labels: string[],
  walk: Walk,
  copy: EnglishCopy | null,
  blockData: Data | undefined,
): void {
  const here = join(path, name);
  const value = sibling[name];
  const localized = "localized" in field && field.localized === true;
  const container = field.type === "group" || field.type === "array" || field.type === "blocks";
  if (!container) {
    if (copy !== null) {
      // A text of English's copy, which the language reads as it is.
      if ((localized || (!copy.shared && TEXT_TYPES.has(field.type))) && filled(value))
        copy.found.push({ path: copy.link, label: labels.join(" › ") });
      return;
    }
    if (!localized) return;
    const byLanguage = (value ?? {}) as Data;
    if (!filled(byLanguage[DEFAULT_LOCALE])) return;
    walk.texts += 1;
    if (!filled(byLanguage[walk.language]))
      walk.missing.push({ path: here, label: labels.join(" › ") });
    return;
  }
  if (localized && copy === null) {
    // D105's own layout per language and the other localized groups, arrays and blocks: a language
    // with rows of its own draws them, and they are its own texts; one without draws English's
    // (Payload's fallback), whose every text is then still to translate.
    const byLanguage = (value ?? {}) as Data;
    const english: EnglishCopy = { link: here, shared: false, found: [] };
    descend(field, byLanguage[DEFAULT_LOCALE], here, labels, walk, english, blockData);
    walk.texts += english.found.length;
    if (!filled(byLanguage[walk.language])) walk.missing.push(...english.found);
    return;
  }
  // Inside English's copy a localized field of a shared block is texts all through.
  const inner = copy !== null && localized ? { ...copy, shared: false } : copy;
  descend(field, value, here, labels, walk, inner, blockData);
}

function descend(
  field: Field,
  value: unknown,
  here: string,
  labels: string[],
  walk: Walk,
  copy: EnglishCopy | null,
  blockData: Data | undefined,
): void {
  switch (field.type) {
    case "group":
      if (value !== null && typeof value === "object")
        walkFields(field.fields, value as Data, here, labels, walk, copy, blockData);
      return;
    case "array":
      rowsOf(value).forEach((row, index) =>
        walkFields(
          field.fields,
          row,
          join(here, index),
          [...labels, String(index + 1)],
          walk,
          copy,
          blockData,
        ),
      );
      return;
    case "blocks":
      rowsOf(value).forEach((row, index) => {
        const slug = row["blockType"];
        // In English's copy of a layout per language, the shared block's config says which of the
        // copy's fields are texts: Payload takes `localized` off the fields of a localized field's
        // blocks, and `localizedLayout`'s are copies of the root blocks (T88).
        const shared =
          copy !== null && typeof slug === "string" ? walk.sharedBlocks.get(slug) : undefined;
        const block = shared ?? blockOf(field, slug, walk);
        if (block === undefined) return;
        walkFields(
          block.fields,
          row,
          join(here, index),
          [...labels, `${blockLabel(block)} ${index + 1}`],
          walk,
          copy === null ? null : { ...copy, shared: shared !== undefined },
          row,
        );
      });
      return;
    default:
      return;
  }
}

export type StatusInput = {
  /** The collection's or global's fields, as Payload sanitized them. */
  fields: readonly Field[];
  /** The document read in every language (`locale: "all"`) without the fallback. */
  doc: Data;
  /** The languages to report on, English left out. */
  languages: readonly string[];
  /** The root config's blocks (`payload.config.blocks`). */
  blocks?: readonly Block[];
  user?: PayloadRequest["user"];
};

/** What one language still has to translate, field by field, in the form's order. */
function walkLanguage(
  input: StatusInput,
  language: string,
  sharedBlocks: Map<string, Block>,
): Walk {
  const walk: Walk = {
    language,
    root: input.doc,
    sharedBlocks,
    user: input.user ?? null,
    texts: 0,
    missing: [],
  };
  walkFields(input.fields, input.doc, "", [], walk, null);
  return walk;
}

/**
 * D107: for each language, "complete" (it has every localized text English has filled), "partial"
 * (n to translate) or "not started" (none of them), with the texts it lacks. A text counts when
 * the form shows it: hidden, read-only and conditional fields whose condition is off are left out,
 * so a page with its own layout per language counts the layout each language draws
 * (`localizedLayout` while the switch is on, the shared `layout` while it is off), as `pageLayout`
 * does.
 */
export function translationStatus(input: StatusInput): TranslationStatus {
  const sharedBlocks = new Map((input.blocks ?? []).map((block) => [block.slug, block]));
  const languages = input.languages
    .filter((language) => language !== DEFAULT_LOCALE)
    .map((language) => {
      const { missing, texts } = walkLanguage(input, language, sharedBlocks);
      const state: LanguageState =
        missing.length === 0 ? "complete" : missing.length >= texts ? "not-started" : "partial";
      return { language, state, missing, texts };
    });
  const texts = languages[0]?.texts ?? walkLanguage(input, DEFAULT_LOCALE, sharedBlocks).texts;
  return {
    texts,
    languages: languages.map(({ language, state, missing }) => ({ language, state, missing })),
  };
}

/** The form's id of a field at `path` (Payload's `field-layout__0__heading`), for a link to it. */
export const fieldAnchor = (path: string): string => `field-${path.replace(/\./g, "__")}`;

/** The document a status is for: a page or a post, or a content global. */
export type TranslationTarget = { collection: "pages" | "posts" } | { global: string };

type Reader = Pick<PayloadRequest["payload"], "findByID" | "findGlobal" | "find">;

/** The read every count starts from: the latest version (the form's), in every language, no fallback. */
const EVERY_LANGUAGE = {
  locale: "all",
  fallbackLocale: false,
  draft: true,
  depth: 0,
} as const;

/**
 * The document in every language, as the signed-in editor may read it (`overrideAccess: false`):
 * one read, `locale: "all"` and `fallbackLocale: false`, so a language's own value is all it has
 * (with the fallback, an untranslated text would read as English's, and be counted as done).
 * `null` when there is nothing to read (a page not saved yet, or one the editor cannot read).
 */
export async function readEveryLanguage(
  payload: Reader,
  target: TranslationTarget,
  id: number | string | undefined,
  user: PayloadRequest["user"],
): Promise<Data | null> {
  if ("global" in target) {
    const doc = await payload.findGlobal({
      slug: target.global as never,
      ...EVERY_LANGUAGE,
      overrideAccess: false,
      user,
    });
    return (doc as Data | null) ?? null;
  }
  if (id === undefined || id === null || id === "") return null;
  const doc = await payload.findByID({
    collection: target.collection,
    id,
    ...EVERY_LANGUAGE,
    overrideAccess: false,
    user,
    disableErrors: true,
  });
  return (doc as Data | null) ?? null;
}

/**
 * The documents of a list page in every language, in one read (the list column, measured in T89):
 * `ids` are the page's rows, read as the signed-in editor, as the list itself is.
 */
export async function readManyInEveryLanguage(
  payload: Reader,
  collection: "pages" | "posts",
  ids: readonly (number | string)[],
  user: PayloadRequest["user"],
): Promise<Data[]> {
  if (ids.length === 0) return [];
  const { docs } = await payload.find({
    collection,
    where: { id: { in: [...ids] } },
    ...EVERY_LANGUAGE,
    limit: ids.length,
    pagination: false,
    overrideAccess: false,
    user,
  });
  return docs as unknown as Data[];
}

/**
 * Gathers the ids asked for in one turn of the event loop and reads them together: the list
 * view's cells are rendered side by side, each asking for its own row. One gatherer per list
 * render (`react`'s `cache` in the cell). A read that fails is reported once (`failed`) and gives
 * every row of its batch nothing, so the cells show "—" and the list stays usable (before T89 it
 * did not depend on this read).
 */
export function gatherReads(
  read: (ids: (number | string)[]) => Promise<Data[]>,
  failed: (error: unknown) => void,
): (id: number | string) => Promise<Data | undefined> {
  let open: { ids: Set<number | string>; docs: Promise<Data[]> } | null = null;
  return (id) => {
    if (open === null) {
      const batch: { ids: Set<number | string>; docs: Promise<Data[]> } = {
        ids: new Set(),
        docs: Promise.resolve([]),
      };
      batch.docs = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
        open = null;
        return read([...batch.ids]).catch((error: unknown) => {
          failed(error);
          return [];
        });
      });
      open = batch;
    }
    open.ids.add(id);
    return open.docs.then((docs) => docs.find((doc) => String(doc["id"]) === String(id)));
  };
}
