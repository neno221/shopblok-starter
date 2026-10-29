import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionSlug,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  GlobalAfterChangeHook,
  GlobalBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { hasDraftsEnabled } from "payload/shared";
import { LANGUAGES } from "../locales";

/** What Next's `revalidateTag` throws when it is called outside a Next request. */
export const OUTSIDE_NEXT = "static generation store missing";

/**
 * `req.context` key: for each document saved in this request (`<slug>:<id>`, or the global's
 * slug), whether the row visitors read was published before the save. A bulk update runs its
 * documents on one shared `req`, so this is a record, not one flag.
 */
const PUBLISHED_BEFORE = "publishedBeforeSave";
type PublishedBefore = Record<string, boolean>;

type Doc = Record<string, unknown> | null | undefined;

/**
 * The tags a change revalidates, for one language. Called for every language Payload has (see
 * `revalidateOnPublish`), with the document as saved and as it was, so a tag that names the
 * document (`cms:product:<handle>`) is revalidated under its old name as well as its new one.
 */
export type TagsFor = (locale: string, doc: Record<string, unknown>) => readonly string[];

export type RevalidateOnPublishOptions = { tags: TagsFor };

const isPublished = (doc: Doc) => doc?.["_status"] === "published";

function tagsOf(tags: TagsFor, docs: readonly Doc[]): string[] {
  const all = new Set<string>();
  for (const doc of docs) {
    if (doc == null) continue;
    for (const locale of LANGUAGES) for (const tag of tags(locale, doc)) all.add(tag);
  }
  return [...all];
}

function revalidate(req: PayloadRequest, entity: string, tags: readonly string[]): void {
  try {
    for (const tag of tags) revalidateTag(tag, "max");
  } catch (error) {
    if (String(error).includes(OUTSIDE_NEXT)) {
      // A script (no Next request, so no cache to refresh here): the running site keeps serving
      // the old content until each entry's `revalidate`. A seed sets `disableRevalidate` instead.
      req.payload.logger.warn(
        `${entity}: changed outside a Next request, so pages tagged ${tags.join(", ")} stay as they are until their revalidate`,
      );
    } else {
      req.payload.logger.warn(
        { err: error },
        `${entity}: revalidateTag failed, so cached pages may be stale`,
      );
    }
  }
}

const disabled = (req: PayloadRequest) => Boolean(req.context?.["disableRevalidate"]);

function remember(req: PayloadRequest, key: string, published: boolean): void {
  const before = (req.context[PUBLISHED_BEFORE] ??= {}) as PublishedBefore;
  before[key] = published;
}

const wasPublished = (req: PayloadRequest, key: string) =>
  (req.context?.[PUBLISHED_BEFORE] as PublishedBefore | undefined)?.[key] === true;

/**
 * Does a save with drafts on change what visitors read? Payload hands `afterChange` no draft flag
 * in 3.92.1 (the arguments are `collection`/`global`, `context`, `data`, `doc`, `operation`,
 * `overrideAccess`, `previousDoc` and `req`), and `req.query.draft` exists only for a REST call.
 * What tells the cases apart is the row: `updateDocument` (and the global's `update`) writes it only
 * when the save is not a draft, so a draft save, autosave included, leaves it as it was.
 *
 * - The saved document is published: a publish, or an edit of the published text. Changes it.
 * - It is a draft, and the row was published before: either a draft saved over the published
 *   text (the row is still published afterwards: nothing changed) or an unpublish (the row is a
 *   draft now: changes it). One read of the row's status after the save tells which.
 * - It is a draft and the row was not published: nothing visitors read.
 *
 * `previousDoc` is no help: Payload passes the newest *version*, which is a draft whenever one was
 * saved over the published text.
 */
async function changesPublished(
  req: PayloadRequest,
  key: string,
  doc: Doc,
  readRowStatus: () => Promise<unknown>,
): Promise<boolean> {
  if (isPublished(doc)) return true;
  if (!wasPublished(req, key)) return false;
  return (await readRowStatus()) !== "published";
}

/**
 * The hooks that keep the storefront's cached content reads fresh (D73, ADR 0001): a change to a
 * published document revalidates the kind's tags in **every** language Payload has. Payload
 * publishes every language at once but tells the hook only the one being edited (`req.locale`),
 * and English is every language's fallback, so a narrower set would leave other markets stale.
 * `'max'` is stale-while-revalidate: the first request after a save may still show the old text
 * and starts the refresh, and the next one shows the new.
 *
 * - **Revalidates:** a publish; an edit of a published document; an unpublish, also over a newer
 *   draft; the delete of a published document. A collection or global without drafts revalidates
 *   on every change.
 * - **Does not:** a draft that was never published; a draft save or autosave over the published
 *   text (`changesPublished`); anything while `req.context.disableRevalidate` is set (a seed or an
 *   import, which revalidate once at the end if they need to).
 * - `revalidateTag` works inside a Next request (Payload's REST handler, where the admin saves, and
 *   `/api/payload-jobs/run`, where a scheduled publish runs) and throws elsewhere (a Payload
 *   script). The call is wrapped, because a save from a script must not fail for lack of a cache to
 *   refresh; it logs a warning naming the tags, since those pages stay stale until their
 *   `revalidate`. Any other failure is logged the same way.
 */
export function revalidateOnPublish({ tags }: RevalidateOnPublishOptions): {
  beforeChange: CollectionBeforeChangeHook[];
  afterChange: CollectionAfterChangeHook[];
  afterDelete: CollectionAfterDeleteHook[];
} {
  const rowStatus =
    (req: PayloadRequest, collection: CollectionSlug, id: number | string) => async () => {
      const row = await req.payload.db.findOne<{ id: number | string; _status?: string }>({
        collection,
        where: { id: { equals: id } },
        select: { _status: true },
        req,
      });
      return row?._status;
    };

  const beforeChange: CollectionBeforeChangeHook = async ({
    collection,
    data,
    operation,
    originalDoc,
    req,
  }) => {
    const id = originalDoc?.id;
    if (operation !== "update" || id == null || disabled(req) || !hasDraftsEnabled(collection)) {
      return data;
    }
    const status = await rowStatus(req, collection.slug, id)();
    remember(req, `${collection.slug}:${String(id)}`, status === "published");
    return data;
  };

  const afterChange: CollectionAfterChangeHook = async ({ collection, doc, previousDoc, req }) => {
    if (disabled(req)) return doc;
    const changed =
      !hasDraftsEnabled(collection) ||
      (await changesPublished(
        req,
        `${collection.slug}:${String(doc?.id)}`,
        doc,
        rowStatus(req, collection.slug, doc?.id),
      ));
    if (changed) revalidate(req, collection.slug, tagsOf(tags, [doc, previousDoc]));
    return doc;
  };

  // The row is what is deleted, so its `_status` is what visitors could read.
  const afterDelete: CollectionAfterDeleteHook = ({ collection, doc, req }) => {
    if (!disabled(req) && (!hasDraftsEnabled(collection) || isPublished(doc))) {
      revalidate(req, collection.slug, tagsOf(tags, [doc]));
    }
    return doc;
  };

  return { beforeChange: [beforeChange], afterChange: [afterChange], afterDelete: [afterDelete] };
}

/** `revalidateOnPublish` for a global: the same rules, with the global's one row. */
export function revalidateGlobalOnPublish({ tags }: RevalidateOnPublishOptions): {
  beforeChange: GlobalBeforeChangeHook[];
  afterChange: GlobalAfterChangeHook[];
} {
  const rowStatus = (req: PayloadRequest, slug: string) => async () => {
    const row = await req.payload.db.findGlobal<{ _status?: string }>({
      slug,
      select: { _status: true },
      req,
    });
    return row?._status;
  };

  const beforeChange: GlobalBeforeChangeHook = async ({ data, global, req }) => {
    if (disabled(req) || !hasDraftsEnabled(global)) return data;
    remember(req, global.slug, (await rowStatus(req, global.slug)()) === "published");
    return data;
  };

  const afterChange: GlobalAfterChangeHook = async ({ doc, global, previousDoc, req }) => {
    if (disabled(req)) return doc;
    const changed =
      !hasDraftsEnabled(global) ||
      (await changesPublished(req, global.slug, doc, rowStatus(req, global.slug)));
    if (changed) revalidate(req, global.slug, tagsOf(tags, [doc, previousDoc]));
    return doc;
  };

  return { beforeChange: [beforeChange], afterChange: [afterChange] };
}

export type RevalidateWhenChangedOptions = {
  /** The fields other entries copy from the document; a change to any of them revalidates. */
  fields: readonly string[];
  /** The tags of the entries that copy them, for one language. */
  tags: (locale: string) => readonly string[];
};

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * For a document that other cached reads embed rather than read themselves (PR 94 review, item 2):
 * the content globals populate a catalog document's `handle` and `deletedInMedusa` and an upload's
 * file, so a product renamed or deleted in Medusa, or a picture replaced, has to refresh them, or
 * the header links to a page that no longer exists until the entry's `revalidate`. Revalidates
 * `tags` in every language when an update changes one of `fields`, and on a delete; a create
 * changes nothing anyone has cached. The sync writes through Payload's REST API, inside a Next
 * request, so `revalidateTag` works there; bootstrap's import sets `disableRevalidate`.
 */
export function revalidateWhenChanged({ fields, tags }: RevalidateWhenChangedOptions): {
  afterChange: CollectionAfterChangeHook[];
  afterDelete: CollectionAfterDeleteHook[];
} {
  const every = () => [...new Set(LANGUAGES.flatMap((locale) => tags(locale)))];

  const afterChange: CollectionAfterChangeHook = ({
    collection,
    doc,
    operation,
    previousDoc,
    req,
  }) => {
    if (disabled(req) || operation !== "update") return doc;
    const docs = [doc, previousDoc] as Doc[];
    if (fields.some((field) => !sameValue(docs[0]?.[field], docs[1]?.[field]))) {
      revalidate(req, collection.slug, every());
    }
    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook = ({ collection, doc, req }) => {
    if (!disabled(req)) revalidate(req, collection.slug, every());
    return doc;
  };

  return { afterChange: [afterChange], afterDelete: [afterDelete] };
}
