import "server-only";
import { sql } from "@payloadcms/db-postgres";
import { getPayloadClient } from "../cms/payload";
import { e2eGate } from "./gate";

// Test-only (`/next/e2e/consent-records`, 404 unless E2E_TEST_ROUTES=true; T109, D145), for
// `consent.spec.ts`:
// - `GET`: the columns of the records' table, as Postgres lists them (the spec checks that none
//   holds an address, a browser or a customer);
// - `POST ?aged=<months>&id=<consentId>`: a record of that id written that many months ago (its
//   `created_at` moved back in the table, which no API can do);
// - `POST ?run=retention`: queues the retention task and runs that job, as the queue's runner
//   would once it is due; answers whether it completed.

type Drizzle = {
  execute(query: ReturnType<typeof sql>): Promise<{ rows: Record<string, unknown>[] }>;
};

const drizzleOf = (payload: Awaited<ReturnType<typeof getPayloadClient>>) =>
  (payload.db as unknown as { drizzle: Drizzle }).drizzle;

export async function consentRecordColumns(): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const payload = await getPayloadClient();
  const { rows } = await drizzleOf(payload).execute(
    sql`select column_name from information_schema.columns where table_name = 'consent_records' order by column_name`,
  );
  return Response.json({ columns: rows.map((row) => String(row.column_name)) });
}

export async function consentRecordsTask(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const params = new URL(request.url).searchParams;
  const payload = await getPayloadClient();
  if (params.get("run") === "retention") {
    const job = await payload.jobs.queue({ task: "consent-retention", input: {} });
    await payload.jobs.runByID({ id: job.id, overrideAccess: true });
    // Payload deletes a job once it completes; one left behind has failed.
    const left = await payload.find({
      collection: "payload-jobs",
      where: { id: { equals: job.id } },
      depth: 0,
      overrideAccess: true,
    });
    return Response.json({ job: job.id, completed: left.docs.length === 0 });
  }
  const months = Number(params.get("aged"));
  const consentId = params.get("id") ?? "";
  if (!Number.isInteger(months) || months <= 0 || !/^[A-Za-z0-9_-]{16,64}$/.test(consentId))
    return Response.json({ error: "aged and id" }, { status: 400 });
  const record = await payload.create({
    collection: "consent-records",
    data: {
      consentId,
      kind: "given",
      analytics: false,
      marketing: false,
      policyVersion: 1,
      market: "us",
      language: "en",
    },
    overrideAccess: true,
    depth: 0,
  });
  const then = new Date();
  then.setUTCMonth(then.getUTCMonth() - months);
  await drizzleOf(payload).execute(
    sql`update consent_records set created_at = ${then.toISOString()} where id = ${record.id}`,
  );
  return Response.json({ id: record.id, createdAt: then.toISOString() });
}
