import { connection } from "next/server";
import { statusResponse } from "../../../lib/status/status";

// D58: is the shop's data reachable? Under `/next`, which the proxy's matcher skips.
export async function GET(): Promise<Response> {
  // Without this Next prerenders the handler at build and the answer would never change.
  await connection();
  return statusResponse();
}
