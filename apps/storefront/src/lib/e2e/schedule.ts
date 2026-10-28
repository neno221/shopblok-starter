import "server-only";
import { getPayloadClient } from "../cms/payload";
import { e2eGate } from "./gate";

/**
 * `POST ?id=<page>&in=<seconds>`: queues Payload's own `schedulePublish` task for the page, with
 * `waitUntil` that many seconds ahead and the first admin as the user it publishes as. The admin's
 * Schedule Publish drawer queues the same job (`schedulePublishHandler`); nothing runs it until
 * `/api/payload-jobs/run` is called with the cron secret (D74).
 */
export async function schedulePublish(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const params = new URL(request.url).searchParams;
  const id = Number(params.get("id"));
  const seconds = Number(params.get("in") ?? "60");
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(seconds)) {
    return Response.json({ error: "id and in" }, { status: 400 });
  }
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "users",
    where: { role: { equals: "admin" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const admin = docs[0];
  if (admin === undefined) return Response.json({ error: "no admin" }, { status: 409 });
  const waitUntil = new Date(Date.now() + seconds * 1000);
  const job = await payload.jobs.queue({
    task: "schedulePublish",
    input: {
      type: "publish",
      doc: { relationTo: "pages", value: id },
      user: { relationTo: "users", value: admin.id },
    },
    waitUntil,
  });
  return Response.json({ job: job.id, waitUntil: waitUntil.toISOString() });
}
