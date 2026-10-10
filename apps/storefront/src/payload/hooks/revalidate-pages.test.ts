import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { revalidatePages } from "./revalidate-pages";

const debug = vi.fn();
type Args = Parameters<typeof revalidatePages>[0];

function run(args: {
  doc: { _status?: string };
  previousDoc?: { _status?: string };
  locale?: string | undefined;
  context?: Record<string, unknown>;
}) {
  const { doc, previousDoc, locale, context } = args;
  const req = { locale, context: context ?? {}, payload: { logger: { debug } } };
  return revalidatePages({ doc, previousDoc, req } as unknown as Args);
}

beforeEach(() => {
  revalidateTag.mockReset();
  debug.mockReset();
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
});
