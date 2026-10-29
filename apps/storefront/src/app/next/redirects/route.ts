import { readRedirectList } from "../../../lib/redirects/read";

// D82 (T68): the CMS redirects for `proxy.ts`, which reads them over HTTP like the market map
// (`/next/markets`) so that it never loads Payload (D10). Prerendered at build and refreshed from
// the cached reads under it: the `redirects` tag on a save of a redirect, the pages' and posts' tags
// when a target is renamed, and the market map's 30 s. The proxy keeps the list 30 s more, so a new
// redirect is answered within about a minute. It sits under `/next`, which the proxy's matcher
// leaves alone, and is public: the redirects are what any visitor of an old address gets anyway.
export async function GET() {
  return Response.json(await readRedirectList());
}
