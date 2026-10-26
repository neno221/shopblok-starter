import { revalidateTag } from "next/cache";
import { revalidateResponse } from "../../../lib/revalidate/revalidate";

// D58: Medusa's revalidation subscriber and its scheduled job (SPEC §6.2). A POST is never
// prerendered, so no `connection()` is needed.
export async function POST(request: Request): Promise<Response> {
  return revalidateResponse(request, revalidateTag);
}
