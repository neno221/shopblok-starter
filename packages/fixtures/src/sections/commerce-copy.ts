import type { DesignSystemLocale } from "../design-system";

// The words of the commerce sections' fixtures (T64): what an editor would write in each commerce
// block, in the four DS locales. The products, their prices and the categories are the commerce
// fixtures' (Medusa's side); only the editor's side is here. `long` is the length that breaks a
// layout.

export type CommerceSectionCopy = {
  hero: {
    eyebrow: string;
    heading: string;
    subheading: string;
    primary: string;
    secondary: string;
    alt: string;
    longHeading: string;
  };
  categoryShowcase: { heading: string; intro: string; link: string; label: string };
  productCollection: { heading: string; intro: string; link: string; gridHeading: string };
  featuredProduct: { heading: string; text: [string, string]; alt: string };
  bundle: { heading: string; text: string };
  promoBanner: { heading: string; text: string; terms: string; link: string; alt: string };
  comparison: {
    heading: string;
    material: string;
    care: string;
    materials: [string, string];
    cares: [string, string, string];
  };
  collectionSpotlight: { heading: string; text: string; alt: string; longHeading: string };
  recentlyViewed: { heading: string };
};

export const commerceSectionCopies: Record<DesignSystemLocale, CommerceSectionCopy> = {
  en: {
    hero: {
      eyebrow: "Autumn 2026",
      heading: "Layers for the cold months",
      subheading: "Heavy cotton, recycled wool and linen, made to be worn for years.",
      primary: "Shop the edit",
      secondary: "Our story",
      alt: "Knitwear folded on a wooden bench",
      longHeading:
        "Everything you need for the cold months ahead, from heavyweight hoodies to the softest recycled wool",
    },
    categoryShowcase: {
      heading: "Shop by category",
      intro: "Find what you came for, or something you did not know you needed.",
      link: "See every category",
      label: "Everything for the home",
    },
    productCollection: {
      heading: "New in",
      intro: "The latest pieces, as they arrive from the mills.",
      link: "Shop all new in",
      gridHeading: "Bestsellers",
    },
    featuredProduct: {
      heading: "Product of the month",
      text: [
        "Our heaviest jersey yet, brushed on the inside and finished with a lined hood.",
        "Made in a small mill in Portugal from organic cotton.",
      ],
      alt: "The Heritage Hoodie on a hanger",
    },
    bundle: { heading: "Complete the look", text: "The pieces our customers buy together." },
    promoBanner: {
      heading: "10% off your first order",
      text: "Sign up, shop, and enter the code at the cart.",
      terms: "One use per customer. Not valid on gift cards or with other offers.",
      link: "Shop now",
      alt: "A gift wrapped in brown paper",
    },
    comparison: {
      heading: "Compare our hoodies",
      material: "Material",
      care: "Care",
      materials: ["Organic cotton", "Recycled wool blend"],
      cares: ["Machine wash at 30 °C", "Hand wash only", "Machine wash at 40 °C"],
    },
    collectionSpotlight: {
      heading: "The Heritage collection",
      text: "Pieces we have made the same way for ten years, in colours that change with the seasons.",
      alt: "Three hoodies on a rail",
      longHeading:
        "The Heritage collection: ten years of the same patterns, in this year's colours",
    },
    recentlyViewed: { heading: "Recently viewed" },
  },
  el: {
    hero: {
      eyebrow: "Φθινόπωρο 2026",
      heading: "Στρώσεις για τους κρύους μήνες",
      subheading: "Βαρύ βαμβάκι, ανακυκλωμένο μαλλί και λινό, φτιαγμένα για να φοριούνται χρόνια.",
      primary: "Δείτε τη συλλογή",
      secondary: "Η ιστορία μας",
      alt: "Πλεκτά διπλωμένα σε ξύλινο πάγκο",
      longHeading:
        "Όλα όσα χρειάζεστε για τους κρύους μήνες που έρχονται, από βαριά φούτερ ως το πιο απαλό ανακυκλωμένο μαλλί",
    },
    categoryShowcase: {
      heading: "Αγορές ανά κατηγορία",
      intro: "Βρείτε αυτό που ψάχνατε ή κάτι που δεν ξέρατε ότι χρειάζεστε.",
      link: "Όλες οι κατηγορίες",
      label: "Τα πάντα για το σπίτι",
    },
    productCollection: {
      heading: "Νέες αφίξεις",
      intro: "Τα πιο πρόσφατα κομμάτια, όπως φτάνουν από τα υφαντήρια.",
      link: "Όλες οι νέες αφίξεις",
      gridHeading: "Τα πιο δημοφιλή",
    },
    featuredProduct: {
      heading: "Το προϊόν του μήνα",
      text: [
        "Το πιο βαρύ ζέρσεϊ μας, βουρτσισμένο από μέσα, με κουκούλα με φόδρα.",
        "Φτιαγμένο σε ένα μικρό υφαντήριο στην Πορτογαλία από βιολογικό βαμβάκι.",
      ],
      alt: "Το Heritage Hoodie σε κρεμάστρα",
    },
    bundle: {
      heading: "Ολοκληρώστε την εμφάνιση",
      text: "Τα κομμάτια που οι πελάτες μας αγοράζουν μαζί.",
    },
    promoBanner: {
      heading: "10% έκπτωση στην πρώτη σας παραγγελία",
      text: "Εγγραφείτε, ψωνίστε και βάλτε τον κωδικό στο καλάθι.",
      terms: "Μία χρήση ανά πελάτη. Δεν ισχύει για δωροκάρτες ή με άλλες προσφορές.",
      link: "Ψωνίστε τώρα",
      alt: "Ένα δώρο τυλιγμένο σε καφέ χαρτί",
    },
    comparison: {
      heading: "Συγκρίνετε τα φούτερ μας",
      material: "Υλικό",
      care: "Φροντίδα",
      materials: ["Βιολογικό βαμβάκι", "Μείγμα ανακυκλωμένου μαλλιού"],
      cares: ["Πλύσιμο στο πλυντήριο στους 30 °C", "Μόνο πλύσιμο στο χέρι", "Πλύσιμο στους 40 °C"],
    },
    collectionSpotlight: {
      heading: "Η συλλογή Heritage",
      text: "Κομμάτια που φτιάχνουμε με τον ίδιο τρόπο εδώ και δέκα χρόνια, σε χρώματα που αλλάζουν με τις εποχές.",
      alt: "Τρία φούτερ σε κρεμάστρα",
      longHeading:
        "Η συλλογή Heritage: δέκα χρόνια τα ίδια σχέδια, στα χρώματα της φετινής χρονιάς",
    },
    recentlyViewed: { heading: "Είδατε πρόσφατα" },
  },
  de: {
    hero: {
      eyebrow: "Herbst 2026",
      heading: "Lagen für die kalten Monate",
      subheading: "Schwere Baumwolle, recycelte Wolle und Leinen, gemacht für viele Jahre.",
      primary: "Zur Auswahl",
      secondary: "Unsere Geschichte",
      alt: "Gefaltete Strickwaren auf einer Holzbank",
      longHeading:
        "Alles, was Sie für die kommenden kalten Monate brauchen, von schweren Kapuzenpullovern bis zur weichsten recycelten Wolle",
    },
    categoryShowcase: {
      heading: "Nach Kategorie einkaufen",
      intro:
        "Finden Sie, wofür Sie gekommen sind, oder etwas, von dem Sie nicht wussten, dass Sie es brauchen.",
      link: "Alle Kategorien ansehen",
      label: "Alles für Ihr Zuhause",
    },
    productCollection: {
      heading: "Neuheiten",
      intro: "Die neuesten Stücke, so wie sie aus den Webereien kommen.",
      link: "Alle Neuheiten ansehen",
      gridHeading: "Bestseller",
    },
    featuredProduct: {
      heading: "Produkt des Monats",
      text: [
        "Unser bisher schwerster Jersey, innen angeraut und mit gefütterter Kapuze.",
        "Gefertigt in einer kleinen Weberei in Portugal aus Bio-Baumwolle.",
      ],
      alt: "Der Heritage Hoodie auf einem Bügel",
    },
    bundle: {
      heading: "Den Look vervollständigen",
      text: "Die Stücke, die unsere Kunden zusammen kaufen.",
    },
    promoBanner: {
      heading: "10 % Rabatt auf Ihre erste Bestellung",
      text: "Anmelden, einkaufen und den Code im Warenkorb eingeben.",
      terms:
        "Einmal pro Kunde einlösbar. Nicht gültig für Geschenkkarten oder mit anderen Angeboten.",
      link: "Jetzt einkaufen",
      alt: "Ein in braunes Papier gewickeltes Geschenk",
    },
    comparison: {
      heading: "Unsere Kapuzenpullover im Vergleich",
      material: "Material",
      care: "Pflege",
      materials: ["Bio-Baumwolle", "Recycelte Wollmischung"],
      cares: ["Maschinenwäsche bei 30 °C", "Nur Handwäsche", "Maschinenwäsche bei 40 °C"],
    },
    collectionSpotlight: {
      heading: "Die Heritage-Kollektion",
      text: "Stücke, die wir seit zehn Jahren gleich fertigen, in Farben, die mit den Jahreszeiten wechseln.",
      alt: "Drei Kapuzenpullover an einer Kleiderstange",
      longHeading:
        "Die Heritage-Kollektion: zehn Jahre dieselben Schnitte, in den Farben dieses Jahres",
    },
    recentlyViewed: { heading: "Zuletzt angesehen" },
  },
  fr: {
    hero: {
      eyebrow: "Automne 2026",
      heading: "Des couches pour les mois froids",
      subheading: "Coton épais, laine recyclée et lin, faits pour être portés des années.",
      primary: "Voir la sélection",
      secondary: "Notre histoire",
      alt: "Des pulls pliés sur un banc en bois",
      longHeading:
        "Tout ce qu’il vous faut pour les mois froids à venir, des sweats épais à la laine recyclée la plus douce",
    },
    categoryShowcase: {
      heading: "Acheter par catégorie",
      intro: "Trouvez ce que vous cherchiez, ou ce dont vous ne saviez pas avoir besoin.",
      link: "Voir toutes les catégories",
      label: "Tout pour la maison",
    },
    productCollection: {
      heading: "Nouveautés",
      intro: "Les dernières pièces, à leur arrivée des filatures.",
      link: "Voir toutes les nouveautés",
      gridHeading: "Meilleures ventes",
    },
    featuredProduct: {
      heading: "Le produit du mois",
      text: [
        "Notre jersey le plus épais, gratté à l’intérieur, avec une capuche doublée.",
        "Fabriqué dans une petite filature au Portugal, en coton bio.",
      ],
      alt: "Le Heritage Hoodie sur un cintre",
    },
    bundle: { heading: "Complétez le look", text: "Les pièces que nos clients achètent ensemble." },
    promoBanner: {
      heading: "10 % de remise sur votre première commande",
      text: "Inscrivez-vous, faites vos achats et saisissez le code au panier.",
      terms:
        "Une utilisation par client. Non valable sur les cartes cadeaux ni avec d’autres offres.",
      link: "Acheter",
      alt: "Un cadeau emballé dans du papier kraft",
    },
    comparison: {
      heading: "Comparez nos sweats",
      material: "Matière",
      care: "Entretien",
      materials: ["Coton bio", "Mélange de laine recyclée"],
      cares: [
        "Lavage en machine à 30 °C",
        "Lavage à la main uniquement",
        "Lavage en machine à 40 °C",
      ],
    },
    collectionSpotlight: {
      heading: "La collection Heritage",
      text: "Des pièces que nous fabriquons de la même façon depuis dix ans, dans des couleurs qui changent avec les saisons.",
      alt: "Trois sweats sur un portant",
      longHeading:
        "La collection Heritage : dix ans des mêmes patrons, dans les couleurs de cette année",
    },
    recentlyViewed: { heading: "Vus récemment" },
  },
};
