import type { MarketMap } from "../markets/types";
import { safeRedirect } from "../safe-redirect";
import { secretMatches } from "../secret";

/** What the preview routes need from the request's world, so a test can hand in fakes. */
export type PreviewDeps = {
  /** `PREVIEW_SECRET`. */
  secret: string | undefined;
  /** Whether the request carries a Payload session of a `users` (staff) document. */
  staffSignedIn: (headers: Headers) => Promise<boolean>;
  marketMap: () => Promise<MarketMap>;
  draftMode: () => Promise<{ enable(): void; disable(): void }>;
};

const redirectTo = (location: string, status: 303 | 307) =>
  new Response(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });

const refuse = (status: 400 | 401, message: string) =>
  new Response(message, { status, headers: { "Cache-Control": "no-store" } });

/**
 * `GET /next/preview?secret=…&path=…` (D74): Draft Mode for a staff member, then a 307 to the page.
 * In this order: the secret (401), a Payload session of a `users` document (401: an integration's
 * key or no session; the secret alone is not enough, so a leaked link shows nothing), the path
 * (400 unless `safeRedirect` accepts it), and only then `enable()`.
 */
export async function previewResponse(request: Request, deps: PreviewDeps): Promise<Response> {
  const url = new URL(request.url);
  if (!secretMatches(url.searchParams.get("secret"), deps.secret)) {
    return refuse(401, "Preview needs the preview secret.");
  }
  if (!(await deps.staffSignedIn(request.headers))) {
    return refuse(401, "Sign in to the admin to preview.");
  }
  const path = safeRedirect(url.searchParams.get("path"), url.host, await deps.marketMap());
  if (path === null) return refuse(400, "Not a page of the shop.");
  (await deps.draftMode()).enable();
  return redirectTo(path, 307);
}

/** The `path` of a form post (the exit button) or of the query string. */
async function pathOf(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get("path");
  if (fromQuery !== null) return fromQuery;
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("form")) return null;
  try {
    const value = (await request.formData()).get("path");
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/**
 * `POST /next/exit-preview` (D74): Draft Mode off and a 303 to the published page, its path checked
 * by `safeRedirect` like the preview's; anything it refuses goes to the primary market's home, so a
 * cross-site form cannot use the route as an open redirect. POST only: a link or an image cannot
 * turn preview off.
 */
export async function exitPreviewResponse(
  request: Request,
  deps: Pick<PreviewDeps, "marketMap" | "draftMode">,
): Promise<Response> {
  (await deps.draftMode()).disable();
  const path = safeRedirect(
    await pathOf(request),
    new URL(request.url).host,
    await deps.marketMap(),
  );
  return redirectTo(path ?? "/", 303);
}
