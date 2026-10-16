import "server-only";
import { isLocale, type Locale } from "@shopblok/i18n";
import { notFound } from "next/navigation";
import { entry as entryParam, locale } from "next/root-params";
import { designSystemEnabled } from "../lib/env";
import { findEntry } from "./catalog";
import type { DsEntry } from "./types";

/**
 * The gate every DS route runs first (D33, T22 step 2): the root layout, the shell and both kinds
 * of page call it, so a route that someone adds later and forgets the layout's check still answers
 * 404. It answers with the page's locale, or ends the render with `notFound()` when the flag is
 * off (`designSystemEnabled`), or when the `[locale]` segment is not one of the four languages
 * (`/design-system/xx`).
 */
export async function requireDesignSystemLocale(): Promise<Locale> {
  if (!designSystemEnabled()) notFound();
  const segment = await locale();
  if (!isLocale(segment)) notFound();
  return segment;
}

/**
 * The gate for the routes of one entry (the page and the frame): the locale as above, and the entry
 * at the `[...entry]` root param. An entry that is not in the manifest ends the render with
 * `notFound()`. Both params are root params on purpose: a root layout reads them before anything
 * streams, so an unknown entry answers a real 404 on the first request. In a page the same check
 * runs after the shell has started streaming (the page's own `params` is a runtime value that
 * Cache Components postpones), and the first visit would answer 200 with the not-found page.
 */
export async function requireDesignSystemEntry(): Promise<{ locale: Locale; entry: DsEntry }> {
  const language = await requireDesignSystemLocale();
  const entry = findEntry(await entryParam());
  if (entry === undefined) notFound();
  return { locale: language, entry };
}

/**
 * What a route's `generateStaticParams` returns. With Cache Components it must list at least one
 * param, and with the flag off every page is a 404 whatever its params are, so a build without the
 * flag prerenders one (and answers 404 for the rest on request) instead of ~100 pages of nothing.
 */
export function staticParams<T>(all: readonly T[]): T[] {
  return designSystemEnabled() ? [...all] : all.slice(0, 1);
}
