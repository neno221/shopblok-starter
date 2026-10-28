/** Where the site runs when `NEXT_PUBLIC_BASE_URL` is unset: `pnpm dev` and `next start`. */
export const DEFAULT_BASE_URL = "http://localhost:8000";

/**
 * The site's origin (`https://shop.example`: scheme, host and port, no path and no trailing slash)
 * from `NEXT_PUBLIC_BASE_URL`. Every place that compares or builds on it takes this one value:
 * Payload's `serverURL` (its CSRF and CORS lists), live preview's island, which accepts a message
 * only when `event.origin` equals its `serverURL` exactly (`@payloadcms/live-preview`), and the
 * development jobs timer. A raw `http://localhost:8000/` would never equal an origin.
 */
export function siteOrigin(base: string | undefined = process.env.NEXT_PUBLIC_BASE_URL): string {
  const value = base || DEFAULT_BASE_URL;
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_BASE_URL is "${value}", which is not a URL (https://shop.example)`,
    );
  }
}
