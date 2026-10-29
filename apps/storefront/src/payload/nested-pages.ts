import { createBreadcrumbsField, createParentField } from "@payloadcms/plugin-nested-docs";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  Field,
  PayloadRequest,
  Where,
} from "payload";
import { pagePath } from "../lib/cms/page-path";
import { LANGUAGES } from "./locales";

// D80: a page's `parent` and `breadcrumbs`, the fields of `@payloadcms/plugin-nested-docs`. The
// plugin's own hooks are not used: they re-save a page's children only in the language being
// edited, and they save each child with the whole document read in that language, so a child not
// yet translated gets English's title, slug and texts written into the other language (and its
// English breadcrumb rows, which the database then refuses as duplicates). These hooks work out the
// breadcrumbs in every language from the slugs as each language reads them (its own, or English's
// where it has none) and save nothing but the breadcrumbs.

/** Pages nest at most this deep; a deeper chain (or a loop) stops here instead of running on. */
const MAX_DEPTH = 10;

/** Set on the saves these hooks make themselves, so they do not start another round. */
const RESAVING = "resavingBreadcrumbs";

type Id = number | string;
type PageRef = { id?: Id; slug?: unknown; title?: unknown; parent?: unknown };
type Breadcrumb = { doc?: Id; url?: string; label: string };

const idOf = (value: unknown): Id | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return (value as { id?: Id }).id ?? null;
  return value as Id;
};

/**
 * Runs Local API calls that pass `req` and puts back what they change on it: Payload sets
 * `req.locale`, `req.fallbackLocale` and `req.context` to the call's, so without this the hooks of
 * the save in progress would run in another language after the first call.
 */
async function keepingRequest<T>(req: PayloadRequest, run: () => Promise<T>): Promise<T> {
  const { locale, fallbackLocale, context } = req;
  try {
    return await run();
  } finally {
    req.locale = locale;
    req.fallbackLocale = fallbackLocale;
    req.context = context;
  }
}

/** A page's slug, title and parent as `req.locale` reads them, with English where it has none. */
const readPage = (req: PayloadRequest, id: Id): Promise<PageRef | null> =>
  keepingRequest(req, () =>
    req.payload.findByID({
      collection: "pages",
      id,
      depth: 0,
      select: { slug: true, title: true, parent: true },
      disableErrors: true,
      overrideAccess: true,
      req,
    }),
  ) as Promise<PageRef | null>;

/** The breadcrumbs of a page: its parents' (top level first) and its own, in `req.locale`. */
export async function breadcrumbsOf(req: PayloadRequest, page: PageRef): Promise<Breadcrumb[]> {
  const chain: PageRef[] = [page];
  const seen = new Set<Id>(page.id === undefined ? [] : [page.id]);
  let parent = idOf(page.parent);
  while (parent !== null && !seen.has(parent) && chain.length < MAX_DEPTH) {
    seen.add(parent);
    const doc = await readPage(req, parent);
    if (doc === null) break;
    chain.unshift(doc);
    parent = idOf(doc.parent);
  }
  return chain.map((doc, index) => {
    const url = pagePath(chain.slice(0, index + 1).map((each) => each.slug));
    return {
      ...(doc.id === undefined ? {} : { doc: doc.id }),
      ...(url === null ? {} : { url }),
      label: typeof doc.title === "string" ? doc.title : "",
    };
  });
}

/**
 * `beforeChange`: the page's breadcrumbs in the language being saved. A save that leaves out the
 * slug or title (the re-saves below) takes them as that language reads them, English's where the
 * page has none of its own. A save in every language at once (`locale: "all"`) is left alone: the
 * re-save that follows a publish writes each language's.
 */
export const populateBreadcrumbs: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!LANGUAGES.includes(req.locale ?? "")) return data;
  const id = (originalDoc as PageRef | undefined)?.id;
  const stored = id === undefined ? null : await readPage(req, id);
  const page: PageRef = {
    id,
    slug: data["slug"] || stored?.slug,
    title: data["title"] || stored?.title,
    parent: "parent" in data ? data["parent"] : (originalDoc as PageRef | undefined)?.parent,
  };
  return { ...data, breadcrumbs: await breadcrumbsOf(req, page) };
};

/** Saves a page again in one language with no changes, so `populateBreadcrumbs` rewrites them. */
const resave = (req: PayloadRequest, id: Id, locale: string) =>
  keepingRequest(req, () =>
    req.payload.update({
      collection: "pages",
      id,
      data: {},
      locale: locale as never,
      depth: 0,
      draft: false,
      overrideAccess: true,
      context: { [RESAVING]: true },
      req,
    }),
  );

type Saved = { id: Id; published: boolean; languages: string[] };

/** The languages a page has a slug of its own in (`locale: "all"`'s `{ en: "about", el: … }`). */
const ownLanguages = (slug: unknown): string[] => {
  const slugs = (typeof slug === "object" && slug !== null ? slug : {}) as Record<string, unknown>;
  return LANGUAGES.filter((language) => Boolean(slugs[language]));
};

/**
 * Pages' latest versions in every language: whether each is published (`false`: an editor's draft
 * is newer, or it never was published) and the languages it has a slug of its own in.
 */
async function latest(req: PayloadRequest, where: Where): Promise<Saved[]> {
  const { docs } = await keepingRequest(req, () =>
    req.payload.find({
      collection: "pages",
      where,
      locale: "all",
      draft: true,
      depth: 0,
      select: { _status: true, slug: true },
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  );
  return docs.map((doc) => ({
    id: doc.id,
    published: doc._status === "published",
    languages: ownLanguages(doc.slug),
  }));
}

/** The pages under `id`, at every depth, parents before their children. */
async function descendants(req: PayloadRequest, id: Id): Promise<Saved[]> {
  const found: Saved[] = [];
  const seen = new Set<Id>([id]);
  let level: Id[] = [id];
  for (let depth = 0; level.length > 0 && depth < MAX_DEPTH; depth++) {
    const children = await latest(req, { parent: { in: level } });
    level = [];
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      found.push(child);
      level.push(child.id);
    }
  }
  return found;
}

/**
 * `afterChange` (T65 step 1): when a page is published new, moved or given a new slug, it is saved
 * again in its other languages, and the pages under it in all of theirs, so each language's
 * breadcrumbs follow (a new English slug changes the address in every language that reads it).
 *
 * - **Its languages:** those a page has its own slug in. Payload checks a save against the page's
 *   required title and slug in the language saved, so a page cannot be saved in a language it has
 *   not been translated into; there it reads English's breadcrumbs. The shop's addresses do not
 *   come from breadcrumbs (`lib/cms/pages.ts` works them out from the slugs in each language).
 * - **Not saved:** a page under it whose latest version is an editor's draft, since a save now would
 *   publish that draft; its own publish runs this again. Drafts start nothing: their breadcrumbs
 *   follow when they are published.
 */
export const resaveInEveryLanguage: CollectionAfterChangeHook = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (context[RESAVING] === true || doc._status !== "published") return doc;
  const changed =
    operation === "create" ||
    previousDoc?._status !== "published" ||
    previousDoc?.slug !== doc.slug ||
    idOf(previousDoc?.parent) !== idOf(doc.parent);
  if (!changed) return doc;
  const [self] = await latest(req, { id: { equals: doc.id } });
  // On create the page's own breadcrumb has no id yet, so it is saved again in this language too.
  for (const language of self?.languages ?? []) {
    if (operation === "create" || language !== req.locale) await resave(req, doc.id, language);
  }
  for (const page of await descendants(req, doc.id)) {
    if (!page.published) continue;
    for (const language of page.languages) await resave(req, page.id, language);
  }
  return doc;
};

/** `parent` and `breadcrumbs` (D80): a page cannot be its own parent or one of its children's. */
export function nestedPageFields(): Field[] {
  return [
    createParentField("pages", {
      filterOptions: ({ id }) =>
        id ? { id: { not_equals: id }, "breadcrumbs.doc": { not_in: [id] } } : true,
    }),
    createBreadcrumbsField("pages"),
  ];
}
