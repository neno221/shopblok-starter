"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ConsentChoice } from "@shopblok/registry/contracts";
import { keepConsent } from "../consent/record";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { buildPublicUrl } from "../markets/url";
import { syncCartConsent as syncCart } from "../medusa/cart";
import { COOKIE_POLICY_PATH } from "../site";

// M6 D124 (T97): the consent island's action. After each choice (and once PostHog has given the
// visitor a distinct id) the visitor's cart, if there is one, is made to say what the cookies say
// now: a withdrawal removes the consent and the id from its metadata, so Medusa's analytics
// subscribers send nothing about the cart or its order. Every cart write does the same
// (`medusa/cart.ts`, `withConsent`); this covers a choice made with no write after it. Medusa out
// of reach is no error (the next write retries).
//
// M7 D145 (T109): the same action records the island's choice (one action, so one reference in
// the shell's first load): given the page's market and the choice, it keeps the record
// (`lib/consent/record.ts`) and answers the consent id, which the island adds to the cookie. It
// writes no cookie: an earlier action's answer must not overwrite a later choice. `cart: false`
// records without the cart (with a PostHog key a "yes" is the gate's to send, with its id).

async function syncCartNow(): Promise<void> {
  try {
    await syncCart();
  } catch {
    // Medusa out of reach: the next cart write says the same.
  }
}

/** A choice as the island sends it, or `undefined` (an action's arguments are the browser's). */
const choiceOf = (value: unknown): ConsentChoice | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const { analytics, marketing } = value as Record<string, unknown>;
  return typeof analytics === "boolean" && typeof marketing === "boolean"
    ? { analytics, marketing }
    : undefined;
};

/**
 * The cart told what the cookies say now, and, with the page's `market` and a `choice`, the choice
 * recorded: the consent id, or `null` when nothing was recorded (no choice, or no such market).
 */
export async function syncCartConsent(
  market?: unknown,
  choice?: unknown,
  cart?: unknown,
): Promise<string | null> {
  const chosen = choiceOf(choice);
  const found = chosen === undefined ? undefined : await marketOf(market);
  const id =
    found === undefined || chosen === undefined
      ? null
      : (await keepConsent(found.market, chosen, { setCookie: false })).id;
  if (cart !== false) await syncCartNow();
  return id;
}

/** The market a bound action names (the page's own key, so checked), or `undefined`. */
async function marketOf(key: unknown) {
  if (typeof key !== "string") return undefined;
  const map = await getRenderMarketMap();
  const market = findMarket(map, key);
  return market === undefined ? undefined : { market, map };
}

/**
 * M7 D145 (T109): "Cookie settings" without scripts, the form the cookie policy page draws in
 * `<noscript>` (`components/visitor/cookie-settings-form.tsx`): the two boxes as the choice, kept
 * in the cookie and recorded the same way, the cart told (a withdrawal), then back to the form,
 * whose "saved" line shows at its fragment.
 */
export async function saveCookieSettings(market: unknown, data: FormData): Promise<never> {
  const found = await marketOf(market);
  const choice = {
    analytics: data.get("analytics") === "on",
    marketing: data.get("marketing") === "on",
  };
  // A market that no longer resolves (closed or renamed since the page was drawn) saves nothing,
  // so the form is shown again without its "saved" line.
  if (found === undefined) redirect(`${COOKIE_POLICY_PATH}#cookie-settings` as Route);
  await keepConsent(found.market, choice, { setCookie: true });
  await syncCartNow();
  redirect(buildPublicUrl(found.market, `${COOKIE_POLICY_PATH}#cookie-settings-saved`, found.map));
}
