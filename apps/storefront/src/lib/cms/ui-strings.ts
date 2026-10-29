import "server-only";
import { uiStringOverrides, type UiStringOverrides } from "../../i18n/messages";
import { cmsRead } from "./read";

/**
 * One language's edited microcopy (D77): every `ui-strings` row in the market's language, English
 * where the language has none (Payload's fallback), in one query (`key` and `value` only, no
 * pagination), cached under `ui-strings:<locale>` with the content reads' life (D73). The entry keeps
 * only the values that change a page and pass the ICU check (`uiStringOverrides`), so next-intl's
 * loader merges a handful of strings per request and parses none. `null` with no database.
 */
export const readUiStrings = cmsRead(
  async (payload, query): Promise<UiStringOverrides> => {
    const { docs } = await payload.find({
      collection: "ui-strings",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { key: true, value: true },
      pagination: false,
    });
    return uiStringOverrides(query.locale, docs);
  },
  { name: "cms:ui-strings", tags: (locale) => [`ui-strings:${locale}`] },
);
