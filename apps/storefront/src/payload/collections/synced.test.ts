import fixture from "@shopblok/fixtures/sync/documents.json";
import type { AccessArgs, Field, FieldAccess, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncedFieldNames } from "../fields/synced";
import { Categories } from "./categories";
import { Collections } from "./collections";
import { Media } from "./media";
import { Products } from "./products";

const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag }));

// T60 (D75): the shared fixture (`@shopblok/fixtures/sync/documents.json`) is what the backend's
// mapping writes; its test checks the mapping against the same file. A field renamed or dropped on
// either side fails one of the two.

const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const sync = { collection: "integrations", id: 1, role: "medusa-sync" };
const req = (user: unknown) => ({ user }) as PayloadRequest;
const as = (user: unknown) => ({ req: req(user) }) as AccessArgs;
const fieldAs = (access: FieldAccess | undefined, user: unknown) =>
  access?.({ req: req(user) } as Parameters<FieldAccess>[0]);

const named = (fields: readonly Field[], name: string) =>
  fields.find((field) => "name" in field && field.name === name);

const COLLECTIONS = [
  { config: Products, documents: fixture.documents.products },
  { config: Categories, documents: fixture.documents.categories },
  { config: Collections, documents: fixture.documents.collections },
] as const;

describe("the synced collections take the shared fixture's documents", () => {
  for (const { config, documents } of COLLECTIONS) {
    it(`${config.slug}: the synced fields are the fixture's fields and references, and syncedAt`, () => {
      expect(documents.length).toBeGreaterThan(0);
      for (const document of documents) {
        expect(new Set(syncedFieldNames(config.fields))).toEqual(
          new Set([
            ...Object.keys(document.fields),
            ...Object.keys(document.references),
            "syncedAt",
          ]),
        );
      }
    });

    it(`${config.slug}: every required field has a value in each document`, () => {
      for (const field of config.fields) {
        if (!("name" in field) || !("required" in field) || field.required !== true) continue;
        for (const document of documents) {
          const value = (document.fields as Record<string, unknown>)[field.name];
          expect(value, `${config.slug}.${field.name}`).toBeTruthy();
        }
      }
    });
  }
});

describe("who writes what (D75)", () => {
  for (const { config } of COLLECTIONS) {
    it(`${config.slug}: only the sync creates and deletes; staff and the sync update; anyone reads`, () => {
      const { access } = config;
      for (const user of [admin, editor, null]) {
        expect(access?.create?.(as(user))).toBe(false);
        expect(access?.delete?.(as(user))).toBe(false);
      }
      expect(access?.create?.(as(sync))).toBe(true);
      expect(access?.delete?.(as(sync))).toBe(true);
      for (const user of [admin, editor, sync]) expect(access?.update?.(as(user))).toBe(true);
      expect(access?.update?.(as(null))).toBe(false);
      expect(access?.read?.(as(null))).toBe(true);
    });

    it(`${config.slug}: staff cannot write a synced field, and it is read-only in the admin`, () => {
      for (const name of syncedFieldNames(config.fields)) {
        const field = named(config.fields, name);
        const fieldAccess = field && "access" in field ? field.access : undefined;
        for (const user of [admin, editor, null, { ...sync, role: "other" }]) {
          expect(fieldAs(fieldAccess?.update, user), `${name} update`).toBe(false);
          expect(fieldAs(fieldAccess?.create, user), `${name} create`).toBe(false);
        }
        expect(fieldAs(fieldAccess?.update, sync)).toBe(true);
        expect(field?.admin && "readOnly" in field.admin && field.admin.readOnly).toBe(true);
      }
    });
  }
});

describe("the content globals and the pages follow what they embed (T61, PR 94 review item 2; T63, PR 95 review item 2)", () => {
  beforeEach(() => revalidateTag.mockReset());
  const update = (config: typeof Media, doc: object, previousDoc: object) =>
    config.hooks?.afterChange?.[0]?.({
      collection: config,
      doc,
      previousDoc,
      operation: "update",
      req: { context: {}, payload: { logger: { warn: vi.fn() } } },
    } as never);
  const tags = () => revalidateTag.mock.calls.map(([tag]) => tag as string);

  for (const { config } of COLLECTIONS) {
    it(`${config.slug}: a rename or a delete in Medusa refreshes the header, footer and settings`, () => {
      void update(config, { handle: "tee" }, { handle: "shirt" });
      expect(tags()).toEqual(
        expect.arrayContaining(["global:header:en", "global:footer:el", "global:site-settings:de"]),
      );
    });

    it(`${config.slug}: and the pages and the posts, whose blocks and text link to it`, () => {
      void update(config, { handle: "tee", deletedInMedusa: true }, { handle: "tee" });
      expect(tags()).toEqual(
        expect.arrayContaining(["pages:en", "pages:el", "payload:pages", "posts:de"]),
      );
    });

    it(`${config.slug}: and the catalog's content, whose rich texts link to it`, () => {
      void update(config, { handle: "shirt" }, { handle: "tee" });
      expect(tags()).toContain("cms:catalog");
    });
  }

  it("media: a replaced file refreshes them, the pages and the posts too", () => {
    void update(Media, { filename: "logo-2.png" }, { filename: "logo.png" });
    expect(tags()).toEqual(
      expect.arrayContaining(["global:header:en", "pages:fr", "payload:pages", "posts:el"]),
    );
  });
});

const contentFieldNames = (fields: readonly Field[]) =>
  fields.flatMap((field) =>
    "name" in field && (field.custom as { content?: boolean } | undefined)?.content === true
      ? [field.name]
      : [],
  );

describe("the shop's own content on the synced documents (T69, D83)", () => {
  const CONTENT = {
    products: ["richDescription", "gallery", "meta"],
    categories: ["image", "banner", "intro", "meta"],
    collections: ["image", "banner", "intro", "meta"],
  } as const;

  for (const { config } of COLLECTIONS) {
    const slug = config.slug as keyof typeof CONTENT;
    it(`${config.slug}: has its content fields, none of them synced`, () => {
      expect(contentFieldNames(config.fields)).toEqual(CONTENT[slug]);
      const synced = new Set(syncedFieldNames(config.fields));
      for (const name of CONTENT[slug]) expect(synced.has(name), name).toBe(false);
    });

    it(`${config.slug}: staff write the content, the sync and anonymous visitors cannot; it is not read-only`, () => {
      for (const name of CONTENT[slug]) {
        const field = named(config.fields, name);
        const fieldAccess = field && "access" in field ? field.access : undefined;
        for (const user of [admin, editor]) {
          expect(fieldAs(fieldAccess?.update, user), `${name} update`).toBe(true);
          expect(fieldAs(fieldAccess?.create, user), `${name} create`).toBe(true);
        }
        for (const user of [sync, null]) {
          expect(fieldAs(fieldAccess?.update, user), `${name} update`).toBe(false);
          expect(fieldAs(fieldAccess?.create, user), `${name} create`).toBe(false);
        }
        // Read like the document: by anyone (no read rule of its own).
        expect(fieldAccess?.read).toBeUndefined();
        expect(field?.admin && "readOnly" in field.admin && field.admin.readOnly).toBeFalsy();
      }
    });

    it(`${config.slug}: the localized fields are the texts, not the pictures`, () => {
      for (const name of CONTENT[slug]) {
        const field = named(config.fields, name);
        const localized = field !== undefined && "localized" in field && field.localized === true;
        expect(localized, name).toBe(field?.type === "richText");
      }
    });

    it(`${config.slug}: has no drafts, so the sync's saves never publish an editor's pending draft`, () => {
      expect(config.versions).toBeUndefined();
    });
  }
});

describe("a save of a synced document refreshes its content read (T69, D73)", () => {
  beforeEach(() => revalidateTag.mockReset());
  const req = () => ({ context: {}, payload: { logger: { warn: vi.fn() } } });
  const tags = () => revalidateTag.mock.calls.map(([tag]) => tag as string);
  const KIND = { products: "product", categories: "category", collections: "collection" } as const;

  const afterChange = (config: typeof Products, doc: object, previousDoc: object, context = {}) =>
    Promise.all(
      (config.hooks?.afterChange ?? []).map((hook) =>
        hook({
          collection: config,
          doc,
          previousDoc,
          operation: "update",
          req: { ...req(), context },
        } as never),
      ),
    );
  const afterDelete = (config: typeof Products, doc: object) =>
    Promise.all(
      (config.hooks?.afterDelete ?? []).map((hook) =>
        hook({ collection: config, doc, id: 1, req: req() } as never),
      ),
    );

  for (const { config } of COLLECTIONS) {
    const kind = KIND[config.slug as keyof typeof KIND];
    const tag = (handle: string) => `cms:${kind}:${handle}`;

    it(`${config.slug}: an editor's save revalidates cms:${kind}:<handle>, once`, async () => {
      await afterChange(config, { id: 1, handle: "tee", intro: "new" }, { id: 1, handle: "tee" });
      expect(tags().filter((each) => each === tag("tee"))).toHaveLength(1);
    });

    it(`${config.slug}: a rename in Medusa revalidates the old handle's read and the new one's`, async () => {
      await afterChange(config, { id: 1, handle: "tee" }, { id: 1, handle: "shirt" });
      expect(tags()).toEqual(expect.arrayContaining([tag("tee"), tag("shirt")]));
    });

    it(`${config.slug}: a delete revalidates it`, async () => {
      await afterDelete(config, { id: 1, handle: "tee" });
      expect(tags()).toContain(tag("tee"));
    });

    it(`${config.slug}: bootstrap's import (disableRevalidate) revalidates nothing`, async () => {
      await afterChange(
        config,
        { id: 1, handle: "tee" },
        { id: 1, handle: "shirt" },
        { disableRevalidate: true },
      );
      expect(tags()).toEqual([]);
    });
  }

  it("media: a replaced file refreshes every catalog content read", () => {
    void Media.hooks?.afterChange?.[0]?.({
      collection: Media,
      doc: { filename: "banner-2.webp" },
      previousDoc: { filename: "banner.webp" },
      operation: "update",
      req: req(),
    } as never);
    expect(tags()).toContain("cms:catalog");
  });
});
