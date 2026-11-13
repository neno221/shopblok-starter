"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { buildPublicUrl } from "../markets/url";
import { confirmSubscription } from "../newsletter/confirm";
import { subscribeAction } from "../newsletter/subscribe";
import { MAX_TOKEN_LENGTH } from "../newsletter/token";
import { formDataToObject } from "./action";
import { formState, postedFieldNames } from "./form-handlers";
import type { FormState } from "./form-state";

// The newsletter's two actions (D122, T99). `subscribeNewsletter` is the footer's and the
// `newsletter` block's, bound as `submitForm` is (`{ market, form }`, from the page's HTML, so
// checked): it e-mails the link and answers "check your inbox". `confirmNewsletter` is the
// confirmation page's form, bound to the market's key: the POST that uses the token, then a
// redirect to the page with the outcome (`?state=`), the same for a form React sends and one posted
// without scripts.

export async function subscribeNewsletter(
  bound: unknown,
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const answers = formDataToObject(data);
  const { market, form } = (typeof bound === "object" && bound !== null ? bound : {}) as Record<
    string,
    unknown
  >;
  const result = await subscribeAction({ market, form, answers });
  return formState(result, answers, result.ok ? [] : await postedFieldNames({ market, form }));
}

export async function confirmNewsletter(market: unknown, data: FormData): Promise<never> {
  const token = data.get("token");
  const outcome = await confirmSubscription(token);
  const map = await getRenderMarketMap();
  const found = typeof market === "string" ? findMarket(map, market) : undefined;
  // A failure keeps the token in the URL, so the page shows the button again with the error.
  const retry =
    outcome === "failed" && typeof token === "string" && token.length <= MAX_TOKEN_LENGTH
      ? `&token=${encodeURIComponent(token)}`
      : "";
  const path = `/newsletter/confirm?state=${outcome}${retry}`;
  redirect(found === undefined ? (path as Route) : buildPublicUrl(found, path, map));
}
