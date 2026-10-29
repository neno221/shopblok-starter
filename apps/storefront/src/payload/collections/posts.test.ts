import type { AccessArgs, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { LANGUAGES } from "../locales";
import { Posts } from "./posts";

const as = (user: unknown) => ({ req: { user } as PayloadRequest }) as AccessArgs;
const editor = { collection: "users", id: 2, role: "editor" };
const admin = { collection: "users", id: 1, role: "admin" };
const integration = { collection: "integrations", id: 1, role: "medusa-sync" };

describe("Posts access (T66)", () => {
  it("shows a visitor and an integration the published posts only, and staff the drafts too", () => {
    const read = Posts.access?.read;
    expect(read?.(as(null))).toEqual({ _status: { equals: "published" } });
    expect(read?.(as(integration))).toEqual({ _status: { equals: "published" } });
    expect(read?.(as(editor))).toBe(true);
    expect(read?.(as(admin))).toBe(true);
  });

  it("lets staff alone write posts and see their versions", () => {
    for (const operation of ["create", "update", "delete", "readVersions"] as const) {
      const rule = Posts.access?.[operation];
      expect(rule, operation).toBeTypeOf("function");
      expect(rule?.(as(editor)), operation).toBe(true);
      expect(rule?.(as(admin)), operation).toBe(true);
      expect(rule?.(as(integration)), operation).toBe(false);
      expect(rule?.(as(null)), operation).toBe(false);
    }
  });
});

describe("Posts revalidation (T66)", () => {
  const findOne = vi.fn();
  const request = () =>
    ({
      locale: "en",
      context: {},
      payload: { logger: { warn: vi.fn() }, db: { findOne } },
    }) as unknown as PayloadRequest;
  const collection = { slug: "posts", versions: Posts.versions };
  const EVERY_POST_TAG = [...LANGUAGES.map((locale) => `posts:${locale}`), "payload:posts"].sort();
  const revalidated = () => revalidateTag.mock.calls.map(([tag]) => tag as string).sort();
  const save = async (doc: Record<string, unknown>, req = request()) => {
    for (const hook of Posts.hooks?.afterChange ?? [])
      await hook({ collection, doc, previousDoc: {}, req, operation: "create" } as never);
  };

  beforeEach(() => {
    revalidateTag.mockReset();
    findOne.mockReset();
  });

  it("refreshes every language's posts on a publish, and on a published post's delete", async () => {
    await save({ id: 3, _status: "published" });
    expect(revalidated()).toEqual(EVERY_POST_TAG);
    revalidateTag.mockReset();
    for (const hook of Posts.hooks?.afterDelete ?? [])
      await hook({ collection, doc: { id: 3, _status: "published" }, req: request() } as never);
    expect(revalidated()).toEqual(EVERY_POST_TAG);
  });

  it("refreshes every language's posts on an unpublish", async () => {
    // The row was published before the save and is a draft after it.
    findOne.mockResolvedValueOnce({ id: 3, _status: "published" });
    findOne.mockResolvedValueOnce({ id: 3, _status: "draft" });
    const req = request();
    const doc = { id: 3, _status: "draft" };
    for (const hook of Posts.hooks?.beforeChange ?? [])
      await hook({
        collection,
        data: doc,
        originalDoc: { id: 3 },
        req,
        operation: "update",
      } as never);
    for (const hook of Posts.hooks?.afterChange ?? [])
      await hook({
        collection,
        doc,
        previousDoc: { _status: "published" },
        req,
        operation: "update",
      } as never);
    expect(revalidated()).toEqual(EVERY_POST_TAG);
  });

  it("refreshes nothing for a draft that was never published", async () => {
    await save({ id: 4, _status: "draft" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("says why a save was refused, also in a production build", () => {
    expect(Posts.hooks?.afterError).toHaveLength(1);
  });
});
