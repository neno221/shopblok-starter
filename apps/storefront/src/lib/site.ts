import type { AnnouncementBar, FooterColumn, Link } from "@shopblok/registry/contracts";

// The storefront's own settings (D66): what the seed writes into the `header`, `footer` and
// `site-settings` globals and the seeded Home (T61, T65), and what the shell draws while a global
// has never been saved (no database, D10's stand-in): which header and footer variant, the store's
// name, the announcement bar's message, and the footer's columns besides the categories. The texts
// are per language, with English for a language the shop has no text in.

/** A header variant of the registry's `header` family (`headers-footers/header-{variant}`). */
export type HeaderVariant = "classic" | "centered" | "two-tier" | "mega-menu" | "minimal";
/** A footer variant of the registry's `footer` family. */
export type FooterVariant =
  "multi-column" | "newsletter-first" | "minimal" | "wordmark" | "two-tier";

export const SITE = {
  storeName: "Shopblok",
  header: "classic" as HeaderVariant,
  footer: "multi-column" as FooterVariant,
  /** The header stays at the top while the page scrolls. */
  stickyHeader: true,
};

/**
 * next/link's `prefetch` for the shell's links. Off until the pages they point to exist (the
 * category, cart, account and order pages are T50 to T54's): a prefetch of a 404 is a console
 * error on every page. The task that builds the last of them sets it back to `null` (Next's own).
 */
export const SHELL_PREFETCH: boolean | null = false;

type SiteText = {
  announcement: string;
  /** The footer's first column: the top-level categories, then "all products". */
  shop: string;
  allProducts: string;
  help: string;
  account: string;
  cart: string;
  orderLookup: string;
  /** The product page's shop texts (T49): the buy box's notes, the delivery and returns section. */
  productNotes: string[];
  delivery: string[];
  /** The home page's hero (T51; the seeded Home's `hero` block, T65): title, line, button. */
  hero: { title: string; text: string; action: string };
};

const TEXT: Record<"en" | "el" | "de" | "fr", SiteText> = {
  en: {
    announcement: "Free returns within 30 days",
    shop: "Shop",
    allProducts: "All products",
    help: "Help",
    account: "Your account",
    cart: "Your cart",
    orderLookup: "Find an order",
    productNotes: ["Ships in 2 to 4 business days", "Free returns within 30 days"],
    delivery: [
      "Standard delivery takes 2 to 4 business days.",
      "Return anything unworn within 30 days for a full refund. Returns are free.",
    ],
    hero: {
      title: "Everyday pieces, made to last",
      text: "Soft basics, linen for warm days and a few things for home.",
      action: "Shop the collection",
    },
  },
  el: {
    announcement: "Δωρεάν επιστροφές εντός 30 ημερών",
    shop: "Κατάστημα",
    allProducts: "Όλα τα προϊόντα",
    help: "Βοήθεια",
    account: "Ο λογαριασμός σας",
    cart: "Το καλάθι σας",
    orderLookup: "Εύρεση παραγγελίας",
    productNotes: ["Αποστολή σε 2 έως 4 εργάσιμες ημέρες", "Δωρεάν επιστροφές εντός 30 ημερών"],
    delivery: [
      "Η κανονική αποστολή διαρκεί 2 έως 4 εργάσιμες ημέρες.",
      "Επιστρέψτε ό,τι δεν έχετε φορέσει εντός 30 ημερών για πλήρη επιστροφή χρημάτων. Οι επιστροφές είναι δωρεάν.",
    ],
    hero: {
      title: "Καθημερινά κομμάτια που αντέχουν",
      text: "Μαλακά βασικά, λινά για τις ζεστές μέρες και μερικά πράγματα για το σπίτι.",
      action: "Δείτε τη συλλογή",
    },
  },
  de: {
    announcement: "Kostenlose Rücksendung innerhalb von 30 Tagen",
    shop: "Shop",
    allProducts: "Alle Produkte",
    help: "Hilfe",
    account: "Ihr Konto",
    cart: "Ihr Warenkorb",
    orderLookup: "Bestellung finden",
    productNotes: ["Versand in 2 bis 4 Werktagen", "Kostenlose Rückgabe innerhalb von 30 Tagen"],
    delivery: [
      "Der Standardversand dauert 2 bis 4 Werktage.",
      "Ungetragene Artikel können Sie innerhalb von 30 Tagen gegen volle Erstattung zurückgeben. Die Rücksendung ist kostenlos.",
    ],
    hero: {
      title: "Alltagsstücke, die bleiben",
      text: "Weiche Basics, Leinen für warme Tage und ein paar Dinge fürs Zuhause.",
      action: "Zur Kollektion",
    },
  },
  fr: {
    announcement: "Retours gratuits sous 30 jours",
    shop: "Boutique",
    allProducts: "Tous les produits",
    help: "Aide",
    account: "Votre compte",
    cart: "Votre panier",
    orderLookup: "Retrouver une commande",
    productNotes: ["Expédition sous 2 à 4 jours ouvrés", "Retours gratuits sous 30 jours"],
    delivery: [
      "La livraison standard prend 2 à 4 jours ouvrés.",
      "Retournez tout article non porté sous 30 jours pour un remboursement intégral. Les retours sont gratuits.",
    ],
    hero: {
      title: "Des essentiels faits pour durer",
      text: "Des basiques tout doux, du lin pour les beaux jours et quelques pièces pour la maison.",
      action: "Découvrir la collection",
    },
  },
};

export function siteText(language: string): SiteText {
  return language in TEXT ? TEXT[language as keyof typeof TEXT] : TEXT.en;
}

/** The home page's hero picture (T51), in `public/`: decoration, so its alternative text is empty. */
export const HERO_IMAGE = { src: "/home/hero.svg", alt: "", width: 1500, height: 1000 };

/** The announcement bar: one message, which the visitor can close. */
export function announcementFor(language: string): AnnouncementBar {
  return { messages: [{ message: siteText(language).announcement }], dismissible: true };
}

/**
 * The footer's columns: the shop (the top-level categories and every product) and help. `url`
 * builds the market's public URL of a path inside it.
 */
export function footerColumns(
  language: string,
  categories: readonly Link[],
  url: (path: string) => string,
): FooterColumn[] {
  const text = siteText(language);
  return [
    { title: text.shop, links: [...categories, { label: text.allProducts, href: url("/store") }] },
    {
      title: text.help,
      links: [
        { label: text.account, href: url("/account") },
        { label: text.cart, href: url("/cart") },
        { label: text.orderLookup, href: url("/order/lookup") },
      ],
    },
  ];
}
