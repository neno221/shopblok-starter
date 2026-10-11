import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LOCALE } from "../locales";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { rememberPublished, revalidateDeletedPage, revalidatePages } from "./revalidate-pages";

const debug = vi.fn();
const warn = vi.fn();
const findOne = vi.fn();
type Args = Parameters<typeof revalidatePages>[0];
type RememberArgs = Parameters<typeof rememberPublished>[0];
type DeleteArgs = Parameters<typeof revalidateDeletedPage>[0];

const request = (locale?: string, context?: Record<string, unknown>) => ({
  locale,
  context: context ?? {},
  payload: { logger: { debug, warn }, db: { findOne } },
});

function run(args: {
  doc: { id?: number; _status?: string };
  previousDoc?: { _status?: string };
  locale?: string | undefined;
  context?: Record<string, unknown>;
}) {
  const { doc, previousDoc, locale, context } = args;
  return revalidatePages({ doc, previousDoc, req: request(locale, context) } as unknown as Args);
}

beforeEach(() => {
  revalidateTag.mockReset();
  debug.mockReset();
  warn.mockReset();
  findOne.mockReset();
});

describe("revalidatePages", () => {
  it("revalidates the language's tag and the shared tag, stale-while-revalidate, on a publish", () => {
    run({ doc: { _status: "published" }, previousDoc: { _status: "draft" }, locale: "el" });
    expect(revalidateTag.mock.calls).toEqual([
      ["pages:el", "max"],
      ["payload:pages", "max"],
    ]);
  });

  it("revalidates when a published page is edited, and when it is unpublished", () => {
    run({ doc: { _status: "published" }, previousDoc: { _status: "published" }, locale: "en" });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    revalidateTag.mockReset();
    run({ doc: { _status: "draft" }, previousDoc: { _status: "published" }, locale: "en" });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it("revalidates nothing for a draft that was never published", () => {
    run({ doc: { _status: "draft" }, previousDoc: { _status: "draft" }, locale: "el" });
    run({ doc: { _status: "draft" }, locale: "el" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("uses the base language of the Payload config when the request names no language", () => {
    run({ doc: { _status: "published" }, locale: undefined });
    expect(revalidateTag.mock.calls[0]).toEqual([`pages:${DEFAULT_LOCALE}`, "max"]);
  });

  it("does nothing when the caller sets context.disableRevalidate", () => {
    run({ doc: { _status: "published" }, locale: "el", context: { disableRevalidate: true } });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("does not fail the save when revalidateTag throws outside Next, and says why in the log", () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("Invariant: static generation store missing");
    });
    const doc = { _status: "published" };
    expect(run({ doc, locale: "el" })).toBe(doc);
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("no revalidation outside Next"));
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns, and still does not fail the save, when revalidateTag throws inside Next", () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("Route /api/pages used revalidateTag during render");
    });
    const doc = { _status: "published" };
    expect(run({ doc, locale: "el" })).toBe(doc);
    expect(warn).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      expect.stringContaining("may be stale"),
    );
    expect(debug).not.toHaveBeenCalled();
  });

  it("returns the document it was given", () => {
    const doc = { _status: "published" };
    expect(run({ doc, locale: "el" })).toBe(doc);
  });
});

describe("rememberPublished", () => {
  const data = { title: "x" };
  const remember = (operation: string, id?: number, context: Record<string, unknown> = {}) =>
    rememberPublished({
      data,
      operation,
      originalDoc: id === undefined ? undefined : { id },
      req: request("el", context),
    } as unknown as RememberArgs);

  /** The page row's status before a save, then what `revalidatePages` sees after it. */
  const save = async (id: number, rowStatus: string, context: Record<string, unknown>) => {
    findOne.mockResolvedValueOnce({ id, _status: rowStatus });
    await remember("update", id, context);
  };
  // An editor saved a draft over the published text and then unpublished: the newest version, which
  // Payload hands over as `previousDoc`, is a draft, and so is the document that was saved.
  const unpublished = (id: number, context: Record<string, unknown>) =>
    run({
      doc: { id, _status: "draft" },
      previousDoc: { _status: "draft" },
      locale: "el",
      context,
    });

  it("reads only the status of the page row being updated", async () => {
    await save(7, "published", {});
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        where: { id: { equals: 7 } },
        select: { _status: true },
      }),
    );
  });

  it("makes an unpublish over a newer draft revalidate, though both versions read `draft`", async () => {
    const context = {};
    await save(7, "published", context);
    unpublished(7, context);
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it("does not take another page's published state for this one's (a bulk update shares a req)", async () => {
    const context = {};
    await save(7, "published", context);
    await save(8, "draft", context);
    unpublished(8, context);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("reads nothing for a create, and returns the data it was given", async () => {
    expect(await remember("create")).toBe(data);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("reads nothing when the caller sets context.disableRevalidate", async () => {
    expect(await remember("update", 7, { disableRevalidate: true })).toBe(data);
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe("revalidateDeletedPage", () => {
  const remove = (doc: { _status?: string }, context: Record<string, unknown> = {}) =>
    revalidateDeletedPage({ doc, req: request("el", context) } as unknown as DeleteArgs);

  it("revalidates when a published page is deleted", () => {
    const doc = { _status: "published" };
    expect(remove(doc)).toBe(doc);
    expect(revalidateTag.mock.calls).toEqual([
      ["pages:el", "max"],
      ["payload:pages", "max"],
    ]);
  });

  it("revalidates nothing for a draft, or when the caller sets context.disableRevalidate", () => {
    remove({ _status: "draft" });
    remove({ _status: "published" }, { disableRevalidate: true });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
