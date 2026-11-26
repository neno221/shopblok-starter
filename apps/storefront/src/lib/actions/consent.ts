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

/** A choice as the island sends it, or `undefined` (an action's arguments are the browser's). */
const choiceOf = (value: unknown): ConsentChoice | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const { analytics, marketing } = value as Record<string, unknown>;
  return typeof analytics === "boolean" && typeof marketing === "boolean"
    ? { analytics, marketing }
    : undefined;
};

/**
 * M7 D145 (T109): the record of a choice the consent island made (the banner, the dialog): the
 * island wrote the cookie and passes the choice, and this keeps it as a `consent-records` document
 * (`lib/consent/record.ts`) and answers the consent id, which the island adds to the cookie. It
 * writes no cookie: an earlier action's answer must not overwrite a later choice. Bound to the
 * page's market; `null` when the market or the choice is not one.
 */
export async function recordConsent(market: unknown, choice: unknown): Promise<string | null> {
  const found = await marketOf(market);
  const chosen = choiceOf(choice);
  if (found === undefined || chosen === undefined) return null;
  return (await keepConsent(found.market, chosen, { setCookie: false })).id;
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
  await syncCartConsent();
  redirect(buildPublicUrl(found.market, `${COOKIE_POLICY_PATH}#cookie-settings-saved`, found.map));
}
