import { catalogs, type Locale } from "@shopblok/i18n";
import type { Payload } from "payload";
import { siteText } from "../../lib/site";
import { lexicalParagraphs } from "./email-templates";
import { seedHeroImage } from "./hero-image";
import type { SeedModule } from "./types";
import type { Seeded } from "./values";

/** The seeded markets' languages, English first. */
const LANGUAGES = ["en", "el", "de", "fr"] as const satisfies readonly Locale[];

const seeded = <T>(value: T): Seeded<T> => ({ value });

/** A value in each seeded language. */
const each = <T>(pick: (language: Locale) => T): Record<string, T> =>
  Object.fromEntries(LANGUAGES.map((language) => [language, pick(language)]));

/** A seeded localized field: `{ en: { value }, el: { value }, … }`. */
const localized = (values: Record<string, string>) =>
  Object.fromEntries(Object.entries(values).map(([language, value]) => [language, seeded(value)]));

/**
 * A row of a block's `links`: a custom link to a path in the market, its label in each language
 * (T63's `link`). The row's id is fixed, as the blocks' are, so each language's label is the same
 * row's.
 */
const customLink = (
  id: string,
  url: string,
  label: (language: Locale) => string,
  appearance: string,
) => ({ id, link: { type: "custom", url, label: each(label), newTab: false, appearance } });

/**
 * What every block starts with, as Payload stores its defaults (`variant`, `sectionSettings`), so
 * a second run compares equal and changes nothing.
 */
const BLOCK = {
  variant: "standard",
  sectionSettings: {
    spacing: "medium",
    surface: "default",
    container: "default",
    visibility: "all",
  },
} as const;

/**
 * M3's home as blocks (D80): the hero with `site.ts`'s words and its picture, the top-level
 * categories as tiles, and the eight newest products as a carousel with its link to every
 * product: the same sections in the same order as M3's home template. The block ids are fixed,
 * so each language's texts are the same blocks'.
 */
function homeLayout(heroImage: number) {
  return [
    {
      id: "seed-home-hero",
      blockType: "hero",
      ...BLOCK,
      heading: each((language) => siteText(language).hero.title),
      subheading: each((language) => siteText(language).hero.text),
      media: heroImage,
      links: [
        customLink(
          "seed-home-hero-shop",
          "/store",
          (language) => siteText(language).hero.action,
          "default",
        ),
      ],
      productSource: { mode: "none", descendants: true, limit: 4, sort: "newest" },
    },
    {
      id: "seed-home-categories",
      blockType: "categoryShowcase",
      ...BLOCK,
      heading: each((language) => catalogs[language].templates.home.categories),
      // The top-level categories, at most eight, as M3's home (`HOME_CATEGORIES`).
      categorySource: { mode: "topLevel", limit: 8 },
    },
    {
      id: "seed-home-new-arrivals",
      blockType: "productCollection",
      ...BLOCK,
      heading: each((language) => catalogs[language].templates.home.newArrivals),
      display: "carousel",
      links: [
        customLink(
          "seed-home-new-arrivals-all",
          "/store",
          (language) => catalogs[language].templates.home.seeAllNew,
          "text",
        ),
      ],
      // The eight newest, as M3's home (`NEW_ARRIVALS`).
      productSource: {
        mode: "newest",
        descendants: true,
        limit: 8,
        sort: "newest",
        emptyBehavior: "hide",
      },
    },
  ];
}

/** The privacy policy's placeholder, for the shop owner to replace (the footer's consent links it). */
const PRIVACY: Record<Locale, { title: string; text: string[] }> = {
  en: {
    title: "Privacy policy",
    text: [
      "This is a placeholder. Replace it with your shop's privacy policy before you open the shop.",
      "Say who runs the shop, what personal data you collect (orders, accounts, the newsletter), why, how long you keep it, who you share it with, and how a customer can see, correct or delete theirs.",
    ],
  },
  el: {
    title: "Πολιτική απορρήτου",
    text: [
      "Αυτό είναι ένα προσωρινό κείμενο. Αντικαταστήστε το με την πολιτική απορρήτου του καταστήματός σας πριν ανοίξετε το κατάστημα.",
      "Αναφέρετε ποιος διαχειρίζεται το κατάστημα, ποια προσωπικά δεδομένα συλλέγετε (παραγγελίες, λογαριασμοί, ενημερωτικό δελτίο), γιατί, για πόσο τα κρατάτε, με ποιους τα μοιράζεστε και πώς ένας πελάτης μπορεί να δει, να διορθώσει ή να διαγράψει τα δικά του.",
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    text: [
      "Dies ist ein Platzhalter. Ersetzen Sie ihn durch die Datenschutzerklärung Ihres Shops, bevor Sie den Shop eröffnen.",
      "Nennen Sie, wer den Shop betreibt, welche personenbezogenen Daten Sie erheben (Bestellungen, Konten, Newsletter), wozu, wie lange Sie sie speichern, an wen Sie sie weitergeben und wie Kundinnen und Kunden ihre Daten einsehen, berichtigen oder löschen können.",
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    text: [
      "Ceci est un texte provisoire. Remplacez-le par la politique de confidentialité de votre boutique avant de l’ouvrir.",
      "Indiquez qui exploite la boutique, quelles données personnelles vous collectez (commandes, comptes, newsletter), pourquoi, combien de temps vous les conservez, avec qui vous les partagez et comment un client peut consulter, corriger ou supprimer les siennes.",
    ],
  },
};

/**
 * The shop's pages (D80, T65): the Home, which `site-settings.homepage` names, with M3's home as
 * blocks; and the privacy policy the footer's consent sentence links (`/privacy`), placeholder
 * text in four languages, at `/privacy` in every market.
 */
export const pagesSeed: SeedModule = {
  collection: "pages",
  documents: async (payload: Payload) => [
    {
      key: "home",
      publish: true,
      localized: {
        title: {
          en: { value: "Home" },
          el: { value: "Αρχική" },
          de: { value: "Startseite" },
          fr: { value: "Accueil" },
        },
        slug: {
          en: { value: "home" },
          el: { value: "arxiki" },
          de: { value: "startseite" },
          fr: { value: "accueil" },
        },
      },
      allLanguages: { layout: seeded(homeLayout(await seedHeroImage(payload))) },
    },
    {
      key: "privacy",
      publish: true,
      localized: {
        title: localized(each((language) => PRIVACY[language].title)),
        slug: localized(each(() => "privacy")),
      },
      allLanguages: {
        layout: seeded([
          {
            id: "seed-privacy-text",
            blockType: "richText",
            ...BLOCK,
            content: each((language) => lexicalParagraphs(PRIVACY[language].text)),
          },
        ]),
      },
    },
  ],
};
