// M7 D138 (T106): the static Content Security Policy, for every route without a nonce (the catalog,
// CMS pages, the journal, search, the design system; T107 puts the nonce policy on the nine routes
// that get one, and the admin's on `/admin` and Payload's `/api`). One table of hosts, each with the
// line or the file that needs it, and one builder. Nothing here reads `process.env`: `next.config.ts`
// computes the policy once when `next build` runs (`cspSettings(process.env, …)`) and writes it into
// the bundles as `SHOPBLOK_CSP_HEADER` and `SHOPBLOK_CSP_POLICY`, so the proxy (`staticCsp()`) and
// `headers()` send exactly the same string, and a new host or mode is a new build (as `S3_PUBLIC_URL`
// already is for the pictures, `lib/media-host.ts`).
//
// The hosts are the ones the inventory recorded (`e2e/support/csp.ts` in recording mode, SETUP.md
// "Headers and the static CSP (T106)"), plus Stripe's entries the test cards do not reach. PostHog
// and Sentry need none: the browser talks to the shop's own `/ingest` and `/monitoring`.

/** The directives the table adds hosts to. */
export type HostDirective = "script-src" | "connect-src" | "frame-src" | "img-src" | "form-action";

/** What a host is for: `always`, or only in a build with that integration's key. */
export type HostCondition = "always" | "stripe";

export type CspHost = {
  readonly directive: HostDirective;
  /** A CSP source expression: `https://js.stripe.com`, `https://*.js.stripe.com`. */
  readonly source: string;
  readonly when: HostCondition;
  /** Where the entry comes from: the guide's line, or the file that needs it. */
  readonly why: string;
};

const STRIPE_GUIDE = "docs.stripe.com/security/guide, Content Security Policy";

/**
 * Every foreign host the static policy allows. Stripe's only in a build with
 * `NEXT_PUBLIC_STRIPE_KEY` (D114: without its key the shop runs as before M6, and loads nothing of
 * Stripe's); the video block's two always, since an editor can add one at any time.
 */
export const CSP_HOSTS: readonly CspHost[] = [
  {
    directive: "script-src",
    source: "https://js.stripe.com",
    when: "stripe",
    why: `${STRIPE_GUIDE}, "Stripe.js": script-src https://js.stripe.com (components/checkout/stripe/stripe-client.ts, loadStripe)`,
  },
  {
    directive: "script-src",
    source: "https://*.js.stripe.com",
    when: "stripe",
    why: `${STRIPE_GUIDE}, "Stripe.js": script-src https://*.js.stripe.com ("allows Stripe.js to … start frames on different origins")`,
  },
  {
    directive: "connect-src",
    source: "https://api.stripe.com",
    when: "stripe",
    why: `${STRIPE_GUIDE}, "Stripe.js": connect-src https://api.stripe.com (the ConfirmationToken, confirmPayment)`,
  },
  {
    directive: "frame-src",
    source: "https://js.stripe.com",
    when: "stripe",
    why: `${STRIPE_GUIDE}, "Stripe.js": frame-src https://js.stripe.com (the Payment and Express Checkout Elements)`,
  },
  {
    directive: "frame-src",
    source: "https://*.js.stripe.com",
    when: "stripe",
    why: `${STRIPE_GUIDE}, "Stripe.js": frame-src https://*.js.stripe.com`,
  },
  {
    directive: "frame-src",
    source: "https://hooks.stripe.com",
    when: "stripe",
    why: `${STRIPE_GUIDE}: "a payment method with redirect functions (for example, cards that might require 3D Secure …)": frame-src https://hooks.stripe.com`,
  },
  {
    directive: "frame-src",
    source: "https://www.youtube-nocookie.com",
    when: "always",
    why: "The video block's YouTube embed (packages/registry/src/contracts/sections.ts, VIDEO_PROVIDERS; packages/ui's video section)",
  },
  {
    directive: "frame-src",
    source: "https://player.vimeo.com",
    when: "always",
    why: "The video block's Vimeo embed (packages/registry/src/contracts/sections.ts, VIDEO_PROVIDERS; packages/ui's video section)",
  },
];

/** The two header names `CSP_MODE` picks between (D140). */
export const CSP_HEADER = {
  enforce: "Content-Security-Policy",
  "report-only": "Content-Security-Policy-Report-Only",
} as const;

export type CspMode = keyof typeof CSP_HEADER;
export type CspHeaderName = (typeof CSP_HEADER)[CspMode];

/** The shop's own report route (D140; `app/next/csp-report/route.ts`). */
export const CSP_REPORT_PATH = "/next/csp-report";
/** The name `report-to` and `Reporting-Endpoints` share. */
export const CSP_REPORT_GROUP = "csp-endpoint";

/**
 * `CSP_MODE` (D140): `enforce` when blank, else `enforce` or `report-only`; any other value throws,
 * so a typo never turns the policy off by accident (`doctor`'s `csp-mode` check names it first).
 */
export function cspMode(value: string | undefined): CspMode {
  const mode = (value ?? "").trim();
  if (mode === "" || mode === "enforce") return "enforce";
  if (mode === "report-only") return "report-only";
  throw new Error(`CSP_MODE must be enforce or report-only, or blank (it is "${mode}")`);
}

/** The origin of `S3_PUBLIC_URL` (R2's public URL, M6 D127), for `img-src`; `undefined` when blank. */
export function mediaOrigin(value: string | undefined): string | undefined {
  const text = (value ?? "").trim();
  if (text === "") return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.origin;
  } catch {
    // `mediaRemotePatterns` refuses the build first, with the reason.
    return undefined;
  }
}

export type StaticPolicyOptions = {
  /** `next dev`: React's debugging needs `'unsafe-eval'` (Next's CSP guide). Never in a build. */
  readonly dev: boolean;
  /** A build with `NEXT_PUBLIC_STRIPE_KEY`. */
  readonly stripe: boolean;
  /** `S3_PUBLIC_URL`'s origin, when R2 holds the pictures. */
  readonly media?: string | undefined;
  /** D138's `upgrade-insecure-requests`: off only for a site served over plain http (`cspSettings`). */
  readonly upgradeInsecureRequests: boolean;
};

const hostsFor = (directive: HostDirective, stripe: boolean): string[] =>
  CSP_HOSTS.filter(
    (host) => host.directive === directive && (host.when === "always" || stripe),
  ).map((host) => host.source);

/**
 * The static policy (D138) as one header value. `'unsafe-inline'` stays in `script-src`: Next's
 * prerendered shells inline their RSC payload in scripts that cannot carry a nonce (Next's guide:
 * partial prerendering "is incompatible with nonce-based CSP"), and T106's SRI try (SETUP.md) found
 * the same of `experimental.sri`.
 */
export function staticPolicy(options: StaticPolicyOptions): string {
  const { dev, stripe, media } = options;
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        "'unsafe-inline'",
        ...(dev ? ["'unsafe-eval'"] : []),
        ...hostsFor("script-src", stripe),
      ],
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    [
      "img-src",
      [
        "'self'",
        "data:",
        "blob:",
        ...(media === undefined ? [] : [media]),
        ...hostsFor("img-src", stripe),
      ],
    ],
    // The video block's uploads and their captions (`<video>`, `<track>`): Payload's media on the
    // shop's origin or R2's (`S3_PUBLIC_URL`), and `data:` for the design system's video fixture
    // (packages/fixtures, an empty MP4 and a WebVTT text), which the DS job found blocked under
    // `default-src` (T106's first CI run). Media cannot run code.
    ["media-src", ["'self'", "data:", ...(media === undefined ? [] : [media])]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...hostsFor("connect-src", stripe)]],
    ["frame-src", ["'self'", ...hostsFor("frame-src", stripe)]],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'", ...hostsFor("form-action", stripe)]],
    ["frame-ancestors", ["'self'"]],
  ];
  const parts = directives.map(([name, sources]) => `${name} ${unique(sources).join(" ")}`);
  if (options.upgradeInsecureRequests) parts.push("upgrade-insecure-requests");
  parts.push(`report-uri ${CSP_REPORT_PATH}`, `report-to ${CSP_REPORT_GROUP}`);
  return parts.join("; ");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** The `Reporting-Endpoints` header's value, which `report-to` names (D140). */
export const REPORTING_ENDPOINTS = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

export type CspSettings = { readonly header: CspHeaderName; readonly policy: string };

/**
 * The header and policy a build sends, from the build's environment: `CSP_MODE`,
 * `NEXT_PUBLIC_STRIPE_KEY`, `S3_PUBLIC_URL`, and `NEXT_PUBLIC_BASE_URL`. A site the base URL puts on
 * plain http (CI's and a PC's `http://localhost:8000`) gets no `upgrade-insecure-requests`:
 * Chromium leaves a request to `http://localhost` alone but upgrades a redirect's target, even on
 * localhost (T106's probe: a `fetch` answered 307 went on to `https://localhost/…` and failed), so
 * every client-side redirect there (the cart's to the checkout) fell back to a full page load. A
 * blank base URL (a deployment's) and an https one keep it. `dev` is `next dev`.
 */
export function cspSettings(
  source: Readonly<Record<string, string | undefined>>,
  dev: boolean,
): CspSettings {
  const base = (source.NEXT_PUBLIC_BASE_URL ?? "").trim().toLowerCase();
  return {
    header: CSP_HEADER[cspMode(source.CSP_MODE)],
    policy: staticPolicy({
      dev,
      stripe: (source.NEXT_PUBLIC_STRIPE_KEY ?? "").trim() !== "",
      media: mediaOrigin(source.S3_PUBLIC_URL),
      upgradeInsecureRequests: !base.startsWith("http://"),
    }),
  };
}
