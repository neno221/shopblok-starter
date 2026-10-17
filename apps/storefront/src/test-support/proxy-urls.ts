// The URLs `proxy.test.ts` checks the proxy's matcher on, shared with `next-config.test.ts`, which
// checks that D54's root-file rewrite (T28) agrees with the matcher's file rule on the same URLs.

/** Storefront paths: the proxy runs on each. */
export const storefrontPaths = [
  "/",
  "/us",
  "/us/",
  "/ch/fr/store",
  "/store",
  "/products/shirt",
  "/el-cy", // an internal key: the proxy has to be the one to answer 404
  "/administrator", // starts like /admin, is a storefront path
  "/apis",
  "/nextstep",
  "/design-systems", // starts like /design-system, is a storefront path
  "/design-system-2/en",
  "/_not-found",
  "/cy/store?page=2",
  "/products/1.5l-bottle", // a dot in a slug is not a file
  "/ch/fr/store/size-8.5",
  "/size-8.5", // the same at the root: a market path, not a file (D54)
  "/cy/evil.example/x", // the dot is not in the last segment
];

/** Paths the proxy leaves alone: Payload's, the DS pages, `/next`, Next's and Vercel's, and files. */
export const pathsLeftAlone = [
  "/admin",
  "/admin/",
  "/admin/collections/pages",
  "/admin/login",
  "/api",
  "/api/pages",
  "/api/users/first-register",
  "/design-system",
  "/design-system/",
  "/design-system/en",
  "/design-system/el/foundations/colors",
  "/design-system/de/frame/atoms/button",
  "/next/preview",
  "/next/exit-preview",
  "/_next/static/chunks/main.js",
  "/_next/image",
  "/_next/data/build/index.json",
  "/_vercel/insights/script.js",
  "/_vercel/insights/view", // no dot: only the /_vercel/ rule leaves it alone
  "/_vercel/speed-insights/vitals",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/wp-login.php",
  "/us/robots.txt", // a file in a market: the page behind `[market]` decides (D54)
  "/images/logo.png",
  "/images/logo.min.js",
  "/.well-known/security.txt",
  "/.well-known/apple-app-site-association", // no extension: only the /.well-known/ rule
  "/cy/evil.example", // the last segment is a file name to the matcher
];
