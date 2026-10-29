import type { AccessArgs, CollectionConfig, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  adminOnly,
  checkImportedStrings,
  IMPORT_BATCH_SIZE,
  reportImportProblems,
} from "./import-export";

const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const sync = { collection: "integrations", id: 1, role: "medusa-sync" };
const as = (user: unknown) => ({ req: { user } as PayloadRequest }) as AccessArgs;

/** The plugin's collection as it hands it to the override: its own access and an open endpoint. */
const answer = new Response("csv");
const handler = vi.fn(async () => answer);
const plugin: CollectionConfig = {
  slug: "exports",
  access: { update: () => false },
  admin: { useAsTitle: "name" },
  endpoints: [{ path: "/download", method: "post", handler }],
  fields: [],
  upload: { filesRequiredOnCreate: false },
};
const exports = adminOnly("exports")({ collection: plugin });

describe("the import and export collections are admins' only (D77)", () => {
  it("lets only an admin read, create or delete one, and nobody update one", () => {
    for (const operation of ["read", "create", "delete"] as const) {
      expect(exports.access?.[operation]?.(as(admin)), operation).toBe(true);
      for (const user of [editor, sync, null]) {
        expect(exports.access?.[operation]?.(as(user)), `${operation} as ${user?.role}`).toBe(
          false,
        );
      }
    }
    expect(exports.access?.update?.(as(admin))).toBe(false);
  });

  it("refuses the plugin's endpoints (the CSV download, the previews) to anyone but an admin", async () => {
    const [download] = exports.endpoints || [];
    for (const user of [editor, sync, null]) {
      const response = await download?.handler({ user } as PayloadRequest);
      expect(response?.status, `as ${user?.role ?? "nobody"}`).toBe(403);
    }
    expect(handler).not.toHaveBeenCalled();
    expect(await download?.handler({ user: admin } as unknown as PayloadRequest)).toBe(answer);
    expect(download?.path).toBe("/download");
  });

  it("hides the collections from an editor's admin, and keeps the files out of the repository", () => {
    const hidden = exports.admin?.hidden as (args: { user: unknown }) => boolean;
    expect(hidden({ user: editor })).toBe(true);
    expect(hidden({ user: admin })).toBe(false);
    expect(exports.admin?.useAsTitle).toBe("name");
    const upload = exports.upload as { staticDir: string; filesRequiredOnCreate: boolean };
    expect(upload.staticDir).toMatch(/apps[\\/]storefront[\\/]media[\\/]exports$/);
    expect(upload.filesRequiredOnCreate).toBe(false);
  });
});

describe("checkImportedStrings: what an import of ui-strings writes (D77)", () => {
  const stored = {
    key: "atoms.stock.low",
    value: { en: "Only {count} left", el: "Μόνο {count}", de: "Nur {count}", fr: null },
    source: { message: "Only {count} left" },
    note: null,
  };
  const request = () => ({
    context: {} as Record<string, unknown>,
    payload: { find: vi.fn(async () => ({ docs: [stored] })) },
  });
  const run = (rows: Record<string, unknown>[], req: unknown = request(), batchNumber = 1) =>
    checkImportedStrings({
      batchNumber,
      data: rows,
      format: "csv",
      originalData: rows,
      req: req as unknown as PayloadRequest,
      totalBatches: 1,
    } as Parameters<typeof checkImportedStrings>[0]) as Promise<Record<string, unknown>[]>;

  it("reads the batch's documents once, in every language", async () => {
    const req = request();
    await run([{ key: "atoms.stock.low", value: { el: "Μόνο {count}" } }], req);
    expect(req.payload.find).toHaveBeenCalledTimes(1);
    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "ui-strings",
        where: { key: { in: ["atoms.stock.low"] } },
        locale: "all",
        pagination: false,
      }),
    );
  });

  it("leaves out every language whose cell is what is stored, empty cells for empty values too", async () => {
    const [row] = await run([
      {
        key: "atoms.stock.low",
        note: "n",
        value: { en: "Only {count} left", el: "Μόνο {count}", de: "Nur {count}", fr: "", pt: "" },
      },
    ]);
    expect(row).toEqual({ key: "atoms.stock.low", note: "n" });
  });

  it("hands the plugin no row that changes nothing, so an untouched round trip saves nothing (review, item 4)", async () => {
    const req = request();
    const untouched = {
      id: 7,
      key: "atoms.stock.low",
      namespace: "atoms",
      note: "",
      source: { message: "Only {count} left", arguments: "{count}" },
      value: { en: "Only {count} left", el: "Μόνο {count}", de: "Nur {count}", fr: "", pt: "" },
      createdAt: "2026-10-28T21:32:11.494Z",
      updatedAt: "2026-10-28T21:32:11.494Z",
    };
    expect(await run([untouched, { key: "atoms.stock.low" }], req)).toEqual([]);
    expect(req.context["uiStringsImportProblems"]).toEqual([]);
  });

  it("reads a number- or boolean-looking cell as its text, never as an empty value (review, item 5)", async () => {
    const plain = {
      key: "atoms.size",
      value: { en: "Size" },
      source: { message: "Size" },
      note: null,
    };
    const req = { context: {}, payload: { find: vi.fn(async () => ({ docs: [plain] })) } };
    const rows = await run([{ key: "atoms.size", value: { de: 10, fr: true, el: 1.5 } }], req);
    expect(rows).toEqual([
      { key: "atoms.size", value: { en: "Size", de: "10", fr: "true", el: "1.5" } },
    ]);
  });

  it("refuses a file with one value column, which the plugin would save over English (review, item 2)", async () => {
    const req = request();
    expect(await run([{ key: "atoms.stock.low", value: "Μόνο {count}" }], req)).toEqual([]);
    expect(req.context["uiStringsImportProblems"]).toEqual([
      {
        row: 1,
        error: expect.stringMatching(
          /^value: the file has one value column\. Export with every language/,
        ),
        data: { key: "atoms.stock.low", value: "Μόνο {count}" },
      },
    ]);
  });

  it("keeps a changed value, with the stored English first, so the plugin never writes it into English", async () => {
    const [row] = await run([{ key: "atoms.stock.low", value: { el: "Λίγα: {count}", de: "" } }]);
    expect(row?.["value"]).toEqual({ en: "Only {count} left", el: "Λίγα: {count}", de: null });
    expect(Object.keys(row?.["value"] as object)[0]).toBe("en");
    const [english] = await run([{ key: "atoms.stock.low", value: { en: "Just {count} left" } }]);
    expect(english?.["value"]).toEqual({ en: "Just {count} left" });
  });

  it("leaves out a value that fails the ICU check, and records it with its row and reason", async () => {
    const req = request();
    const rows = [
      { key: "atoms.stock.low", value: { el: "Λίγα" } },
      { key: "atoms.stock.low", value: { de: "Nur {count", fr: "Plus que {count}" } },
    ];
    const [only, ...more] = await run(rows, req, 2);
    // The first row's one change was refused: nothing of it reaches the plugin.
    expect(more).toEqual([]);
    expect(only?.["value"]).toEqual({ en: "Only {count} left", fr: "Plus que {count}" });
    expect(req.context["uiStringsImportProblems"]).toEqual([
      {
        row: IMPORT_BATCH_SIZE + 1,
        error: "value_el: It must use the English text's arguments ({count}): {count} is missing.",
        data: { key: "atoms.stock.low", value_el: "Λίγα" },
      },
      {
        row: IMPORT_BATCH_SIZE + 2,
        error: expect.stringMatching(/^value_de: It is not a valid ICU message/),
        data: { key: "atoms.stock.low", value_de: "Nur {count" },
      },
    ]);
  });

  it("reports a key that is not stored, with its row, and leaves it out", async () => {
    const req = request();
    const rows = [
      { key: "atoms.stock.low", value: { el: "Λίγα: {count}" } },
      { key: "atoms.unknown", value: { el: "x" } },
    ];
    expect(await run(rows, req)).toEqual([
      { key: "atoms.stock.low", value: { en: "Only {count} left", el: "Λίγα: {count}" } },
    ]);
    expect(req.context["uiStringsImportProblems"]).toEqual([
      {
        row: 2,
        error: expect.stringMatching(/^key: no UI string has this key/),
        data: { key: "atoms.unknown" },
      },
    ]);
  });
});

describe("reportImportProblems", () => {
  const problem = { row: 3, error: "value_el: …", data: { key: "k" } };
  const call = (
    operation: "create" | "update",
    context: Record<string, unknown>,
    summary: object,
  ) => {
    const update = vi.fn();
    const result = reportImportProblems({
      doc: { id: 5, status: "completed", summary },
      operation,
      req: { context, payload: { update } },
    } as unknown as Parameters<typeof reportImportProblems>[0]);
    return { result: result as Promise<Record<string, unknown>>, update };
  };

  it("adds the refused values to the summary, and makes the import partial", async () => {
    const context = { uiStringsImportProblems: [problem] };
    const { result, update } = call("create", context, { updated: 2, issues: 0, total: 3 });
    expect(await result).toMatchObject({
      status: "partial",
      summary: { updated: 2, issues: 1, total: 3, issueDetails: [problem] },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "imports", id: 5, overrideAccess: true }),
    );
    expect("uiStringsImportProblems" in context).toBe(false);
  });

  it("calls an import that changed nothing failed, and does nothing without problems", async () => {
    const failed = call("create", { uiStringsImportProblems: [problem] }, { updated: 0 });
    expect((await failed.result)["status"]).toBe("failed");
    const clean = call("create", {}, { updated: 1 });
    expect((await clean.result)["status"]).toBe("completed");
    expect(clean.update).not.toHaveBeenCalled();
    const later = call("update", { uiStringsImportProblems: [problem] }, {});
    expect((await later.result)["status"]).toBe("completed");
  });
});

describe("imports update by key only", () => {
  const imports = adminOnly("imports")({
    collection: {
      slug: "imports",
      fields: [
        { name: "importMode", type: "select", options: ["create", "update", "upsert"] },
        { name: "matchField", type: "text", defaultValue: "id" },
      ],
      hooks: { afterChange: [vi.fn()] },
    },
  });
  const fieldNamed = (name: string) =>
    imports.fields.find((f) => "name" in f && f.name === name) as {
      defaultValue: unknown;
      validate: (value: unknown) => true | string;
    };

  it("takes only the update mode, matched by key", () => {
    expect(fieldNamed("importMode").defaultValue).toBe("update");
    expect(fieldNamed("importMode").validate("update")).toBe(true);
    expect(fieldNamed("importMode").validate("create")).toMatch(/Update/);
    expect(fieldNamed("importMode").validate("upsert")).toMatch(/Update/);
    expect(fieldNamed("matchField").defaultValue).toBe("key");
    expect(fieldNamed("matchField").validate("key")).toBe(true);
    expect(fieldNamed("matchField").validate("id")).toMatch(/key/);
  });

  it("reports the refused values after the plugin's own hook", () => {
    expect(imports.hooks?.afterChange?.at(-1)).toBe(reportImportProblems);
    expect(imports.hooks?.afterChange).toHaveLength(2);
  });
});
