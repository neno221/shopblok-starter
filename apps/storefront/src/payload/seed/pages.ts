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

/** The privacy page's sentence about cookies, around its "Cookie settings" link (M6 D123). */
type CookieText = { before: string; link: string; after: string };

/** The policy's "Cookie settings" link: this page at the fragment the consent island opens. */
export const PRIVACY_COOKIE_SETTINGS_URL = "/privacy#cookie-settings";

/** A Lexical text node. */
const textNode = (text: string) => ({
  type: "text",
  text,
  format: 0,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

/**
 * The policy's text (T65's placeholder paragraphs) and, since T97 (M6 D123), a paragraph on cookies
 * whose "Cookie settings" is a link to `#cookie-settings` on this page: without scripts it stays
 * here, and with them the consent island opens the dialog, so a visitor can withdraw from the
 * policy page as from any footer.
 */
function privacyText(language: Locale, withCookies: boolean) {
  const { text, cookies } = PRIVACY[language];
  const state = lexicalParagraphs(text);
  if (!withCookies) return state;
  const paragraph = {
    type: "paragraph",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    textFormat: 0,
    textStyle: "",
    children: [
      textNode(cookies.before),
      {
        type: "link",
        version: 3,
        format: "",
        indent: 0,
        direction: "ltr",
        fields: { linkType: "custom", url: PRIVACY_COOKIE_SETTINGS_URL, newTab: false },
        children: [textNode(cookies.link)],
      },
      textNode(cookies.after),
    ],
  };
  return { root: { ...state.root, children: [...state.root.children, paragraph] } };
}

/** The privacy page's layout: one rich text block (T65), with the cookies paragraph since T97. */
const privacyLayout = (withCookies: boolean) => [
  {
    id: "seed-privacy-text",
    blockType: "richText",
    ...BLOCK,
    content: each((language) => privacyText(language, withCookies)),
  },
];

/** The privacy policy's placeholder, for the shop owner to replace (the footer's consent links it). */
const PRIVACY: Record<Locale, { title: string; text: string[]; cookies: CookieText }> = {
  en: {
    title: "Privacy policy",
    text: [
      "This is a placeholder. Replace it with your shop's privacy policy before you open the shop.",
      "Say who runs the shop, what personal data you collect (orders, accounts, the newsletter), why, how long you keep it, who you share it with, and how a customer can see, correct or delete theirs.",
    ],
    cookies: {
      before:
        "Cookies: the store needs some to work (your cart, your sign-in, your country and language, and your cookie choice). Analytics and marketing cookies are used only if you allow them, and you can change or withdraw that choice at any time in the ",
      link: "cookie settings",
      after: ".",
    },
  },
  el: {
    title: "Πολιτική απορρήτου",
    text: [
      "Αυτό είναι ένα προσωρινό κείμενο. Αντικαταστήστε το με την πολιτική απορρήτου του καταστήματός σας πριν ανοίξετε το κατάστημα.",
      "Αναφέρετε ποιος διαχειρίζεται το κατάστημα, ποια προσωπικά δεδομένα συλλέγετε (παραγγελίες, λογαριασμοί, ενημερωτικό δελτίο), γιατί, για πόσο τα κρατάτε, με ποιους τα μοιράζεστε και πώς ένας πελάτης μπορεί να δει, να διορθώσει ή να διαγράψει τα δικά του.",
    ],
    cookies: {
      before:
        "Cookies: το κατάστημα χρειάζεται ορισμένα για να λειτουργεί (το καλάθι σας, τη σύνδεσή σας, τη χώρα και τη γλώσσα σας και την επιλογή σας για τα cookies). Τα cookies στατιστικών και μάρκετινγκ χρησιμοποιούνται μόνο αν τα επιτρέψετε, και μπορείτε να αλλάξετε ή να ανακαλέσετε την επιλογή σας όποτε θέλετε στις ",
      link: "ρυθμίσεις cookies",
      after: ".",
    },
  },
  de: {
    title: "Datenschutzerklärung",
    text: [
      "Dies ist ein Platzhalter. Ersetzen Sie ihn durch die Datenschutzerklärung Ihres Shops, bevor Sie den Shop eröffnen.",
      "Nennen Sie, wer den Shop betreibt, welche personenbezogenen Daten Sie erheben (Bestellungen, Konten, Newsletter), wozu, wie lange Sie sie speichern, an wen Sie sie weitergeben und wie Kundinnen und Kunden ihre Daten einsehen, berichtigen oder löschen können.",
    ],
    cookies: {
      before:
        "Cookies: Einige braucht der Shop, um zu funktionieren (Ihr Warenkorb, Ihre Anmeldung, Ihr Land und Ihre Sprache sowie Ihre Cookie-Auswahl). Analyse- und Marketing-Cookies verwenden wir nur, wenn Sie es erlauben, und Sie können Ihre Wahl jederzeit in den ",
      link: "Cookie-Einstellungen",
      after: " ändern oder widerrufen.",
    },
  },
  fr: {
    title: "Politique de confidentialité",
    text: [
      "Ceci est un texte provisoire. Remplacez-le par la politique de confidentialité de votre boutique avant de l’ouvrir.",
      "Indiquez qui exploite la boutique, quelles données personnelles vous collectez (commandes, comptes, newsletter), pourquoi, combien de temps vous les conservez, avec qui vous les partagez et comment un client peut consulter, corriger ou supprimer les siennes.",
    ],
    cookies: {
      before:
        "Cookies : la boutique en a besoin de certains pour fonctionner (votre panier, votre connexion, votre pays et votre langue, et votre choix concernant les cookies). Les cookies de mesure d’audience et de marketing ne sont utilisés que si vous les autorisez, et vous pouvez modifier ou retirer votre choix à tout moment dans les ",
      link: "paramètres des cookies",
      after: ".",
    },
  },
};

/**
 * The shop's pages (D80, T65): the Home, which `site-settings.homepage` names, with M3's home as
 * blocks; and the privacy policy the footer's consent sentence links (`/privacy`), placeholder
 * text in four languages, at `/privacy` in every market. Since T97 it is the cookie policy too (the
 * banner's link, `COOKIE_POLICY_PATH`), with its own "Cookie settings" link.
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
        // T65's layout is `before`: a shop that still has it gets the cookies paragraph (T97).
        layout: { value: privacyLayout(true), before: [privacyLayout(false)] },
      },
    },
  ],
};
