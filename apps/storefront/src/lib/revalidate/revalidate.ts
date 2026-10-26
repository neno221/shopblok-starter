import { createHash, timingSafeEqual } from "node:crypto";
import { env, type RawEnv } from "../env";

// `/api/revalidate` (D58, SPEC §6.2 and §8.3): Medusa's subscriber and its ten-minute job POST
// `{ tags, expire? }` here with `Authorization: Bearer <REVALIDATE_SECRET>`. Prices and stock come
// with `expire: 0` (fresh on the next request), everything else with `"max"` (the old page is
// served while the new one renders, so a refresh during an outage never meets an expired entry).

/**
 * The catalog's tags (D58): the ones the data layer's `cached()` reads carry, and the per-handle
 * ones. A handle is Medusa's (lowercase, digits, `-` and `_`); a category's may be nested
 * (`men/shirts`). Nothing else is accepted, so a leaked secret cannot reach the market map
 * (`global:markets`) or the CMS's tags.
 */
const ALLOWED_TAG =
  /^(?:medusa:(?:products|regions|categories|collections)|search|navigation|(?:product|category|collection):[a-z0-9][\w-]*(?:\/[a-z0-9][\w-]*)*)$/;

/** One event names a handful of tags; a request with more than this is not one of Medusa's. */
const MAX_TAGS = 100;
const MAX_TAG_LENGTH = 200;

export type Expire = 0 | "max";
export type Revalidate = (tag: string, profile: "max" | { expire: 0 }) => void;

export type RevalidateBody = { tags: string[]; expire: Expire };

/** The request's body, or the reason it is refused. */
export function parseBody(body: unknown): RevalidateBody | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "body must be an object" };
  const { tags, expire = "max" } = body as { tags?: unknown; expire?: unknown };
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS) {
    return { error: `tags must be a list of 1 to ${MAX_TAGS} tags` };
  }
  if (expire !== 0 && expire !== "max") return { error: 'expire must be 0 or "max"' };
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.length > MAX_TAG_LENGTH || !ALLOWED_TAG.test(tag)) {
      return { error: `unknown tag: ${String(tag).slice(0, MAX_TAG_LENGTH)}` };
    }
  }
  return { tags: [...new Set(tags as string[])], expire };
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Whether the request carries the shared secret. Both sides are hashed first, so the comparison
 * runs on two buffers of one length (`timingSafeEqual` throws on unequal lengths, which would tell
 * a caller the secret's length) and takes the same time wherever they differ.
 */
export function hasSecret(request: Request, source: RawEnv = env): boolean {
  const secret = source.REVALIDATE_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return timingSafeEqual(digest(given), digest(secret));
}

export async function revalidateResponse(
  request: Request,
  revalidate: Revalidate,
  source: RawEnv = env,
): Promise<Response> {
  if (!source.REVALIDATE_SECRET?.trim()) {
    console.error("[revalidate] REVALIDATE_SECRET is not set: every call is refused");
  }
  if (!hasSecret(request, source)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const body = parseBody(json);
  if ("error" in body) return Response.json({ error: body.error }, { status: 400 });
  const profile = body.expire === 0 ? { expire: 0 as const } : "max";
  for (const tag of body.tags) revalidate(tag, profile);
  return Response.json({ revalidated: body.tags, expire: body.expire });
}
