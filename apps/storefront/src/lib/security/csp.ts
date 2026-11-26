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

/** The `script-src` the static policy (D138) and the nonce policy (D139) each start from. */
function scriptSources(options: StaticPolicyOptions, nonce: string | undefined): string[] {
  const { dev, stripe } = options;
  return [
    "'self'",
    // D139: with a nonce, `'strict-dynamic'` lets the nonced scripts load the rest (the chunks Next
    // inserts, Stripe.js, the lazy SDKs); a CSP3 browser then ignores `'self'` and the hosts, which
    // stay for a browser that knows only CSP2. No `'unsafe-inline'`.
    ...(nonce === undefined ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`, "'strict-dynamic'"]),
    ...(dev ? ["'unsafe-eval'"] : []),
    ...hostsFor("script-src", stripe),
  ];
}

function shopPolicy(options: StaticPolicyOptions, nonce: string | undefined): string {
  const { stripe, media } = options;
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSources(options, nonce)],
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
  return finish(directives, options.upgradeInsecureRequests);
}

function finish(directives: [string, string[]][], upgradeInsecureRequests: boolean): string {
  const parts = directives.map(([name, sources]) => `${name} ${unique(sources).join(" ")}`);
  if (upgradeInsecureRequests) parts.push("upgrade-insecure-requests");
  parts.push(`report-uri ${CSP_REPORT_PATH}`, `report-to ${CSP_REPORT_GROUP}`);
  return parts.join("; ");
}

/**
 * The static policy (D138) as one header value. `'unsafe-inline'` stays in `script-src`: Next's
 * prerendered shells inline their RSC payload in scripts that cannot carry a nonce (Next's guide:
 * partial prerendering "is incompatible with nonce-based CSP"), and T106's SRI try (SETUP.md) found
 * the same of `experimental.sri`.
 */
export function staticPolicy(options: StaticPolicyOptions): string {
  return shopPolicy(options, undefined);
}

/**
 * What stands for the nonce in the policy `next.config.ts` writes into the proxy's bundle
 * (`SHOPBLOK_CSP_NONCE_POLICY`); `withNonce` puts each request's nonce in its place. Not base64, so
 * it can never be a real nonce.
 */
export const NONCE_PLACEHOLDER = "{{nonce}}";

/**
 * The nonce policy (D139) for the nine routes of `nonce-routes.ts`: the static policy's every
 * directive and host, with `script-src 'self' 'nonce-…' 'strict-dynamic'` (plus Stripe's hosts in a
 * build with its key) in place of `'unsafe-inline'`. Next reads the nonce back from the request's
 * policy header (`getScriptNonceFromHeader`, `script-src` first) and stamps every script it writes.
 */
export function noncePolicy(options: StaticPolicyOptions & { readonly nonce: string }): string {
  return shopPolicy(options, options.nonce);
}

/** The nonce policy's template with this request's nonce in it. */
export function withNonce(template: string, nonce: string): string {
  if (!NONCE.test(nonce)) throw new Error("a CSP nonce is base64");
  return template.split(NONCE_PLACEHOLDER).join(nonce);
}

/** Next's own pattern for a nonce it reads back (`get-script-nonce-from-header.js`). */
const NONCE = /^[A-Za-z0-9+/_-]+={0,2}$/;

/**
 * A fresh nonce for one response (D139): 16 random bytes from `crypto.getRandomValues`, base64 (24
 * characters). Next's guide uses the same size; CSP asks for at least 128 bits.
 */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

/** Payload's account avatar (D18 keeps it on), the admin's one foreign image host. */
export const GRAVATAR = "https://www.gravatar.com";

export type AdminPolicyOptions = {
  /** `next dev`: as the shop's, `'unsafe-eval'` for React's debugging. */
  readonly dev: boolean;
  /** `S3_PUBLIC_URL`'s origin: the media library's pictures. */
  readonly media?: string | undefined;
  /** `S3_ENDPOINT`'s origin: the admin's browser `PUT`s uploads there (M6's `clientUploads`). */
  readonly uploads?: string | undefined;
  readonly upgradeInsecureRequests: boolean;
};

/**
 * Monaco for Payload's code and JSON fields, from jsdelivr, pinned to its version (D141's fallback).
 * `@payloadcms/ui` ships `@monaco-editor/react` and `@monaco-editor/loader` 1.7.0 inside its own
 * client bundle (`dist/exports/client/chunk-*.js`, made with esbuild), so no module of the shop can
 * reach that loader to give it another path (T107's spike, SETUP.md), and it loads
 * `monaco-editor@0.55.1/min/vs` from here. A path with a trailing slash matches every file under it
 * and nothing else on the host. `csp.test.ts` reads Payload's bundle and fails when a Payload
 * release asks for another version.
 */
export const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/";

/**
 * The admin's policy (D141), for `/admin` and Payload's `/api`, from the admin's specs with the
 * fixture recording (SETUP.md "The nonce CSP and the admin's policy (T107)"). Payload's admin is
 * rendered per request but no proxy runs there to give it a nonce (and its inline scripts carry
 * none), so `'unsafe-inline'` stays, as on the shop's static routes. Monaco's loader and editor,
 * their stylesheet and the web workers they try to start come from `MONACO_CDN`; its codicon font
 * is a `data:` URL in that stylesheet.
 */
export function adminPolicy(options: AdminPolicyOptions): string {
  const { dev, media, uploads } = options;
  const own = (extra: (string | undefined)[]): string[] =>
    extra.filter((value): value is string => value !== undefined);
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), MONACO_CDN]],
    ["style-src", ["'self'", "'unsafe-inline'", MONACO_CDN]],
    // Gravatar: the account's avatar, Payload's default, which D18 keeps (T106's inventory: the
    // admin's only foreign request). `admin.avatar: "default"` in payload.config.ts would drop it.
    ["img-src", ["'self'", "data:", "blob:", GRAVATAR, ...own([media])]],
    ["media-src", ["'self'", ...own([media])]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", ...own([uploads])]],
    // Live preview frames the shop's own `/next/preview` (D74).
    ["frame-src", ["'self'"]],
    ["worker-src", ["'self'", "blob:", MONACO_CDN]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];
  return finish(directives, options.upgradeInsecureRequests);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** The `Reporting-Endpoints` header's value, which `report-to` names (D140). */
export const REPORTING_ENDPOINTS = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

export type CspSettings = {
  readonly header: CspHeaderName;
  /** The static policy (D138). */
  readonly policy: string;
  /** The nonce policy (D139) with `NONCE_PLACEHOLDER` for the nonce; the proxy fills it in. */
  readonly noncePolicy: string;
  /** The admin's policy (D141), on `/admin` and Payload's `/api`. */
  readonly adminPolicy: string;
};

/**
 * The header and policies a build sends, from the build's environment: `CSP_MODE`,
 * `NEXT_PUBLIC_STRIPE_KEY`, `S3_PUBLIC_URL`, `S3_ENDPOINT` (the admin's uploads) and
 * `NEXT_PUBLIC_BASE_URL`. A site the base URL puts on plain http (CI's and a PC's
 * `http://localhost:8000`) gets no `upgrade-insecure-requests`: Chromium leaves a request to
 * `http://localhost` alone but upgrades a redirect's target, even on localhost (T106's probe: a
 * `fetch` answered 307 went on to `https://localhost/…` and failed), so every client-side redirect
 * there (the cart's to the checkout) fell back to a full page load. A blank base URL (a
 * deployment's) and an https one keep it. `dev` is `next dev`.
 */
export function cspSettings(
  source: Readonly<Record<string, string | undefined>>,
  dev: boolean,
): CspSettings {
  const base = (source.NEXT_PUBLIC_BASE_URL ?? "").trim().toLowerCase();
  const options: StaticPolicyOptions = {
    dev,
    stripe: (source.NEXT_PUBLIC_STRIPE_KEY ?? "").trim() !== "",
    media: mediaOrigin(source.S3_PUBLIC_URL),
    upgradeInsecureRequests: !base.startsWith("http://"),
  };
  return {
    header: CSP_HEADER[cspMode(source.CSP_MODE)],
    policy: staticPolicy(options),
    noncePolicy: noncePolicy({ ...options, nonce: NONCE_PLACEHOLDER }),
    adminPolicy: adminPolicy({
      dev,
      media: options.media,
      uploads: mediaOrigin(source.S3_ENDPOINT),
      upgradeInsecureRequests: options.upgradeInsecureRequests,
    }),
  };
}
