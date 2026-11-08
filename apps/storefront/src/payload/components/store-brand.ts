import { cache } from "react";
import type { Payload } from "payload";
import { SITE } from "../../lib/site";

/** The store's name and pictures, as the admin's logo and icon draw them (D108, T90). */
export type StoreBrand = {
  storeName: string;
  logo: StorePicture | null;
  icon: StorePicture | null;
};

type StorePicture = { url: string; width: number | null; height: number | null };

type MediaRef = { url?: string | null; width?: number | null; height?: number | null } | null;

function picture(value: unknown): StorePicture | null {
  if (value === null || typeof value !== "object") return null;
  const media = value as NonNullable<MediaRef>;
  if (typeof media.url !== "string" || media.url === "") return null;
  return { url: media.url, width: media.width ?? null, height: media.height ?? null };
}

/**
 * The published `site-settings` (D78): the store's name, logo and icon, read once per request
 * (React's `cache`), so the login page's logo and every screen's icon cost one small read. A read
 * that fails (the database is down: the admin will say so itself) gives the code's name and no
 * pictures, so the admin's frame still draws.
 */
export const readStoreBrand = cache(async (payload: Payload): Promise<StoreBrand> => {
  try {
    const settings = await payload.findGlobal({
      slug: "site-settings",
      depth: 1,
      draft: false,
      select: { storeName: true, logo: true, icon: true },
      populate: { media: { url: true, width: true, height: true } },
    });
    return {
      storeName: settings.storeName || SITE.storeName,
      logo: picture(settings.logo),
      icon: picture(settings.icon),
    };
  } catch {
    return { storeName: SITE.storeName, logo: null, icon: null };
  }
});
