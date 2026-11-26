import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { PAYLOAD_MODULE } from "../../modules/payload";
import type { Listed } from "../../modules/payload/service";
import { RECONCILE_PAGE_SIZE, reconcile } from "../payload-sync";

// The reconcile's order of reads (PR 91 review, item 1): a record created while a reconcile runs,
// and written to Payload by the subscriber, must never be marked deleted. And its pages (T112,
// D149): Medusa's records 200 at a time by id, a keyset, never the whole catalog in one query.

const markDeleted = jest.fn(async (_input: unknown) => ({ result: { found: true } }));
const writeDocument = jest.fn(async (_input: unknown) => ({
  result: { id: 1, created: false, missing: [] as string[] },
}));

jest.mock("../../workflows/sync-to-payload", () => ({
  syncPayloadDocumentWorkflow: () => ({
    run: ({ input }: { input: unknown }) => writeDocument(input),
  }),
  markPayloadDeletedWorkflow: () => ({
    run: ({ input }: { input: unknown }) => markDeleted(input),
  }),
}));

const UPDATED_AT = "2026-10-28T12:00:00.000Z";

const product = (id: string) => ({
  id,
  title: id,
  handle: id,
  thumbnail: null,
  updated_at: UPDATED_AT,
  deleted_at: null,
});

const listed = (id: string, payloadId: number): Listed => ({
  id: payloadId,
  medusaId: id,
  medusaUpdatedAt: UPDATED_AT,
  deletedInMedusa: false,
  parent: null,
});

/**
 * Medusa and Payload hold `prod_a`. The moment Medusa's product read has been answered, an admin
 * creates `prod_b` and the subscriber writes it to Payload: Medusa's read lacks it, and a Payload
 * list made after that point has it.
 */
function race() {
  const medusa = [product("prod_a")];
  const payload: Listed[] = [listed("prod_a", 1)];
  const graph = jest.fn(async ({ entity }: { entity: string }) => {
    if (entity !== "product") return { data: [] };
    const data = [...medusa];
    medusa.push(product("prod_b"));
    payload.push(listed("prod_b", 2));
    return { data };
  });
  const service = {
    listDocuments: jest.fn(async (collection: string) =>
      collection === "products" ? [...payload] : [],
    ),
    recordRun: jest.fn(),
  };
  const container = {
    hasRegistration: (key: string) => key === PAYLOAD_MODULE,
    resolve: (key: string) =>
      key === PAYLOAD_MODULE
        ? service
        : key === ContainerRegistrationKeys.QUERY
          ? { graph }
          : { info: jest.fn(), warn: jest.fn() },
  };
  return { container };
}

describe("reconcile", () => {
  beforeEach(() => {
    markDeleted.mockClear();
    writeDocument.mockReset();
    writeDocument.mockImplementation(async () => ({
      result: { id: 1, created: false, missing: [] as string[] },
    }));
  });

  it("does not mark a record created during the run as deleted", async () => {
    const { container } = race();
    const run = await reconcile(container as never, { kind: "reconcile" });
    expect(markDeleted).not.toHaveBeenCalled();
    expect(run?.collections.products).toMatchObject({ deleted: 0, unchanged: 1, failed: 0 });
  });

  it("reads Medusa in pages of 200 ordered by id, each after the last id of the one before", async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `prod_${String(i).padStart(4, "0")}`);
    const graph = jest.fn(async (input: Record<string, unknown>) => {
      if (input["entity"] !== "product") return { data: [] };
      const after = (input["filters"] as { id?: { $gt: string } } | undefined)?.id?.$gt;
      const { take } = input["pagination"] as { take: number };
      return {
        data: ids
          .filter((id) => after === undefined || id > after)
          .slice(0, take)
          .map(product),
      };
    });
    const run = await reconcile(containerOf(graph, []) as never, { kind: "reconcile" });

    const productReads = graph.mock.calls
      .map(([input]) => input)
      .filter((input) => input["entity"] === "product");
    expect(productReads).toHaveLength(3);
    expect(productReads.map((input) => input["pagination"])).toEqual(
      Array(3).fill({ take: RECONCILE_PAGE_SIZE, order: { id: "ASC" } }),
    );
    expect(productReads.map((input) => input["filters"])).toEqual([
      undefined,
      { id: { $gt: "prod_0199" } },
      { id: { $gt: "prod_0399" } },
    ]);
    expect(run?.collections.products).toMatchObject({ created: 450, failed: 0, deleted: 0 });
    expect(writeDocument).toHaveBeenCalledTimes(450);
  });

  it("marks nothing deleted when a page cannot be read", async () => {
    const graph = jest.fn(async (input: Record<string, unknown>) => {
      if (input["entity"] !== "product") return { data: [] };
      if (input["filters"] !== undefined) throw new Error("connection reset");
      return { data: Array.from({ length: RECONCILE_PAGE_SIZE }, (_, i) => product(`prod_${i}`)) };
    });
    const stored = [listed("prod_zzz", 1)];
    const run = await reconcile(containerOf(graph, stored) as never, { kind: "reconcile" });
    expect(markDeleted).not.toHaveBeenCalled();
    expect(run?.collections.products.failed).toBe(1);
    expect(run?.errors).toContain("products: connection reset");
  });

  it("writes a category again after the last page when its parent came on a later page", async () => {
    const category = (id: string, parent: string | null) => ({
      id,
      handle: id,
      name: id,
      rank: 0,
      parent_category_id: parent,
      updated_at: UPDATED_AT,
      deleted_at: null,
    });
    // The child sorts before its parent, and the page boundary falls between them.
    const records = [
      ...Array.from({ length: RECONCILE_PAGE_SIZE - 1 }, (_, i) =>
        category(`pcat_a${String(i).padStart(3, "0")}`, null),
      ),
      category("pcat_b_child", "pcat_c_parent"),
      category("pcat_c_parent", null),
    ];
    const graph = jest.fn(async (input: Record<string, unknown>) => {
      if (input["entity"] !== "product_category") return { data: [] };
      const after = (input["filters"] as { id?: { $gt: string } } | undefined)?.id?.$gt;
      return {
        data: records
          .filter((r) => after === undefined || r.id > after)
          .slice(0, RECONCILE_PAGE_SIZE),
      };
    });
    const inPayload = new Set<string>();
    writeDocument.mockImplementation(async (input: unknown) => {
      const { document } = input as {
        document: { fields: { medusaId: string }; references: { parent?: string | null } };
      };
      inPayload.add(document.fields.medusaId);
      const parent = document.references.parent;
      return {
        result: { id: 1, created: true, missing: parent && !inPayload.has(parent) ? [parent] : [] },
      };
    });
    const run = await reconcile(containerOf(graph, []) as never, { kind: "reconcile" });
    const childWrites = writeDocument.mock.calls.filter(
      ([input]) =>
        (input as { document: { fields: { medusaId: string } } }).document.fields.medusaId ===
        "pcat_b_child",
    );
    expect(childWrites).toHaveLength(2);
    expect(run?.collections.categories).toMatchObject({
      created: RECONCILE_PAGE_SIZE + 1,
      failed: 0,
    });
  });

  describe("the late parent's second write (PR 150 review, items 2 and 3)", () => {
    const category = (id: string, parent: string | null) => ({
      id,
      handle: id,
      name: id,
      rank: 0,
      parent_category_id: parent,
      updated_at: UPDATED_AT,
      deleted_at: null,
    });
    // The child ends page 1; its parent would be on page 2.
    const pageOne = [
      ...Array.from({ length: RECONCILE_PAGE_SIZE - 1 }, (_, i) =>
        category(`pcat_a${String(i).padStart(3, "0")}`, null),
      ),
      category("pcat_b_child", "pcat_c_parent"),
    ];
    const childWrites = () =>
      writeDocument.mock.calls.filter(
        ([input]) =>
          (input as { document: { fields: { medusaId: string } } }).document.fields.medusaId ===
          "pcat_b_child",
      ).length;
    const missingParent = (fail: (writes: number) => boolean) => {
      let childWritten = 0;
      writeDocument.mockImplementation(async (input: unknown) => {
        const { document } = input as {
          document: { fields: { medusaId: string }; references: { parent?: string | null } };
        };
        if (document.fields.medusaId === "pcat_b_child") {
          childWritten++;
          if (fail(childWritten)) throw new Error("payload down");
        }
        return {
          result: {
            id: 1,
            created: true,
            missing: document.references.parent ? [document.references.parent] : [],
          },
        };
      });
    };

    it("still writes it when a later page cannot be read", async () => {
      missingParent(() => false);
      const graph = jest.fn(async (input: Record<string, unknown>) => {
        if (input["entity"] !== "product_category") return { data: [] };
        if (input["filters"] !== undefined) throw new Error("connection reset");
        return { data: pageOne };
      });
      await reconcile(containerOf(graph, []) as never, { kind: "reconcile" });
      expect(childWrites()).toBe(2);
    });

    it("moves the document's count to failed when it fails, so each record counts once", async () => {
      missingParent((writes) => writes === 2);
      const graph = jest.fn(async (input: Record<string, unknown>) => {
        if (input["entity"] !== "product_category") return { data: [] };
        const after = (input["filters"] as { id?: { $gt: string } } | undefined)?.id?.$gt;
        return {
          data: after === undefined ? pageOne : [category("pcat_c_parent", null)],
        };
      });
      const run = await reconcile(containerOf(graph, []) as never, { kind: "reconcile" });
      expect(run?.collections.categories).toMatchObject({
        created: RECONCILE_PAGE_SIZE,
        failed: 1,
      });
      expect(run?.errors).toContain("categories pcat_b_child: payload down");
    });
  });
});

/** A container whose Query answers `graph` and whose Payload lists `stored` as its products. */
function containerOf(
  graph: (input: Record<string, unknown>) => Promise<{ data: unknown[] }>,
  stored: Listed[],
) {
  const service = {
    listDocuments: jest.fn(async (collection: string) => (collection === "products" ? stored : [])),
    recordRun: jest.fn(),
  };
  return {
    hasRegistration: (key: string) => key === PAYLOAD_MODULE,
    resolve: (key: string) =>
      key === PAYLOAD_MODULE
        ? service
        : key === ContainerRegistrationKeys.QUERY
          ? { graph }
          : { info: jest.fn(), warn: jest.fn() },
  };
}
