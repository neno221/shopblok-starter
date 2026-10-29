import { siteText } from "../../lib/site";
import { lexicalParagraphs } from "./email-templates";
import type { SeedGlobal } from "./types";
import type { Seeded } from "./values";

/** The seeded markets' languages, English first (the fallback every other one reads). */
const SEEDED_LANGUAGES = ["en", "el", "de", "fr"] as const;

type Text = ReturnType<typeof siteText>;

/** A localized value in every seeded language, from `site.ts`'s texts. */
const localized = <T>(pick: (text: Text) => T): Record<string, T> =>
  Object.fromEntries(SEEDED_LANGUAGES.map((language) => [language, pick(siteText(language))]));

const seeded = <T>(value: T): Seeded<T> => ({ value });

/** A custom link to a path in the market, its label in every language. */
const customLink = (url: string, label: (text: Text) => string) => ({
  link: { type: "custom", url, label: localized(label) },
});

/**
 * The header as M3 drew it (D78, T61 step 6): classic, the announcement in four languages, and
 * Medusa's categories as the navigation. `site.ts` keeps the same values as the defaults for a
 * build with no database.
 */
export const headerSeed: SeedGlobal = {
  global: "header",
  fields: () => ({
    design: seeded("classic"),
    "announcement.message": seeded(localized((text) => text.announcement)),
    "announcement.dismissible": seeded(true),
    "navigation.source": seeded("categories"),
    sticky: seeded(true),
  }),
};

/** The footer as M3 drew it: multi-column, `footerColumns`' "Shop" (the categories) and "Help". */
export const footerSeed: SeedGlobal = {
  global: "footer",
  fields: () => ({
    design: seeded("multi-column"),
    columns: seeded([
      {
        title: localized((text) => text.shop),
        categories: true,
        links: [customLink("/store", (text) => text.allProducts)],
      },
      {
        title: localized((text) => text.help),
        links: [
          customLink("/account", (text) => text.account),
          customLink("/cart", (text) => text.cart),
          customLink("/order/lookup", (text) => text.orderLookup),
        ],
      },
    ]),
    marketSwitcher: seeded(true),
  }),
};

/**
 * The site settings: the store's name and the product page's texts from `site.ts` in four
 * languages (T69 reads them). `homepage` stays empty until T65.
 */
export const siteSettingsSeed: SeedGlobal = {
  global: "site-settings",
  fields: () => ({
    storeName: seeded("Shopblok"),
    productNotes: seeded(localized((text) => text.productNotes.map((note) => ({ note })))),
    deliveryAndReturns: seeded(localized((text) => lexicalParagraphs(text.delivery))),
  }),
  perLocale: ["productNotes"],
};

/** Every global's seed, in the order they run. */
export const SEED_GLOBALS: SeedGlobal[] = [headerSeed, footerSeed, siteSettingsSeed];
