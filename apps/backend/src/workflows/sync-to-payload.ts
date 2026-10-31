import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { PAYLOAD_MODULE } from "../modules/payload";
import type { SyncCollection, SyncDocument } from "../modules/payload/mapping";
import type PayloadModuleService from "../modules/payload/service";
import type { Snapshot } from "../modules/payload/service";

/**
 * The Medusa → Payload sync's writes (D75), one document per run, each step with its
 * compensation: if a later step fails, the document is put back as it was (or removed, when the
 * run created it), so Payload never keeps half of a write. The reads from Medusa and the choice of
 * what to write are in `src/lib/payload-sync.ts`.
 */

type DocumentInput = { collection: SyncCollection; document: SyncDocument };

type Undo = { collection: SyncCollection; id: number | string; previous: Snapshot | null };

export const writePayloadDocumentStep = createStep(
  "write-payload-document",
  async ({ collection, document }: DocumentInput, { container }) => {
    const payload: PayloadModuleService = container.resolve(PAYLOAD_MODULE);
    const { id, previous } = await payload.writeDocument(collection, document);
    return new StepResponse({ id, created: previous === null }, {
      collection,
      id,
      previous,
    } satisfies Undo);
  },
  async (undo: Undo | undefined, { container }) => {
    if (!undo) return;
    const payload: PayloadModuleService = container.resolve(PAYLOAD_MODULE);
    if (undo.previous === null) await payload.removeDocument(undo.collection, undo.id);
    else await payload.restoreDocument(undo.collection, undo.id, undo.previous);
  },
);

/** The references, as Payload ids, once the document exists (a category's parent). */
export const linkPayloadReferencesStep = createStep(
  "link-payload-references",
  async (
    input: {
      collection: SyncCollection;
      id: number | string;
      references: SyncDocument["references"];
    },
    { container },
  ) => {
    const payload: PayloadModuleService = container.resolve(PAYLOAD_MODULE);
    return new StepResponse(
      await payload.linkReferences(input.collection, input.id, input.references),
    );
  },
);

export const syncPayloadDocumentWorkflow = createWorkflow(
  "sync-payload-document",
  (input: DocumentInput) => {
    const written = writePayloadDocumentStep(input);
    const link = transform({ input, written }, ({ input, written }) => ({
      collection: input.collection,
      id: written.id,
      references: input.document.references,
    }));
    const linked = linkPayloadReferencesStep(link);
    return new WorkflowResponse(
      transform({ written, linked }, ({ written, linked }) => ({ ...written, ...linked })),
    );
  },
);

/** Soft delete (D75), for a record Medusa no longer has at all. */
export const markPayloadDeletedStep = createStep(
  "mark-payload-deleted",
  async (input: { collection: SyncCollection; medusaId: string }, { container }) => {
    const payload: PayloadModuleService = container.resolve(PAYLOAD_MODULE);
    const written = await payload.markDeleted(input.collection, input.medusaId);
    return new StepResponse(
      { found: written !== null },
      written === null ? undefined : ({ collection: input.collection, ...written } satisfies Undo),
    );
  },
  async (undo: Undo | undefined, { container }) => {
    if (!undo?.previous) return;
    const payload: PayloadModuleService = container.resolve(PAYLOAD_MODULE);
    await payload.restoreDocument(undo.collection, undo.id, undo.previous);
  },
);

export const markPayloadDeletedWorkflow = createWorkflow(
  "mark-payload-deleted",
  (input: { collection: SyncCollection; medusaId: string }) =>
    new WorkflowResponse(markPayloadDeletedStep(input)),
);
