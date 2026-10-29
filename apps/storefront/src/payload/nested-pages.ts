import { createBreadcrumbsField, createParentField } from "@payloadcms/plugin-nested-docs";
import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type Field,
  type PayloadRequest,
  type RelationshipFieldSingleValidation,
  type Where,
} from "payload";
import { relationship } from "payload/shared";
import { MAX_PAGE_DEPTH, pageIdOf, pagePath } from "../lib/cms/page-path";
import { siblingSlugTaken, slugProblem } from "./fields/slug";
import { keepingRequest } from "./keeping-request";
import { LANGUAGES, languageLabel } from "./locales";

// D80: a page's `parent` and `breadcrumbs`, the fields of `@payloadcms/plugin-nested-docs`. The
// plugin's own hooks are not used: they re-save a page's children only in the language being
// edited, and they save each child with the whole document read in that language, so a child not
// yet translated gets English's title, slug and texts written into the other language (and its
// English breadcrumb rows, which the database then refuses as duplicates). These hooks work out the
// breadcrumbs in every language from the slugs as each language reads them (its own, or English's
// where it has none) and save nothing but the breadcrumbs.

/** Set on the saves these hooks make themselves, so they do not start another round. */
const RESAVING = "resavingBreadcrumbs";

type Id = number;
type PageRef = { id?: Id; slug?: unknown; title?: unknown; parent?: unknown };
type Breadcrumb = { doc?: Id; url?: string; label: string };

const idOf = pageIdOf;

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
  while (parent !== null && !seen.has(parent) && chain.length < MAX_PAGE_DEPTH) {
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
  for (let depth = 0; level.length > 0 && depth < MAX_PAGE_DEPTH; depth++) {
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

/** A page's parent's id, as the published pages (`draft: false`) or the latest versions read it. */
async function parentOf(req: PayloadRequest, id: Id, draft: boolean): Promise<Id | null> {
  const doc = (await keepingRequest(req, () =>
    req.payload.findByID({
      collection: "pages",
      id,
      draft,
      depth: 0,
      select: { parent: true },
      disableErrors: true,
      overrideAccess: true,
      req,
    }),
  )) as PageRef | null;
  return idOf(doc?.parent);
}

/**
 * How many pages deep `parent` sits (1 at the top level), or `null` when its chain comes back to
 * `id` (the page would be under itself) or is a loop already. Both ways of reading the pages count,
 * the published ones and the latest versions, since either can be published next.
 */
async function depthUnder(req: PayloadRequest, parent: Id, id: Id | undefined) {
  let deepest = 0;
  for (const draft of [false, true]) {
    const seen = new Set<Id>();
    let current: Id | null = parent;
    while (current !== null) {
      if (current === id || seen.has(current)) return null;
      seen.add(current);
      if (seen.size > MAX_PAGE_DEPTH) break;
      current = await parentOf(req, current, draft);
    }
    deepest = Math.max(deepest, seen.size);
  }
  return deepest;
}

/** How many levels of pages sit under `id` (0 for none), at most `MAX_PAGE_DEPTH`. */
async function levelsUnder(req: PayloadRequest, id: Id): Promise<number> {
  const seen = new Set<Id>([id]);
  let level: Id[] = [id];
  let levels = 0;
  while (levels < MAX_PAGE_DEPTH) {
    const children = (await latest(req, { parent: { in: level } })).filter(
      (child) => !seen.has(child.id),
    );
    if (children.length === 0) break;
    for (const child of children) seen.add(child.id);
    level = children.map((child) => child.id);
    levels++;
  }
  return levels;
}

/**
 * A move's slugs in the languages other than the one being saved (PR 98 review, item 3): `parent`
 * is the same in every language, so a page moved to the top level, or under another page, takes
 * each of its slugs there. The slug being saved is `validateSlug`'s; this checks the page's own
 * slugs in its other languages the same way (a market's or a route's segment at the top level, a
 * sibling with the same slug), and names the language.
 */
async function otherLanguagesProblem(
  req: PayloadRequest,
  id: Id,
  parent: Id | null,
): Promise<string | null> {
  const { docs } = await keepingRequest(req, () =>
    req.payload.find({
      collection: "pages",
      where: { id: { equals: id } },
      locale: "all",
      draft: true,
      depth: 0,
      select: { slug: true },
      limit: 1,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  );
  const slugs = (docs[0]?.slug ?? {}) as unknown as Record<string, unknown>;
  for (const language of ownLanguages(slugs)) {
    if (language === req.locale) continue;
    const slug = slugs[language] as string;
    const problem = slugProblem(slug, { topLevel: parent === null });
    const name = `${languageLabel(language)} (${language})`;
    const where = `In ${name}, the slug "${slug}"`;
    if (problem !== null) return `${where} cannot go here. ${problem}`;
    if (await keepingRequest(req, () => siblingSlugTaken(req, { slug, parent, id, language })))
      return `${where} is another page's here already. Change it in ${name} first.`;
  }
  return null;
}

/**
 * The `parent` field's check (D80): Payload's own first (an existing page, the picker's
 * `filterOptions`), then, once the editor saves (not while typing), that the page is not put under
 * itself or one of its own pages, that it and the pages under it stay within `MAX_PAGE_DEPTH`
 * (PR 98 review, item 5; the picker's filter does not stop either), and, when the page moves, that
 * its slugs in its other languages may stand under the new parent (item 3). Payload checks a
 * publish, not a draft's save: a move saved as a draft is checked when it is published.
 */
export const validateParent: RelationshipFieldSingleValidation = async (value, options) => {
  const base = await relationship(value, options);
  const { req } = options;
  // The re-saves below change no parent.
  if (base !== true || options.event === "onChange" || req.context[RESAVING] === true) return base;
  const id = pageIdOf(options.id);
  const parent = pageIdOf(value);
  if (parent !== null) {
    const depth = await depthUnder(req, parent, id ?? undefined);
    if (depth === null) return "A page cannot go under itself or one of the pages under it.";
    const below = id === null ? 0 : await levelsUnder(req, id);
    if (depth + 1 + below > MAX_PAGE_DEPTH)
      return `Pages nest at most ${MAX_PAGE_DEPTH} deep: under this parent, ${below === 0 ? "this page" : "the pages under this one"} would go deeper.`;
  }
  // Against the latest version (`previousValue`) and the published page: a move saved as a draft
  // is checked when it is published.
  const moved =
    id !== null &&
    (pageIdOf(options.previousValue) !== parent || (await parentOf(req, id, false)) !== parent);
  const problem = moved ? await otherLanguagesProblem(req, id, parent) : null;
  return problem ?? true;
};

/**
 * `beforeDelete` (PR 98 review, item 2): a page with pages under it is not deleted. The database
 * would empty their `parent`, so they would move to the top level with no check of their slugs
 * (`/cart`, `/us`, a slug another page has there) and stale breadcrumbs. The editor moves or deletes
 * them first, on purpose.
 */
export const keepPageWithChildren: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const page = pageIdOf(id);
  if (page === null) return;
  const where: Where = { parent: { equals: page } };
  // The published pages and the latest versions: a draft can name the page as its parent too.
  const [published, latestVersions] = await Promise.all([
    keepingRequest(req, () =>
      req.payload.find({
        collection: "pages",
        where,
        depth: 0,
        select: { _status: true },
        limit: 0,
        pagination: false,
        overrideAccess: true,
        req,
      }),
    ),
    latest(req, where),
  ]);
  const under = new Set<Id>([
    ...published.docs.map((doc) => doc.id),
    ...latestVersions.map((doc) => doc.id),
  ]);
  if (under.size === 0) return;
  // With `data`, so a production build shows the message (see `users.ts`).
  throw new APIError(
    `This page has ${under.size === 1 ? "a page" : `${under.size} pages`} under it: move ${under.size === 1 ? "it" : "them"} to another parent, or delete ${under.size === 1 ? "it" : "them"}, first.`,
    400,
    {},
  );
};

/**
 * `parent` and `breadcrumbs` (D80). The picker leaves out the page itself and the pages whose
 * breadcrumbs name it, a convenience: `validateParent` is the guard.
 */
export function nestedPageFields(): Field[] {
  return [
    createParentField("pages", {
      filterOptions: ({ id }) =>
        id ? { id: { not_equals: id }, "breadcrumbs.doc": { not_in: [id] } } : true,
      validate: validateParent,
    }),
    createBreadcrumbsField("pages"),
  ];
}
