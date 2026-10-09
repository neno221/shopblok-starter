import "server-only";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@shopblok/i18n";
import { notFound } from "next/navigation";
import { market } from "next/root-params";
import { getRenderMarketMap } from "./markets/cached-market-map";
import { findMarket } from "./markets/market";
import type { Market } from "./markets/types";

/** A market, and the message catalog its pages use: the language when `@shopblok/i18n` has it. */
export type CurrentMarket = Market & { locale: Locale };

/**
 * The market of the current request, from the `[market]` root param. An unknown key is a 404:
 * the root layout calls this first, so nothing else renders. Next's built-in 404 page answers, not
 * `global-not-found`, because the URL matches `/[market]`; T11's proxy removes the case (SETUP.md,
 * T08 item 2).
 */
export async function getCurrentMarket(): Promise<CurrentMarket> {
  const key = await market();
  const current = findMarket(await getRenderMarketMap(), key);
  if (current === undefined) notFound();
  return { ...current, locale: isLocale(current.language) ? current.language : DEFAULT_LOCALE };
}
