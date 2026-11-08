import type { Image } from "@shopblok/registry/contracts";
import type { Payload } from "payload";
import { isSaved, mediaImage, settingsFrom } from "../../lib/cms/shell";
import { readSiteSettings } from "../../lib/cms/site";
import { SITE } from "../../lib/site";
import { DEFAULT_LOCALE } from "../locales";

/** The store's name and pictures, as the admin's logo and icon draw them (D108, T90). */
export type StoreBrand = { storeName: string; logo: Image | null; icon: Image | null };

/**
 * The published `site-settings` (D78) as the shop's shell reads them: `readSiteSettings`, the
 * cached read a publish refreshes (`global:site-settings:<locale>`), and `settingsFrom`'s rules,
 * so the admin names the store as the shop's header does (a blank name is the code's, an upload
 * without its file or size is no picture). The store's name and pictures are not localized: the
 * default language's read has them. A read that fails (the database is down: the admin will say
 * so itself) is logged and gives the code's name and no pictures, so the admin's frame still draws.
 */
export async function readStoreBrand(payload: Payload): Promise<StoreBrand> {
  try {
    const settings = await readSiteSettings({ market: { language: DEFAULT_LOCALE }, draft: false });
    const { storeName, logo } = settingsFrom(settings);
    const icon = isSaved(settings) ? mediaImage(settings?.icon) : undefined;
    return { storeName, logo: logo ?? null, icon: icon ?? null };
  } catch (error) {
    payload.logger.error({ err: error }, "admin: the site settings could not be read for the logo");
    return { storeName: SITE.storeName, logo: null, icon: null };
  }
}
