"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { keepConsent, type KeptConsent } from "../consent/record";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { buildPublicUrl } from "../markets/url";
import { syncCartConsent as syncCart } from "../medusa/cart";
import { COOKIE_POLICY_PATH } from "../site";

// M6 D124 (T97): the consent island's action. After each choice (and once PostHog has given the
// visitor a distinct id) the visitor's cart, if there is one, is made to say what the cookies say
// now: a withdrawal removes the consent and the id from its metadata, so Medusa's analytics
// subscribers send nothing about the cart or its order. Every cart write does the same
// (`medusa/cart.ts`, `withConsent`); this covers a choice made with no write after it. It answers
// whether there was a cart, and `false` when Medusa could not be reached (the next write retries).

export async function syncCartConsent(): Promise<boolean> {
  try {
    return await syncCart();
  } catch {
    return false;
  }
}

/** The market a bound action names (the page's own key, so checked), or `undefined`. */
async function marketOf(key: unknown) {
  if (typeof key !== "string") return undefined;
  const map = await getRenderMarketMap();
  const market = findMarket(map, key);
  return market === undefined ? undefined : { market, map };
}

/**
 * M7 D145 (T109): the record of a choice the consent island made (the banner, the dialog): the
 * island wrote the cookie, and this keeps what it says as a `consent-records` document, with the
 * record's id added to the cookie (`lib/consent/record.ts`). Bound to the page's market.
 */
export async function recordConsent(market: unknown): Promise<KeptConsent["kept"]> {
  const found = await marketOf(market);
  if (found === undefined) return false;
  return (await keepConsent(found.market)).kept;
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
  if (found !== undefined) {
    await keepConsent(found.market, choice);
    await syncCartConsent();
  }
  const path = `${COOKIE_POLICY_PATH}#cookie-settings-saved`;
  redirect(found === undefined ? (path as Route) : buildPublicUrl(found.market, path, found.map));
}
