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

  it("uses English when the request names no language", () => {
    run({ doc: { _status: "published" }, locale: undefined });
    expect(revalidateTag.mock.calls[0]).toEqual(["pages:en", "max"]);
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
  });

  it("returns the document it was given", () => {
    const doc = { _status: "published" };
    expect(run({ doc, locale: "el" })).toBe(doc);
  });

  it("uses the base language of the Payload config, not a literal, when the request has none", () => {
    run({ doc: { _status: "published" } });
    expect(revalidateTag.mock.calls[0]?.[0]).toBe(`pages:${DEFAULT_LOCALE}`);
  });

  it("revalidates when a page that was published is unpublished over a newer draft", () => {
    // The previous *version* is that draft, so both statuses read `draft`; the page row was published.
    run({
      doc: { id: 7, _status: "draft" },
      previousDoc: { _status: "draft" },
      locale: "el",
      context: { pagesPublishedBefore: { "7": true } },
    });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it("does not take another page's published state for this one's", () => {
    run({
      doc: { id: 8, _status: "draft" },
      previousDoc: { _status: "draft" },
      locale: "el",
      context: { pagesPublishedBefore: { "7": true, "8": false } },
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("warns, and still does not fail the save, when revalidateTag throws inside Next", () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("Route /api/pages used revalidateTag during render");
    });
    const doc = { _status: "published" };
    expect(run({ doc, locale: "el" })).toBe(doc);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining("may be stale") }),
    );
    expect(debug).not.toHaveBeenCalled();
  });
});

describe("rememberPublished", () => {
  const remember = (args: {
    operation: string;
    originalDoc?: { id?: number };
    context?: object;
  }) => {
    const req = request("el", args.context as Record<string, unknown>);
    const data = { title: "x" };
    return {
      req,
      data,
      result: rememberPublished({ ...args, data, req } as unknown as RememberArgs),
    };
  };

  it("records whether the page row visitors read is published, per page id", async () => {
    findOne.mockResolvedValueOnce({ id: 7, _status: "published" });
    findOne.mockResolvedValueOnce({ id: 8, _status: "draft" });
    const context = {};
    await remember({ operation: "update", originalDoc: { id: 7 }, context }).result;
    await remember({ operation: "update", originalDoc: { id: 8 }, context }).result;
    expect(context).toEqual({ pagesPublishedBefore: { "7": true, "8": false } });
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "pages", where: { id: { equals: 7 } } }),
    );
  });

  it("reads nothing for a create, and returns the data it was given", async () => {
    const { data, result } = remember({ operation: "create" });
    expect(await result).toBe(data);
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
