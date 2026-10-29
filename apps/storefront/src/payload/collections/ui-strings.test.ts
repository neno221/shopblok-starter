import type {
  AccessArgs,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  Field,
  FieldAccess,
  PayloadRequest,
} from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { codeMessages } from "../../i18n/messages";
import { LANGUAGES } from "../locales";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { keepRefusalReason } from "../hooks/keep-refusal-reason";
import { Pages } from "./pages";
import { UiStrings, validateKey, validateValue } from "./ui-strings";

const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const sync = { collection: "integrations", id: 1, role: "medusa-sync" };
const req = (user: unknown) => ({ user }) as PayloadRequest;
const as = (user: unknown) => ({ req: req(user) }) as AccessArgs;
const fieldAs = (access: FieldAccess | undefined, user: unknown) =>
  access?.({ req: req(user) } as Parameters<FieldAccess>[0]);
const field = (name: string) =>
  UiStrings.fields.find((f: Field) => "name" in f && f.name === name) as Field & {
    access?: Record<string, FieldAccess>;
    localized?: boolean;
  };

const REVIEWS = "{average} out of 5, {count, plural, one {# review} other {# reviews}}";
const validate = (value: string | null | undefined, source?: string | null) =>
  validateValue(value, { data: { source: { message: source } } } as never);

describe("ui-strings access (D77)", () => {
  const access = UiStrings.access ?? {};

  it("is read by anyone: it is the shop's own copy", () => {
    for (const user of [null, editor, admin, sync]) expect(access.read?.(as(user))).toBe(true);
  });

  it("is updated by staff only", () => {
    expect(access.update?.(as(editor))).toBe(true);
    expect(access.update?.(as(admin))).toBe(true);
    expect(access.update?.(as(sync))).toBe(false);
    expect(access.update?.(as(null))).toBe(false);
  });

  it("is created and deleted by admins only (and by the seed, which overrides access)", () => {
    for (const operation of ["create", "delete"] as const) {
      expect(access[operation]?.(as(admin)), operation).toBe(true);
      expect(access[operation]?.(as(editor)), operation).toBe(false);
      expect(access[operation]?.(as(sync)), operation).toBe(false);
      expect(access[operation]?.(as(null)), operation).toBe(false);
    }
  });

  it("keeps the key once made, and lets nobody but the seed write namespace, source or seeded", () => {
    expect(fieldAs(field("key").access?.["update"], admin)).toBe(false);
    for (const name of ["namespace", "source", "seeded"]) {
      for (const operation of ["create", "update"]) {
        expect(fieldAs(field(name).access?.[operation], admin), `${name} ${operation}`).toBe(false);
      }
    }
    // The seed's bookkeeping is no visitor's, nor in an export.
    expect(fieldAs(field("seeded").access?.["read"], admin)).toBe(false);
    expect(field("seeded").custom?.["plugin-import-export"]).toEqual({ disabled: true });
  });

  it("has no drafts (a save is live) and a value per language", () => {
    expect(UiStrings.versions).toBeUndefined();
    expect(field("value").localized).toBe(true);
    expect(field("note").localized).toBeUndefined();
  });
});

describe("the ICU check on save (D77)", () => {
  it("takes a value with the source's arguments, and an empty value", () => {
    expect(validate("{count, plural, other {# κριτικές}}: {average} στα 5", REVIEWS)).toBe(true);
    for (const empty of ["", null, undefined]) expect(validate(empty, REVIEWS)).toBe(true);
  });

  it("refuses a value that does not parse, or whose arguments differ, with the reason", () => {
    expect(validate("{average out of 5", REVIEWS)).toMatch(/not a valid ICU message/);
    expect(validate("{avg} από 5, {count, plural, other {#}}", REVIEWS)).toBe(
      "It must use the English text's arguments ({average}, {count, plural}): {average} is missing; {avg} is not one of them.",
    );
  });

  it("checks only the syntax of a document with no source (an admin's own key)", () => {
    expect(validate("{anything}", null)).toBe(true);
    expect(validate("{broken", undefined)).toMatch(/not a valid ICU message/);
  });

  it("takes every key of the code catalogs, and refuses one that is no dotted path", () => {
    for (const key of codeMessages("en").keys())
      expect(validateKey(key, {} as never), key).toBe(true);
    for (const key of ["", "molecules", "molecules.", "a b.c", ".x"]) {
      expect(validateKey(key, {} as never), key).not.toBe(true);
    }
  });
});

describe("ui-strings hooks", () => {
  const before = UiStrings.hooks?.beforeChange ?? [];
  const [afterChange] = (UiStrings.hooks?.afterChange ?? []) as CollectionAfterChangeHook[];
  const [afterDelete] = (UiStrings.hooks?.afterDelete ?? []) as CollectionAfterDeleteHook[];
  const request = (context: Record<string, unknown> = {}) => ({
    locale: "el",
    context,
    payload: { logger: { warn: vi.fn() }, db: { findOne: vi.fn() } },
  });
  const every = () => LANGUAGES.map((locale) => `ui-strings:${locale}`).sort();
  const revalidated = () => revalidateTag.mock.calls.map(([tag]) => tag as string).sort();

  beforeEach(() => revalidateTag.mockReset());

  async function runBefore(data: Record<string, unknown>, originalDoc?: Record<string, unknown>) {
    let result = data;
    for (const hook of before as CollectionBeforeChangeHook[]) {
      result = await hook({
        collection: UiStrings,
        data: result,
        operation: originalDoc === undefined ? "create" : "update",
        originalDoc,
        req: request(),
      } as unknown as Parameters<CollectionBeforeChangeHook>[0]);
    }
    return result;
  }

  it("sets the namespace from the key, on create and on an update that does not send the key", async () => {
    expect((await runBefore({ key: "molecules.cartLineItem.remove" }))["namespace"]).toBe(
      "molecules",
    );
    expect(
      (await runBefore({ value: "x" }, { id: 1, key: "templates.home.title" }))["namespace"],
    ).toBe("templates");
  });

  it("revalidates ui-strings:<locale> in every language on a save, a Greek one included", async () => {
    await afterChange?.({
      collection: UiStrings,
      doc: { id: 1 },
      previousDoc: {},
      operation: "update",
      req: request(),
    } as unknown as Parameters<CollectionAfterChangeHook>[0]);
    expect(revalidated()).toEqual(every());
    expect(revalidateTag).toHaveBeenCalledWith("ui-strings:en", "max");
  });

  it("revalidates every language on a delete, and nothing for the seed's writes", async () => {
    await afterDelete?.({
      collection: UiStrings,
      doc: { id: 1 },
      id: 1,
      req: request(),
    } as unknown as Parameters<CollectionAfterDeleteHook>[0]);
    expect(revalidated()).toEqual(every());
    revalidateTag.mockReset();
    await afterChange?.({
      collection: UiStrings,
      doc: { id: 1 },
      previousDoc: {},
      operation: "create",
      req: request({ disableRevalidate: true }),
    } as unknown as Parameters<CollectionAfterChangeHook>[0]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("keepRefusalReason (PR 93)", () => {
  const args = (error: Error) =>
    ({ error, context: {}, req: {} }) as Parameters<typeof keepRefusalReason>[0];

  it("answers a refused save with its reasons, whatever class the error is", async () => {
    const data = {
      collection: "ui-strings",
      errors: [
        { label: "Value", message: "It must use the English text's arguments", path: "value" },
      ],
    };
    // A copy of Payload's ValidationError from another module instance: the name and data only.
    const error = Object.assign(new Error("The following field is invalid: Value"), {
      name: "ValidationError",
      data,
    });
    expect(await keepRefusalReason(args(error))).toEqual({
      response: {
        errors: [
          { name: "ValidationError", data, message: "The following field is invalid: Value" },
        ],
      },
    });
    expect(UiStrings.hooks?.afterError).toContain(keepRefusalReason);
    expect(Pages.hooks?.afterError).toContain(keepRefusalReason);
  });

  it("leaves every other error to Payload", async () => {
    expect(await keepRefusalReason(args(new Error("boom")))).toBeUndefined();
    const bare = Object.assign(new Error("x"), { name: "ValidationError" });
    expect(await keepRefusalReason(args(bare))).toBeUndefined();
  });
});
