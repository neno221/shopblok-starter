// D54 (T28): where `next.config.ts`'s `afterFiles` rewrite sends a root path that looks like a
// file (`/robots.txt`, `/apple-touch-icon.png`) and that no file or route serves. Without it such a
// path reaches `[market]` as a market named `robots.txt`: a 404 page that renders the market
// layout, and in `next dev` a `Could not validate` error in the server log. A plain-text 404 is
// what a crawler or a browser asking for an icon needs. It sits under `/next`, which the proxy's
// matcher leaves alone, and reads nothing, so Cache Components prerenders it. Prerendered, it
// would be sent with `s-maxage=31536000`, so a CDN would keep the 404 for a year, even after M7
// adds `robots.ts`: it sends the `Cache-Control` of Next's own 404 page instead (measured on
// `next start`, SETUP.md "Root files (T28)").
const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

export function GET(): Response {
  return new Response("Not Found", { status: 404, headers });
}

export function HEAD(): Response {
  return new Response(null, { status: 404, headers });
}
