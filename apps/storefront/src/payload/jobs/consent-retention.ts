import type { Payload, TaskConfig } from "payload";
import { CONSENT_RECORD_MONTHS } from "../collections/consent-records";

/** The moment before which a consent record is deleted: 13 months before `now` (D145). */
export function retentionCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - CONSENT_RECORD_MONTHS);
  return cutoff;
}

/** Deletes the consent records older than 13 months; answers how many went. */
export async function deleteExpiredConsentRecords(payload: Payload, now = new Date()) {
  const { docs } = await payload.delete({
    collection: "consent-records",
    where: { createdAt: { less_than: retentionCutoff(now).toISOString() } },
    overrideAccess: true,
    depth: 0,
  });
  return docs.length;
}

/**
 * M7 D145 (T109): the consent records' retention, a task on Payload's queue. Scheduled once a day
 * (03:17 UTC): whatever runs the queue (`GET /api/payload-jobs/run`, every minute: Medusa's worker
 * on a deployment, D148; `instrumentation.ts`'s timer in development) queues it when it is due
 * (Payload's `handleSchedules`) and runs it.
 */
export const consentRetentionTask: TaskConfig<"consent-retention"> = {
  slug: "consent-retention",
  label: "Delete consent records older than 13 months",
  schedule: [{ cron: "17 3 * * *", queue: "default" }],
  outputSchema: [{ name: "deleted", type: "number", required: true }],
  handler: async ({ req }) => ({
    output: { deleted: await deleteExpiredConsentRecords(req.payload) },
  }),
};
