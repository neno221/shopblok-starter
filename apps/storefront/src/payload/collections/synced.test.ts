import fixture from "@shopblok/fixtures/sync/documents.json";
import type { AccessArgs, Field, FieldAccess, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncedFieldNames } from "../fields/synced";
import { Markets } from "../globals/markets";
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

  it("the markets global's synced part has the fixture's fields, and syncedAt", () => {
    const group = named(Markets.fields, "synced");
    expect(group && "fields" in group).toBe(true);
    const names = group && "fields" in group ? syncedNames(group.fields) : [];
    expect(new Set(names)).toEqual(new Set([...Object.keys(fixture.markets), "syncedAt"]));
    const regions = group && "fields" in group ? named(group.fields, "regions") : undefined;
    const regionNames = regions && "fields" in regions ? syncedNames(regions.fields) : [];
    expect(new Set(regionNames)).toEqual(new Set(Object.keys(fixture.markets.regions[0]!)));
  });
});

const syncedNames = (fields: readonly Field[]) =>
  fields.flatMap((field) => ("name" in field ? [field.name] : []));

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

  it("markets: the sync writes `synced` and nothing else; an admin writes the rest", () => {
    const { access } = Markets;
    expect(access?.update?.(as(admin))).toBe(true);
    expect(access?.update?.(as(sync))).toBe(true);
    expect(access?.update?.(as(editor))).toBe(false);
    expect(access?.read?.(as(sync))).toBe(true);
    expect(access?.read?.(as(null))).toBe(false);
    for (const field of Markets.fields) {
      if (!("name" in field)) continue;
      const update = "access" in field ? field.access?.update : undefined;
      if (field.name === "synced") {
        expect(fieldAs(update, sync)).toBe(true);
        expect(fieldAs(update, admin)).toBe(false);
      } else {
        expect(fieldAs(update, admin), field.name).toBe(true);
        expect(fieldAs(update, sync), field.name).toBe(false);
      }
    }
  });
});

describe("the content globals follow what they embed (T61, PR 94 review item 2)", () => {
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
  }

  it("media: a replaced file refreshes them too", () => {
    void update(Media, { filename: "logo-2.png" }, { filename: "logo.png" });
    expect(tags()).toContain("global:header:en");
  });
});
