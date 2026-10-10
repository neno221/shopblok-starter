import { revalidateTag } from "next/cache";

// S1 prototype: `revalidateTag(tag, profile)` from a route handler. POST ?tag=…&profile=max|expire0.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag") ?? "";
  const profile = url.searchParams.get("profile") === "max" ? "max" : { expire: 0 };
  if (tag === "") return Response.json({ error: "tag is required" }, { status: 400 });
  revalidateTag(tag, profile);
  return Response.json({ tag, profile });
}
