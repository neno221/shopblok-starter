import type { Page } from "../../payload-types";

/** A page as the reads select it: `pageLayout` needs its switch and both layouts. */
export type PageRow = Pick<Page, "id" | "title" | "slug" | "parent" | "layout"> &
  Partial<Pick<Page, "meta" | "layoutPerLanguage" | "localizedLayout">>;

/**
 * The blocks a page draws in the language it was read in (D105, T88): its own `localizedLayout`
 * when `layoutPerLanguage` is on (read with English as the fallback, so a language without blocks
 * of its own has English's), else the shared `layout`. The two fields hold the same blocks.
 */
export const pageLayout = (
  page: Pick<Page, "layout"> & Partial<Pick<Page, "layoutPerLanguage" | "localizedLayout">>,
): NonNullable<Page["layout"]> =>
  (page.layoutPerLanguage === true ? page.localizedLayout : page.layout) ?? [];
