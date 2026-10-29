import type { Locale } from "@shopblok/i18n";
import type { Payload } from "payload";
import { lexicalParagraphs } from "./email-templates";
import { seedHeroImage } from "./hero-image";
import type { SeedDocument, SeedModule } from "./types";
import type { Seeded } from "./values";

/** A post's texts in one language. */
type PostText = { title: string; slug: string; excerpt: string; content: string[] };

const seeded = <T>(value: T): Seeded<T> => ({ value });

/** A localized field of the seed's shape, `{ en: { value }, el: { value }, … }`, from the texts. */
const localized = <T>(texts: Record<Locale, PostText>, pick: (text: PostText) => T) =>
  Object.fromEntries(
    Object.entries(texts).map(([language, text]) => [language, seeded(pick(text))]),
  );

/** The newer post: how to care for knitwear, with the Home's picture. */
const CARE: Record<Locale, PostText> = {
  en: {
    title: "How to care for your knitwear",
    slug: "knitwear-care",
    excerpt:
      "Cold water, a gentle cycle and a flat dry: three habits that keep a jumper soft for years.",
    content: [
      "This is a sample post. Replace it with your own, or delete it, before you open the shop.",
      "Wash knitwear inside out in cold water on a gentle cycle, or by hand, with a mild detergent. Never wring it: press the water out in a towel.",
      "Dry it flat, away from the sun and the radiator, so it keeps its shape. Fold it rather than hang it.",
    ],
  },
  el: {
    title: "Πώς να φροντίζετε τα πλεκτά σας",
    slug: "φροντίδα-πλεκτών",
    excerpt:
      "Κρύο νερό, ήπιο πρόγραμμα και στέγνωμα σε επίπεδη επιφάνεια: τρεις συνήθειες που κρατούν ένα πουλόβερ απαλό για χρόνια.",
    content: [
      "Αυτό είναι ένα δείγμα άρθρου. Αντικαταστήστε το με δικό σας ή διαγράψτε το πριν ανοίξετε το κατάστημα.",
      "Πλένετε τα πλεκτά από την ανάποδη, σε κρύο νερό και ήπιο πρόγραμμα ή στο χέρι, με ήπιο απορρυπαντικό. Μην τα στύβετε: πιέστε το νερό μέσα σε μια πετσέτα.",
      "Στεγνώστε τα σε επίπεδη επιφάνεια, μακριά από τον ήλιο και το καλοριφέρ, για να κρατήσουν το σχήμα τους. Διπλώστε τα αντί να τα κρεμάτε.",
    ],
  },
  de: {
    title: "So pflegen Sie Ihre Strickwaren",
    slug: "strickpflege",
    excerpt:
      "Kaltes Wasser, ein Schonwaschgang und flach trocknen: drei Gewohnheiten, die einen Pullover jahrelang weich halten.",
    content: [
      "Dies ist ein Beispielbeitrag. Ersetzen Sie ihn durch Ihren eigenen oder löschen Sie ihn, bevor Sie den Shop eröffnen.",
      "Waschen Sie Strickwaren auf links in kaltem Wasser im Schonwaschgang oder von Hand, mit einem milden Waschmittel. Nicht auswringen: Drücken Sie das Wasser in einem Handtuch aus.",
      "Trocknen Sie sie liegend, fern von Sonne und Heizung, damit sie ihre Form behalten. Legen Sie sie zusammen, statt sie aufzuhängen.",
    ],
  },
  fr: {
    title: "Comment entretenir vos tricots",
    slug: "entretien-des-tricots",
    excerpt:
      "De l’eau froide, un cycle délicat et un séchage à plat : trois habitudes qui gardent un pull doux pendant des années.",
    content: [
      "Ceci est un article d’exemple. Remplacez-le par le vôtre, ou supprimez-le, avant d’ouvrir la boutique.",
      "Lavez vos tricots à l’envers, à l’eau froide, en cycle délicat ou à la main, avec une lessive douce. Ne les essorez jamais : pressez l’eau dans une serviette.",
      "Faites-les sécher à plat, loin du soleil et du radiateur, pour qu’ils gardent leur forme. Pliez-les plutôt que de les suspendre.",
    ],
  },
};

/** The older post: the journal's welcome, without a picture. */
const WELCOME: Record<Locale, PostText> = {
  en: {
    title: "Welcome to the journal",
    slug: "welcome",
    excerpt:
      "News from the shop, the stories behind what we make, and how to get the most out of it.",
    content: [
      "This is a sample post. Replace it with your own, or delete it, before you open the shop.",
      "The journal is where a shop tells its stories: a new collection, a visit to a workshop, a guide to fit or care. Each post has its own address in every market, in the market's language.",
    ],
  },
  el: {
    title: "Καλώς ήρθατε στο ιστολόγιο",
    slug: "καλώς-ήρθατε",
    excerpt:
      "Νέα από το κατάστημα, οι ιστορίες πίσω από όσα φτιάχνουμε και πώς να τα αξιοποιήσετε στο έπακρο.",
    content: [
      "Αυτό είναι ένα δείγμα άρθρου. Αντικαταστήστε το με δικό σας ή διαγράψτε το πριν ανοίξετε το κατάστημα.",
      "Το ιστολόγιο είναι ο τόπος όπου ένα κατάστημα λέει τις ιστορίες του: μια νέα συλλογή, μια επίσκεψη σε ένα εργαστήριο, έναν οδηγό για την εφαρμογή ή τη φροντίδα. Κάθε άρθρο έχει τη δική του διεύθυνση σε κάθε αγορά, στη γλώσσα της.",
    ],
  },
  de: {
    title: "Willkommen im Journal",
    slug: "willkommen",
    excerpt:
      "Neuigkeiten aus dem Shop, die Geschichten hinter dem, was wir machen, und wie Sie das Beste daraus machen.",
    content: [
      "Dies ist ein Beispielbeitrag. Ersetzen Sie ihn durch Ihren eigenen oder löschen Sie ihn, bevor Sie den Shop eröffnen.",
      "Im Journal erzählt ein Shop seine Geschichten: eine neue Kollektion, ein Besuch in einer Werkstatt, ein Ratgeber zu Passform oder Pflege. Jeder Beitrag hat in jedem Markt seine eigene Adresse, in der Sprache des Markts.",
    ],
  },
  fr: {
    title: "Bienvenue dans le journal",
    slug: "bienvenue",
    excerpt:
      "Les nouvelles de la boutique, les histoires derrière ce que nous fabriquons, et comment en profiter au mieux.",
    content: [
      "Ceci est un article d’exemple. Remplacez-le par le vôtre, ou supprimez-le, avant d’ouvrir la boutique.",
      "Le journal est l’endroit où une boutique raconte ses histoires : une nouvelle collection, la visite d’un atelier, un guide de taille ou d’entretien. Chaque article a sa propre adresse dans chaque marché, dans la langue du marché.",
    ],
  },
};

/** A post's localized fields from its texts in the four languages. */
const localizedPost = (texts: Record<Locale, PostText>) => ({
  title: localized(texts, (text) => text.title),
  slug: localized(texts, (text) => text.slug),
  excerpt: localized(texts, (text) => text.excerpt),
  content: localized(texts, (text) => lexicalParagraphs(text.content)),
});

/**
 * The journal's two sample posts (D80, T66), in four languages, each with its own slug per
 * language (`/journal/knitwear-care`, `/journal/φροντίδα-πλεκτών` on the Greek site), for the shop
 * owner to replace: how to care for knitwear (with the Home's hero picture) and a welcome (none).
 */
export const postsSeed: SeedModule = {
  collection: "posts",
  documents: async (payload: Payload): Promise<SeedDocument[]> => [
    {
      key: "knitwear-care",
      publish: true,
      localized: localizedPost(CARE),
      shared: {
        publishedAt: seeded("2026-10-20T08:00:00.000Z"),
        author: seeded("Maria Ioannou"),
        hero: seeded(await seedHeroImage(payload)),
      },
    },
    {
      key: "welcome",
      publish: true,
      localized: localizedPost(WELCOME),
      shared: { publishedAt: seeded("2026-10-01T08:00:00.000Z"), author: seeded("Maria Ioannou") },
    },
  ],
};
