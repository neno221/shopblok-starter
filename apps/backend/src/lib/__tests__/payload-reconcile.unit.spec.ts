import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { PAYLOAD_MODULE } from "../../modules/payload";
import type { Listed } from "../../modules/payload/service";
import { reconcile } from "../payload-sync";

// The reconcile's order of reads (PR 91 review, item 1): a record created while a reconcile runs,
// and written to Payload by the subscriber, must never be marked deleted.

const markDeleted = jest.fn(async (_input: unknown) => ({ result: { found: true } }));
const writeDocument = jest.fn(async (_input: unknown) => ({
  result: { id: 1, created: false, missing: [] },
}));

jest.mock("../../workflows/sync-to-payload", () => ({
  syncPayloadDocumentWorkflow: () => ({
    run: ({ input }: { input: unknown }) => writeDocument(input),
  }),
  markPayloadDeletedWorkflow: () => ({
    run: ({ input }: { input: unknown }) => markDeleted(input),
  }),
  syncPayloadMarketsWorkflow: () => ({ run: async () => ({ result: { written: true } }) }),
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
    readMarkets: jest.fn(async () => null),
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
    writeDocument.mockClear();
  });

  it("does not mark a record created during the run as deleted", async () => {
    const { container } = race();
    const run = await reconcile(container as never, { kind: "reconcile" });
    expect(markDeleted).not.toHaveBeenCalled();
    expect(run?.collections.products).toMatchObject({ deleted: 0, unchanged: 1, failed: 0 });
  });
});
