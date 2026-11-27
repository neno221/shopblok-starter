// M7 D150 (T113): Lighthouse CI on a deployment (staging, a preview) or on any address a dispatch
// names: `.github/workflows/lighthouse.yml` runs `lhci autorun` here with `LHCI_BASE_URL` (the
// deployment's origin). Lighthouse's default profile, which is mobile (a mid-range phone,
// simulated 4G), three runs per page, on D150's pages in two markets (`/` and `/us`): the home, a
// listing, a product page, a CMS page, the cart and the journal. The reports stay on the runner
// (`.lighthouseci/`, uploaded as the run's artifact), never on a public store.
// - **The assertions** (D150, SPEC §13's budgets): performance 0.9 or more, accessibility 1,
//   best practices 0.95 or more, SEO 1, LCP under 2.5 s, CLS under 0.1, TBT under 200 ms (the lab's
//   stand-in for INP's 200 ms), each on the median of the three runs. `is-crawlable` is skipped:
//   staging answers `X-Robots-Tag: noindex` on purpose (T110), and so does every preview.
// - **A protected deployment** (a preview; a production deployment's own `*.vercel.app` address):
//   `lighthouse-bypass.cjs` runs before each page as Lighthouse CI's `puppeteerScript` and makes one
//   request to the deployment itself with Vercel's automation bypass, which answers with a cookie,
//   so the secret never goes to another origin (D136, 3). Lighthouse's own reset before each run
//   empties the browser's cache and its file systems, service workers and cache storage, never its
//   cookies (Lighthouse 13.6's `clearStorageTypes`), so every run is a first visit with a cold
//   cache and still carries the cookie (PR 157 review, item 1). Without the secret (staging's own
//   address, `next start`) there is no script.
// - `CHROME_PATH` names the browser (GitHub's runners have Google Chrome; the cloud VM Playwright's
//   Chromium); Lighthouse CI drives it with `puppeteer-core`, a dev dependency beside `@lhci/cli`.
"use strict";

const base = (process.env.LHCI_BASE_URL ?? "").replace(/\/+$/, "");
/** Whether `value` is an origin and nothing more: no path, query, fragment or user name. */
function isOrigin(value) {
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) && parsed.origin === value;
  } catch {
    return false;
  }
}
// An address with `?` or `#` would put every page after it, and Lighthouse would audit the home
// twelve times (PR 157 review, item 6).
if (!isOrigin(base)) {
  throw new Error(
    "lighthouserc.cjs: set LHCI_BASE_URL to the deployment's origin, such as https://shopblok-abc.vercel.app (no path, query or fragment).",
  );
}

/** The markets (their path prefix) and the pages in each (D150). */
const MARKETS = ["", "/us"];
const PAGES = ["/", "/store", "/products/demo-heritage-hoodie", "/privacy", "/cart", "/journal"];

const urls = MARKETS.flatMap((market) =>
  PAGES.map((page) => `${base}${market}${page === "/" && market !== "" ? "" : page}`),
);

const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "") !== "";

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: 3,
      ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
      ...(bypass
        ? {
            puppeteerScript: "./lighthouse-bypass.cjs",
            puppeteerLaunchOptions: { args: ["--no-sandbox"] },
          }
        : {}),
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        skipAudits: ["is-crawlable"],
      },
    },
    assert: {
      // The median run of each page is judged, not the best one (Lighthouse CI's default).
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 1 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
