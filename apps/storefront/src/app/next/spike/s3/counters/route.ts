// S3 PROTOTYPE (not for main): the filter's call and read counters, for L7.
import { connection } from "next/server";
import { s3Counters } from "../../../../../payload/filter-available-locales";

export async function GET(request: Request) {
  await connection();
  const snapshot = { ...s3Counters, pid: process.pid, uptime: process.uptime() };
  if (new URL(request.url).searchParams.get("reset") === "1") {
    s3Counters.calls = 0;
    s3Counters.reads = 0;
    s3Counters.byRequest = {};
  }
  return Response.json(snapshot);
}
