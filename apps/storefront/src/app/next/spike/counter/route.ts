import { connection } from "next/server";
import { runs } from "../../../../lib/spike/s1";

// S1 prototype: how often each cached loader really ran in this server process.
export async function GET() {
  await connection();
  return Response.json(runs);
}
