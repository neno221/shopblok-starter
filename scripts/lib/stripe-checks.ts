// Stripe's checks (M6 T100, D117), as pure functions: what `pnpm run doctor` and
// `scripts/stripe-domains.ts` conclude from the env and from Stripe's and Medusa's answers. The
// looking (the requests) is in `doctor.ts` and `stripe-domains.ts`; no key is ever printed.
import { describeUnreachable, jsonOf, type HttpResult } from "./http.ts";
import type { Check } from "./report.ts";

/** Stripe's API, unless `STRIPE_BASE_URL` points at a fake (the tests'). */
export const STRIPE_API = "https://api.stripe.com";

/** Medusa's webhook route for the provider `stripe` (`pp_stripe_stripe`). */
export const WEBHOOK_PATH = "/hooks/payment/stripe_stripe";

/** The events the webhook takes (SPEC §10.1): Medusa's provider acts on these four. */
export const WEBHOOK_EVENTS = [
  "payment_intent.amount_capturable_updated",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.partially_funded",
] as const;

/** The provider's id in Medusa. */
export const STRIPE_PROVIDER = "pp_stripe_stripe";

const STRIPE_KEY = { id: "stripe-key", title: "Stripe accepts the secret key" } as const;
const STRIPE_REGIONS = { id: "stripe-regions", title: "Stripe on every region" } as const;
const STRIPE_WEBHOOK = { id: "stripe-webhook", title: "Stripe webhook endpoint" } as const;
const STRIPE_DOMAINS = { id: "stripe-domains", title: "Stripe payment method domains" } as const;

/** `test` or `live` by a key's prefix (`sk_test_`, `rk_live_`, `pk_test_`…); `undefined` for neither. */
export function stripeMode(key: string | undefined): "test" | "live" | undefined {
  const match = /^(?:sk|rk|pk)_(test|live)_/.exec((key ?? "").trim());
  return match?.[1] as "test" | "live" | undefined;
}

/**
 * The secret and the publishable key in the same mode (a test publishable key beside a live secret
 * key makes tokens the backend cannot read). Nothing when either is missing: `halfConfigured` says so.
 */
export function stripeModesCheck(
  secret: string | undefined,
  publishable: string | undefined,
): Check | undefined {
  const a = stripeMode(secret);
  const b = stripeMode(publishable);
  if (a === undefined || b === undefined || a === b) return undefined;
  return {
    id: "stripe-modes",
    title: "Stripe keys in one mode",
    level: "error",
    message: `STRIPE_API_KEY (apps/backend) is a ${a} key and NEXT_PUBLIC_STRIPE_KEY (apps/storefront) a ${b} key: Stripe refuses the payments one makes with the other's.`,
    fix: "Take both keys from the same mode of the same Stripe account (Developers, API keys).",
  };
}

/** `--online`: Stripe's `GET /v1/account` with the secret key (200 for a key it takes). */
export function stripeKeyCheck(answer: HttpResult): Check {
  if (answer.kind !== "response")
    return {
      ...STRIPE_KEY,
      level: "warn",
      message: `not checked: Stripe ${describeUnreachable(answer)}.`,
    };
  if (answer.status === 200) {
    const body = jsonOf(answer) as { country?: unknown; default_currency?: unknown } | undefined;
    const where =
      typeof body?.country === "string" ? ` (an account in ${body.country.toUpperCase()})` : "";
    return { ...STRIPE_KEY, level: "ok", message: `Stripe takes STRIPE_API_KEY${where}.` };
  }
  return {
    ...STRIPE_KEY,
    level: "error",
    message: `Stripe refuses STRIPE_API_KEY (HTTP ${answer.status}), so no payment can be taken.`,
    fix: "Copy the secret key again from Stripe's Dashboard (Developers, API keys) into apps/backend/.env, and restart the backend.",
  };
}

/** One region and the providers Medusa's `GET /store/payment-providers?region_id=` lists for it. */
export type RegionProviders = { name: string; providers: readonly string[] | undefined };

/**
 * `--online`: Stripe on every region while its keys are set, on none without them (D117:
 * `sync-stripe-regions` runs at the backend's start and in `pnpm bootstrap`). `stripe` is whether
 * the backend has both of its keys.
 */
export function stripeRegionsCheck(regions: readonly RegionProviders[], stripe: boolean): Check {
  const unread = regions.filter((region) => region.providers === undefined);
  const wrong = regions.filter(
    (region) =>
      region.providers !== undefined && region.providers.includes(STRIPE_PROVIDER) !== stripe,
  );
  if (wrong.length > 0)
    return {
      ...STRIPE_REGIONS,
      level: "error",
      message: stripe
        ? `Stripe's keys are set, and ${wrong.length} region(s) do not offer it, so their checkout takes no payment.`
        : `Stripe's keys are not set, and ${wrong.length} region(s) still offer it, so their checkout offers a payment that cannot be taken.`,
      details: wrong.map((region) => region.name),
      fix: "Restart the backend (it syncs the regions at its start), or run `pnpm bootstrap`.",
    };
  if (unread.length > 0)
    return {
      ...STRIPE_REGIONS,
      level: "warn",
      message: `not checked for ${unread.map((region) => region.name).join(", ")}: Medusa did not list their payment providers.`,
    };
  return {
    ...STRIPE_REGIONS,
    level: "ok",
    message: stripe
      ? `every region offers Stripe (${regions.length}).`
      : `no region offers Stripe; the checkout takes "Pay later".`,
  };
}

/** The webhook URL the backend's public address gives. */
export function webhookUrl(backendUrl: string): string {
  return `${backendUrl.replace(/\/+$/, "")}${WEBHOOK_PATH}`;
}

/**
 * `--online`, in production: an enabled endpoint in Stripe's `GET /v1/webhook_endpoints` pointing at
 * the backend's webhook route with the four events (or all events: `*`). Without it an order whose
 * shopper does not come back from a payment page is never placed.
 */
export function stripeWebhookCheck(answer: HttpResult, backendUrl: string): Check {
  const wanted = webhookUrl(backendUrl);
  const fix = `In Stripe's Dashboard (Developers, Webhooks), add an endpoint at ${wanted} with the events ${WEBHOOK_EVENTS.join(", ")}, and put its signing secret in STRIPE_WEBHOOK_SECRET.`;
  if (answer.kind !== "response")
    return {
      ...STRIPE_WEBHOOK,
      level: "warn",
      message: `not checked: Stripe ${describeUnreachable(answer)}.`,
    };
  const body = jsonOf(answer) as { data?: unknown } | undefined;
  if (answer.status !== 200 || !Array.isArray(body?.data))
    return {
      ...STRIPE_WEBHOOK,
      level: "warn",
      message: `not checked: Stripe answered HTTP ${answer.status}.`,
    };
  const endpoints = body.data as { url?: unknown; status?: unknown; enabled_events?: unknown }[];
  const ours = endpoints.filter((endpoint) => endpoint?.url === wanted);
  if (ours.length === 0)
    return {
      ...STRIPE_WEBHOOK,
      level: "error",
      message: `no webhook endpoint at ${wanted}.`,
      fix,
    };
  const working = ours.find((endpoint) => {
    const events = Array.isArray(endpoint.enabled_events) ? endpoint.enabled_events : [];
    return (
      endpoint.status === "enabled" &&
      (events.includes("*") || WEBHOOK_EVENTS.every((event) => events.includes(event)))
    );
  });
  if (working === undefined)
    return {
      ...STRIPE_WEBHOOK,
      level: "error",
      message: `the endpoint at ${wanted} is disabled or misses some of the four events.`,
      fix,
    };
  return { ...STRIPE_WEBHOOK, level: "ok", message: `${wanted} takes the four events.` };
}

/** A host as Stripe registers it: no scheme, port, path, case or trailing dot. */
export function normalizeDomain(value: string | undefined): string | undefined {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "") return undefined;
  const host = /^[a-z][a-z0-9+.-]*:\/\//.test(text)
    ? new URL(text).hostname
    : text.split(/[/:]/)[0];
  const clean = (host ?? "").replace(/\.$/, "");
  return clean === "" ? undefined : clean;
}

/** Whether Stripe can register a host: not `localhost`, not an IP address, with a dot. */
export function registrable(host: string): boolean {
  return (
    host.includes(".") &&
    !host.endsWith(".localhost") &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) &&
    !host.startsWith("[")
  );
}

/**
 * The domains the shop is served from: the storefront's own (`NEXT_PUBLIC_BASE_URL`) and each open
 * country's own domain (D94's markets: `/store/markets`'s `countries[].domain`), the ones Stripe can
 * register, each once.
 */
export function siteDomains(
  baseUrl: string | undefined,
  markets: { countries?: { enabled?: boolean; domain?: string | null }[] } | undefined,
): string[] {
  const hosts = [
    normalizeDomain(baseUrl),
    ...(markets?.countries ?? [])
      .filter((country) => country.enabled !== false)
      .map((country) => normalizeDomain(country.domain ?? undefined)),
  ].filter((host): host is string => host !== undefined && registrable(host));
  return [...new Set(hosts)].sort();
}

/** A domain in Stripe's `GET /v1/payment_method_domains`. */
export type StripeDomain = { id: string; domain: string; enabled: boolean };

/** The domains Stripe has, from its answer; a string says why it could not be read. */
export function readStripeDomains(answer: HttpResult): StripeDomain[] | string {
  if (answer.kind !== "response") return `Stripe ${describeUnreachable(answer)}`;
  const body = jsonOf(answer) as { data?: unknown } | undefined;
  if (answer.status !== 200 || !Array.isArray(body?.data))
    return `Stripe answered HTTP ${answer.status}`;
  return (body.data as { id?: unknown; domain_name?: unknown; enabled?: unknown }[]).flatMap(
    (entry) =>
      typeof entry?.id === "string" && typeof entry.domain_name === "string"
        ? [
            {
              id: entry.id,
              domain: entry.domain_name.toLowerCase(),
              enabled: entry.enabled === true,
            },
          ]
        : [],
  );
}

/** What `stripe-domains.ts` does for each wanted domain: register it, enable it, or nothing. */
export function domainPlan(
  wanted: readonly string[],
  registered: readonly StripeDomain[],
): { add: string[]; enable: StripeDomain[]; ready: string[] } {
  const byName = new Map(registered.map((entry) => [entry.domain, entry]));
  const add: string[] = [];
  const enable: StripeDomain[] = [];
  const ready: string[] = [];
  for (const domain of wanted) {
    const found = byName.get(domain);
    if (found === undefined) add.push(domain);
    else if (!found.enabled) enable.push(found);
    else ready.push(domain);
  }
  return { add, enable, ready };
}

/**
 * `--online`, in production: each domain the shop is served from is registered and enabled with
 * Stripe, which Apple Pay needs (and Google Pay and Link show only on registered domains).
 */
export function stripeDomainsCheck(wanted: readonly string[], answer: HttpResult): Check {
  const registered = readStripeDomains(answer);
  if (typeof registered === "string")
    return { ...STRIPE_DOMAINS, level: "warn", message: `not checked: ${registered}.` };
  if (wanted.length === 0)
    return {
      ...STRIPE_DOMAINS,
      level: "warn",
      message: "not checked: NEXT_PUBLIC_BASE_URL names no domain Stripe can register.",
    };
  const { add, enable, ready } = domainPlan(wanted, registered);
  if (add.length + enable.length === 0)
    return {
      ...STRIPE_DOMAINS,
      level: "ok",
      message: `registered: ${ready.join(", ")}.`,
    };
  return {
    ...STRIPE_DOMAINS,
    level: "error",
    message: "Apple Pay is not offered on a domain Stripe does not have.",
    details: [
      ...add.map((domain) => `${domain}: not registered`),
      ...enable.map((entry) => `${entry.domain}: registered but disabled`),
    ],
    fix: "Run `pnpm stripe:domains` with production's keys (it registers and enables them).",
  };
}
