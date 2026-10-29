import { beforeEach, describe, expect, it, vi } from "vitest";
import { LANGUAGES } from "../locales";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import {
  revalidateGlobalOnPublish,
  revalidateOnPublish,
  revalidateWhenChanged,
} from "./revalidate-on-publish";

const warn = vi.fn();
const findOne = vi.fn();
const findGlobal = vi.fn();

const pageTags = (locale: string) => [`pages:${locale}`, "payload:pages"];
const hooks = revalidateOnPublish({ tags: pageTags });
const [beforeChange] = hooks.beforeChange;
const [afterChange] = hooks.afterChange;
const [afterDelete] = hooks.afterDelete;

type BeforeArgs = Parameters<NonNullable<typeof beforeChange>>[0];
type AfterArgs = Parameters<NonNullable<typeof afterChange>>[0];
type DeleteArgs = Parameters<NonNullable<typeof afterDelete>>[0];

type Entity = { slug: string; versions: false | { drafts: { autosave: boolean } } };
const PAGES: Entity = { slug: "pages", versions: { drafts: { autosave: true } } };
const NO_DRAFTS: Entity = { slug: "media", versions: false };

const request = (locale = "en", context: Record<string, unknown> = {}) => ({
  locale,
  context,
  payload: { logger: { warn }, db: { findOne, findGlobal } },
});
type Req = ReturnType<typeof request>;

/** Every language's `pages:<locale>`, then the shared tag: what a change to a page revalidates. */
const EVERY_PAGE_TAG = [...LANGUAGES.map((locale) => `pages:${locale}`), "payload:pages"].sort();
/** The tags revalidated so far, sorted (the order carries no meaning). */
const revalidated = () => revalidateTag.mock.calls.map(([tag]) => tag as string).sort();

/**
 * One save as Payload runs it: `beforeChange` with the row as it was, then `afterChange`, which
 * reads the row again only when it needs to (`rowAfter`, what the save left there).
 */
async function save(args: {
  id?: number;
  rowBefore?: string;
  rowAfter?: string;
  doc: { _status?: string; handle?: string };
  previousDoc?: { _status?: string; handle?: string };
  req?: Req;
  collection?: object;
}) {
  const { id = 7, rowBefore, rowAfter, previousDoc, collection = PAGES } = args;
  const req = args.req ?? request();
  const doc = { id, ...args.doc };
  const operation = rowBefore === undefined ? "create" : "update";
  if (rowBefore !== undefined) findOne.mockResolvedValueOnce({ id, _status: rowBefore });
  if (rowAfter !== undefined) findOne.mockResolvedValueOnce({ id, _status: rowAfter });
  await beforeChange?.({
    collection,
    data: doc,
    operation,
    originalDoc: rowBefore === undefined ? undefined : { id },
    req,
  } as unknown as BeforeArgs);
  return afterChange?.({
    collection,
    doc,
    operation,
    previousDoc: previousDoc ?? {},
    req,
  } as unknown as AfterArgs);
}

beforeEach(() => {
  revalidateTag.mockReset();
  warn.mockReset();
  findOne.mockReset();
  findGlobal.mockReset();
});

describe("revalidateOnPublish: what revalidates", () => {
  it("revalidates every language's tag and the shared tag, stale-while-revalidate, on a publish", async () => {
    await save({ rowBefore: "draft", doc: { _status: "published" }, req: request("en") });
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
    expect(revalidateTag.mock.calls.every(([, profile]) => profile === "max")).toBe(true);
  });

  it("revalidates Greek on an English publish and English on a Greek one (Payload names only the editing language)", async () => {
    await save({ rowBefore: "draft", doc: { _status: "published" }, req: request("en") });
    expect(revalidated()).toContain("pages:el");
    revalidateTag.mockReset();
    await save({ rowBefore: "draft", doc: { _status: "published" }, req: request("el") });
    expect(revalidated()).toContain("pages:en");
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
  });

  it("revalidates a page published on create, and an edit of a published page", async () => {
    await save({ doc: { _status: "published" } });
    expect(revalidateTag).toHaveBeenCalled();
    revalidateTag.mockReset();
    await save({ rowBefore: "published", doc: { _status: "published" } });
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
  });

  it("revalidates an unpublish: the row was published and the save left it a draft", async () => {
    await save({
      rowBefore: "published",
      rowAfter: "draft",
      doc: { _status: "draft" },
      previousDoc: { _status: "published" },
    });
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
  });

  it("revalidates an unpublish over a newer draft, though both versions Payload hands over read `draft`", async () => {
    await save({
      rowBefore: "published",
      rowAfter: "draft",
      doc: { _status: "draft" },
      previousDoc: { _status: "draft" },
    });
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
  });

  it("revalidates a collection without drafts on every change", async () => {
    await save({ rowBefore: "", doc: {}, collection: NO_DRAFTS });
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("revalidates the tags of the document as it was as well as it is (a tag that names it)", async () => {
    const byHandle = revalidateOnPublish({
      tags: (locale, doc) => [`cms:product:${String(doc["handle"])}`, `products:${locale}`],
    });
    await byHandle.afterChange[0]?.({
      collection: PAGES,
      doc: { id: 1, _status: "published", handle: "new" },
      operation: "update",
      previousDoc: { id: 1, _status: "published", handle: "old" },
      req: request(),
    } as unknown as AfterArgs);
    expect(revalidated()).toContain("cms:product:new");
    expect(revalidated()).toContain("cms:product:old");
  });
});

describe("revalidateOnPublish: what does not", () => {
  it("revalidates nothing for a draft save over a published page: the row is still published", async () => {
    await save({
      rowBefore: "published",
      rowAfter: "published",
      doc: { _status: "draft" },
      previousDoc: { _status: "published" },
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates nothing for an autosave over a published page with an older draft", async () => {
    await save({
      rowBefore: "published",
      rowAfter: "published",
      doc: { _status: "draft" },
      previousDoc: { _status: "draft" },
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("reads the row after the save only for a draft over a published row", async () => {
    await save({ rowBefore: "draft", doc: { _status: "draft" } });
    await save({ rowBefore: "published", doc: { _status: "published" } });
    expect(findOne).toHaveBeenCalledTimes(2);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        where: { id: { equals: 7 } },
        select: { _status: true },
      }),
    );
  });

  it("revalidates nothing for a draft that was never published, saved or created", async () => {
    await save({ rowBefore: "draft", doc: { _status: "draft" } });
    await save({ doc: { _status: "draft" } });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("does not take another page's published state for this one's (a bulk update shares a req)", async () => {
    const req = request();
    findOne.mockResolvedValueOnce({ id: 7, _status: "published" });
    await beforeChange?.({
      collection: PAGES,
      data: {},
      operation: "update",
      originalDoc: { id: 7 },
      req,
    } as unknown as BeforeArgs);
    await save({ id: 8, rowBefore: "draft", doc: { _status: "draft" }, req });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("does nothing, and reads nothing, when the caller sets context.disableRevalidate", async () => {
    const req = request("en", { disableRevalidate: true });
    await beforeChange?.({
      collection: PAGES,
      data: {},
      operation: "update",
      originalDoc: { id: 7 },
      req,
    } as unknown as BeforeArgs);
    await afterChange?.({
      collection: PAGES,
      doc: { id: 7, _status: "published" },
      operation: "update",
      previousDoc: {},
      req,
    } as unknown as AfterArgs);
    expect(findOne).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("revalidateOnPublish: outside Next and on failure", () => {
  it("does not fail the save outside a Next request, and warns naming the tags that stay stale", async () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("Invariant: static generation store missing");
    });
    const result = await save({ rowBefore: "published", doc: { _status: "published" } });
    expect(result).toEqual({ id: 7, _status: "published" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("outside a Next request"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("pages:el"));
  });

  it("warns, and still does not fail the save, when revalidateTag throws inside Next", async () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("Route /api/pages used revalidateTag during render");
    });
    await save({ rowBefore: "published", doc: { _status: "published" } });
    expect(warn).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      expect.stringContaining("may be stale"),
    );
  });

  it("says nothing outside Next for a draft save, which changes no page", async () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("Invariant: static generation store missing");
    });
    await save({ rowBefore: "published", rowAfter: "published", doc: { _status: "draft" } });
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns the document it was given", async () => {
    const doc = { id: 3, _status: "published" };
    const result = await afterChange?.({
      collection: PAGES,
      doc,
      operation: "create",
      previousDoc: {},
      req: request(),
    } as unknown as AfterArgs);
    expect(result).toBe(doc);
  });
});

describe("revalidateOnPublish: delete", () => {
  const remove = (doc: { _status?: string }, context: Record<string, unknown> = {}, c = PAGES) =>
    afterDelete?.({
      collection: c,
      doc,
      id: 7,
      req: request("el", context),
    } as unknown as DeleteArgs);

  it("revalidates every language when a published page is deleted", () => {
    const doc = { _status: "published" };
    expect(remove(doc)).toBe(doc);
    expect(revalidated()).toEqual(EVERY_PAGE_TAG);
  });

  it("revalidates nothing for a draft, or when the caller sets context.disableRevalidate", () => {
    remove({ _status: "draft" });
    remove({ _status: "published" }, { disableRevalidate: true });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates any delete in a collection without drafts", () => {
    remove({}, {}, NO_DRAFTS);
    expect(revalidateTag).toHaveBeenCalled();
  });
});

describe("revalidateGlobalOnPublish", () => {
  const global = { slug: "header", versions: { drafts: { autosave: true } } };
  const g = revalidateGlobalOnPublish({ tags: (locale) => [`global:header:${locale}`] });
  type GBefore = Parameters<NonNullable<(typeof g.beforeChange)[0]>>[0];
  type GAfter = Parameters<NonNullable<(typeof g.afterChange)[0]>>[0];

  async function saveGlobal(rowBefore: string, doc: { _status: string }, rowAfter?: string) {
    const req = request();
    findGlobal.mockResolvedValueOnce({ _status: rowBefore });
    if (rowAfter !== undefined) findGlobal.mockResolvedValueOnce({ _status: rowAfter });
    await g.beforeChange[0]?.({ data: doc, global, req } as unknown as GBefore);
    await g.afterChange[0]?.({ doc, global, previousDoc: {}, req } as unknown as GAfter);
  }

  it("revalidates every language on a publish, reading the global's own row", async () => {
    await saveGlobal("draft", { _status: "published" });
    expect(revalidated()).toEqual(LANGUAGES.map((locale) => `global:header:${locale}`).sort());
    expect(findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "header", select: { _status: true } }),
    );
  });

  it("revalidates nothing for a draft save over the published global", async () => {
    await saveGlobal("published", { _status: "draft" }, "published");
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates an unpublish", async () => {
    await saveGlobal("published", { _status: "draft" }, "draft");
    expect(revalidateTag).toHaveBeenCalled();
  });

  it("passes the profile it is given: `markets` expires its read (T71)", async () => {
    await saveGlobal("draft", { _status: "published" });
    expect(revalidateTag).toHaveBeenCalledWith("global:header:en", "max");
    revalidateTag.mockClear();
    const markets = revalidateGlobalOnPublish({
      tags: () => ["global:markets"],
      profile: { expire: 0 },
    });
    const doc = { countries: [] };
    await markets.afterChange[0]?.({
      doc,
      global: { slug: "markets" },
      previousDoc: {},
      req: request(),
    } as unknown as GAfter);
    expect(revalidateTag).toHaveBeenCalledWith("global:markets", { expire: 0 });
  });
});

describe("revalidateWhenChanged (PR 94 review, item 2)", () => {
  const w = revalidateWhenChanged({
    fields: ["handle", "deletedInMedusa"],
    tags: (locale) => [`global:header:${locale}`, `global:footer:${locale}`],
  });
  type WAfter = Parameters<NonNullable<(typeof w.afterChange)[0]>>[0];
  type WDelete = Parameters<NonNullable<(typeof w.afterDelete)[0]>>[0];
  const products = { slug: "products", versions: false };
  const EVERY = LANGUAGES.flatMap((locale) => [
    `global:header:${locale}`,
    `global:footer:${locale}`,
  ]).sort();

  const change = (
    doc: Record<string, unknown>,
    previousDoc: Record<string, unknown>,
    operation = "update",
    context: Record<string, unknown> = {},
  ) =>
    w.afterChange[0]?.({
      collection: products,
      doc,
      operation,
      previousDoc,
      req: request("en", context),
    } as unknown as WAfter);

  it("revalidates every language when an embedded field changes: a rename, a delete in Medusa", () => {
    change({ handle: "tee" }, { handle: "shirt" });
    expect(revalidated()).toEqual(EVERY);
    revalidateTag.mockReset();
    change({ handle: "tee", deletedInMedusa: true }, { handle: "tee", deletedInMedusa: false });
    expect(revalidated()).toEqual(EVERY);
  });

  it("revalidates nothing for another field, a create, or with context.disableRevalidate", () => {
    change({ handle: "tee", title: "New" }, { handle: "tee", title: "Old" });
    change({ handle: "tee" }, {}, "create");
    change({ handle: "tee" }, { handle: "shirt" }, "update", { disableRevalidate: true });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates every language when the document is deleted", () => {
    const doc = { handle: "tee" };
    expect(
      w.afterDelete[0]?.({
        collection: products,
        doc,
        id: 7,
        req: request(),
      } as unknown as WDelete),
    ).toBe(doc);
    expect(revalidated()).toEqual(EVERY);
  });
});
