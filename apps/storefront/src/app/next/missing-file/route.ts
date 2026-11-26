import type { NextRequest } from "next/server";
import { getRenderMarketMap } from "../../../lib/markets/cached-market-map";
import { cmsRedirect } from "../../../lib/markets/proxy-response";
import { resolve } from "../../../lib/markets/resolve";
import { compiledFor } from "../../../lib/redirects/match";
import { readRedirectList } from "../../../lib/redirects/read";

// D54 (T28): where `next.config.ts`'s `afterFiles` rewrite sends a root path that looks like a
// file (`/favicon.png`, `/wp-login.php`) and that no file or route serves (`?file=` names it).
// Without it such a path reaches `[market]` as a market named `wp-login.php`: a 404 page that
// renders the market layout, and in `next dev` a `Could not validate` error in the server log. A
// plain-text 404 is what a crawler or a browser asking for an icon needs. It sits under `/next`,
// which the proxy's matcher leaves alone. It sends the `Cache-Control` of Next's own 404 page, so
// no CDN keeps the 404 once a file or a redirect is added (measured on `next start`, SETUP.md
// "Root files (T28)").
//
// M7 D147 (T110, D82): a CMS redirect from such a path (`/catalog.pdf`) is answered here first, as
// the proxy answers one from any other path: the same list (`readRedirectList`, which
// `/next/redirects` serves the proxy), compiled the same way against the market map, for the
// market the path belongs to on this host (`resolve`), and the same response (`cmsRedirect`: the
// redirect's own code on a GET or HEAD, 308 or 307 otherwise, the query kept). The proxy's matcher
// stays narrow: it skips every file-like path, so this runs only for the ones nothing serves.

const notFoundHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

/** The request as the visitor sent it: the file's own path, the query without the rewrite's `file`. */
function originalUrl(request: NextRequest): URL | undefined {
  const file = request.nextUrl.searchParams.get("file");
  if (file === null || file === "" || file.includes("/")) return undefined;
  const url = new URL(request.nextUrl.origin);
  url.pathname = `/${file}`;
  for (const [name, value] of request.nextUrl.searchParams)
    if (name !== "file") url.searchParams.append(name, value);
  return url;
}

async function answer(request: NextRequest, body: string | null): Promise<Response> {
  const nextUrl = originalUrl(request);
  if (nextUrl !== undefined) {
    const map = await getRenderMarketMap();
    const resolution = resolve(nextUrl, request.headers.get("host") ?? "", map);
    if (resolution.kind === "rewrite") {
      const list = await readRedirectList();
      const redirect = cmsRedirect(
        { method: request.method, nextUrl: nextUrl as NextRequest["nextUrl"] },
        resolution,
        map,
        compiledFor(list, map),
      );
      if (redirect !== undefined) return redirect;
    }
  }
  return new Response(body, { status: 404, headers: notFoundHeaders });
}

export function GET(request: NextRequest): Promise<Response> {
  return answer(request, "Not Found");
}

export function HEAD(request: NextRequest): Promise<Response> {
  return answer(request, null);
}
