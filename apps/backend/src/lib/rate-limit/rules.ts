/**
 * M7 D142 (T108): the one table of limits. Every counter the shop keeps lives here: Medusa's own
 * routes (the customer's and Medusa Admin's sign-ins and resets, cart completion, the rest of
 * `/store/*`) and the storefront's, which its server consumes through `POST /shopblok/rate-limit`
 * (the forms, the newsletter, the consent record, Payload's sign-in and reset, and Turnstile's
 * no-script path). Each counter is a fixed window; a rule is refused when any of its counters is
 * over its limit.
 *
 * A counter's scope says what it counts per:
 * - `address`: the visitor's address (the signed one, or the request's own; IPv6 by its /64);
 * - `address-key`: the address and a key together (an e-mail's SHA-256, a form's id);
 * - `key`: the key alone (an e-mail, a cart, a user), whoever asks.
 *
 * A call the storefront signs as `server` (no visitor: the build's prerendering, revalidation, the
 * proxy's map, jobs) skips every counter with an address in its scope, never a `key` one.
 */

export type Scope = "address" | "address-key" | "key";

export type Counter = {
  /** The counter's name in the store's key: `rl:<id>:<sha256(…)>`. */
  id: string;
  limit: number;
  windowMs: number;
  scope: Scope;
};

export type Rule = {
  counters: readonly Counter[];
  /** The storefront may consume it through `POST /shopblok/rate-limit`. */
  storefront: boolean;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const counter = (id: string, limit: number, windowMs: number, scope: Scope): Counter => ({
  id,
  limit,
  windowMs,
  scope,
});

/** A sign-in: 10 per 15 minutes per address and e-mail, 30 per address. */
const signIn = (prefix: string): Rule => ({
  counters: [
    counter(`${prefix}:address-email`, 10, 15 * MINUTE, "address-key"),
    counter(`${prefix}:address`, 30, 15 * MINUTE, "address"),
  ],
  storefront: false,
});

/** A reset request: 5 per hour per address, 3 per e-mail. */
const resetRequest = (prefix: string): Rule => ({
  counters: [
    counter(`${prefix}:address`, 5, HOUR, "address"),
    counter(`${prefix}:email`, 3, HOUR, "key"),
  ],
  storefront: false,
});

export const RULES = {
  // Medusa's routes (`api/middlewares.ts`).
  "customer-login": signIn("customer-login"),
  "customer-register": {
    counters: [counter("customer-register:address", 5, HOUR, "address")],
    storefront: false,
  },
  "customer-reset": resetRequest("customer-reset"),
  "verification-request": {
    // 5 an hour per e-mail, and (the review of PR 153) 20 an hour per address, since the caller
    // picks the e-mail.
    counters: [
      counter("verification-request:email", 5, HOUR, "key"),
      counter("verification-request:address", 20, HOUR, "address"),
    ],
    storefront: false,
  },
  "verification-confirm": {
    counters: [counter("verification-confirm:address", 20, HOUR, "address")],
    storefront: false,
  },
  "admin-login": signIn("admin-login"),
  "admin-reset": resetRequest("admin-reset"),
  // D146: Medusa Admin's two-factor code check, 5 per 15 minutes per user. In the table from T108;
  // T109 put it on the routes of Medusa's MFA that check a code (`api/middlewares.ts`).
  "admin-code-check": {
    counters: [counter("admin-code-check:user", 5, 15 * MINUTE, "key")],
    storefront: false,
  },
  "cart-complete": {
    counters: [
      counter("cart-complete:cart", 10, 10 * MINUTE, "key"),
      counter("cart-complete:address", 30, 10 * MINUTE, "address"),
    ],
    storefront: false,
  },
  store: {
    counters: [counter("store:address", 600, MINUTE, "address")],
    storefront: false,
  },
  // The storefront's, through `POST /shopblok/rate-limit`.
  form: {
    counters: [counter("form:address-form", 10, HOUR, "address-key")],
    storefront: true,
  },
  newsletter: {
    counters: [
      counter("newsletter:address", 5, HOUR, "address"),
      counter("newsletter:email", 2, DAY, "key"),
    ],
    storefront: true,
  },
  consent: {
    counters: [counter("consent:address", 30, HOUR, "address")],
    storefront: true,
  },
  "payload-login": {
    // As `signIn()`: 10 per 15 minutes per address and e-mail, and (the review of PR 153) 30 per
    // address, so one address cannot try 10 passwords on every editor's e-mail.
    counters: [
      counter("payload-login:address-email", 10, 15 * MINUTE, "address-key"),
      counter("payload-login:address", 30, 15 * MINUTE, "address"),
    ],
    storefront: true,
  },
  "payload-reset": {
    counters: [counter("payload-reset:email", 3, HOUR, "key")],
    storefront: true,
  },
  // D143: with Turnstile's keys, a form posted without scripts (no token) is taken once an hour.
  "form-no-script": {
    counters: [counter("form-no-script:address", 1, HOUR, "address")],
    storefront: true,
  },
} as const satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

export const STOREFRONT_RULES = (Object.keys(RULES) as RuleName[]).filter(
  (name) => RULES[name].storefront,
);

export const isStorefrontRule = (name: unknown): name is RuleName =>
  typeof name === "string" && (STOREFRONT_RULES as string[]).includes(name);
