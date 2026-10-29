import "server-only";
import { draftMode } from "next/headers";
import { revalidateTag } from "next/cache";
import { e2eGate } from "./gate";
import type { PagesRead } from "./reads";
import { runs } from "./runs";

// The bodies of the routes under `/next/e2e`. Each one asks the gate first (`gate.ts`): off, it is a
// 404 and nothing below runs.

const LOCALE = /^[a-z]{2,3}$/;
// Only the tags the specs revalidate: the test-only entries (`e2e:*`) and the two families the
// `pages` hook revalidates, `pages:<language>` and `payload:pages`. Those two are the shop's own
// too (the cached reads of CMS pages carry them, T65), so a gate that failed open could still
// refresh them; it could not touch the Medusa catalog (`medusa:*`) or the market map
// (`global:markets`).
const ALLOWED_TAG = /^(?:e2e:[\w:-]+|pages:[a-z]{2,3}|payload:pages)$/;

/** `GET ?locale=el` through one of the cached reads, as JSON. */
export async function respondWithRead(
  request: Request,
  read: (locale: string) => Promise<PagesRead>,
): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (!LOCALE.test(locale)) return Response.json({ error: "bad locale" }, { status: 400 });
  return Response.json(await read(locale));
}

/** `GET`: how often each loader really ran. */
export async function respondWithRuns(): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  return Response.json(runs);
}

/** `GET ?on=1|0`: Draft Mode on or off, as a preview route would after checking its secret. */
export async function respondWithDraftMode(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const on = new URL(request.url).searchParams.get("on") !== "0";
  const draft = await draftMode();
  if (on) draft.enable();
  else draft.disable();
  return Response.json({ draftMode: on });
}

/** `POST ?tag=…&profile=max|expire0`: `revalidateTag` from a route handler (SPEC §8.3). */
export async function respondWithRevalidation(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const params = new URL(request.url).searchParams;
  const tag = params.get("tag") ?? "";
  if (!ALLOWED_TAG.test(tag)) return Response.json({ error: "tag not allowed" }, { status: 400 });
  const profile = params.get("profile") === "max" ? "max" : { expire: 0 };
  revalidateTag(tag, profile);
  return Response.json({ tag, profile });
}
