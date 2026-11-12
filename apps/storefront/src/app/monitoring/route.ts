import { connection } from "next/server";

// The browser's Sentry tunnel (M6 D125, T96): the browser posts its envelopes to the site's own
// `/monitoring`, which forwards only the body to the DSN's Sentry (`@sentry/nextjs/tunnel`'s handler,
// which refuses another DSN and anything over 20 MiB). The SDK's `tunnelRoute` option would rewrite
// to Sentry's host with every request header, cookies included, and is not used. The proxy's
// matcher skips this path. Without a DSN at build the route is a 404 and loads nothing.
export async function POST(request: Request): Promise<Response> {
  await connection();
  // The literal first: a build without a DSN drops the import below with it.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return new Response("Not Found", { status: 404 });
  const { createSentryTunnelRoute } = await import("@sentry/nextjs/tunnel");
  return createSentryTunnelRoute({
    allowedDsns: [process.env.NEXT_PUBLIC_SENTRY_DSN.trim()],
  }).POST(request);
}
