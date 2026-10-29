import type { DesignSystemLocale } from "../design-system";

// The words of the sections' fixtures (T63): what an editor would write in each block, in the four
// DS locales. The FAQ and the testimonials reuse the commerce fixtures' FAQ and reviews, so only the
// other blocks' words are here. `long` is the length that breaks a layout.

type UspCopy = { title: string; text: string };

export type SectionCopy = {
  richText: {
    heading: string;
    paragraphs: [string, string];
    list: [string, string, string];
    linkLabel: string;
  };
  mediaWithText: {
    heading: string;
    paragraphs: [string, string];
    alt: string;
    primary: string;
    secondary: string;
    longHeading: string;
  };
  usp: {
    delivery: UspCopy;
    returns: UspCopy;
    secure: UspCopy;
    support: UspCopy;
    long: UspCopy;
  };
  logoCloud: { heading: string };
  faq: { heading: string };
  testimonials: { heading: string; roles: [string, string, string] };
  video: {
    heading: string;
    title: string;
    caption: string;
    poster: string;
    longTitle: string;
    /** The captions' label, each in its own language, as a player lists them. */
    tracks: Record<DesignSystemLocale, string>;
  };
  /** The newsletter block's own heading and line (T67). */
  newsletter: { heading: string; text: string; longHeading: string };
  /** A contact form as an editor builds it (T67): its labels, the topics, the text between. */
  form: {
    heading: string;
    intro: string;
    name: string;
    email: string;
    order: string;
    topic: string;
    topics: [string, string, string];
    message: string;
    consent: string;
    note: string;
    submit: string;
    confirmation: string;
    longLabel: string;
  };
};

/** Each language's name in itself: how a captions menu lists it. */
const tracks: Record<DesignSystemLocale, string> = {
  en: "English",
  el: "Ελληνικά",
  de: "Deutsch",
  fr: "Français",
};

export const sectionCopies: Record<DesignSystemLocale, SectionCopy> = {
  en: {
    richText: {
      heading: "Made to be worn for years",
      paragraphs: [
        "Every piece we sell starts with the fabric: organic cotton, recycled wool and linen from mills we have visited ourselves.",
        "We make small runs, repair what we can and take back what you no longer wear.",
      ],
      list: ["Organic and recycled fibres", "Made in small batches", "Free repairs for a year"],
      linkLabel: "Read our care guide",
    },
    mediaWithText: {
      heading: "The Heritage collection",
      paragraphs: [
        "Heavyweight jersey, a lined hood and seams that are taped on the inside, so the shape stays after many washes.",
        "Five colours, sizes XS to XXL.",
      ],
      alt: "A folded hoodie on a wooden bench",
      primary: "Shop the collection",
      secondary: "How it is made",
      longHeading:
        "The Heritage collection: heavyweight organic jersey, made to be worn, washed and repaired for years",
    },
    usp: {
      delivery: { title: "Free delivery", text: "On orders over $75" },
      returns: { title: "30-day returns", text: "Free and easy" },
      secure: { title: "Secure payment", text: "Cards, Apple Pay and PayPal" },
      support: { title: "Real people", text: "Answers within a day" },
      long: {
        title: "Free carbon-neutral delivery to your door",
        text: "On every order over $75, including sale items and gift cards",
      },
    },
    logoCloud: { heading: "As seen in" },
    faq: { heading: "Frequently asked questions" },
    testimonials: {
      heading: "What our customers say",
      roles: ["Verified buyer", "Customer since 2024", "Bought the Heritage Hoodie"],
    },
    video: {
      heading: "From the mill to your wardrobe",
      title: "How the Heritage Hoodie is made",
      caption: "Two minutes in our partner mill in Portugal.",
      poster: "Rolls of undyed cotton in a mill",
      longTitle:
        "How the Heritage Hoodie is made, from the organic cotton field to the finished seam",
      tracks,
    },
    newsletter: {
      heading: "Stories from the mill",
      text: "One letter a month: new fabrics, repairs and the people who make our clothes.",
      longHeading:
        "Stories from the mill, the workshop and the people who make, mend and wear our clothes",
    },
    form: {
      heading: "Write to us",
      intro: "We answer every message within one working day.",
      name: "Your name",
      email: "Email address",
      order: "Order number",
      topic: "What is it about?",
      topics: ["An order", "Returns and repairs", "Something else"],
      message: "Your message",
      consent: "I agree that you may keep my message to answer it.",
      note: "Please do not send card numbers or passwords in this form.",
      submit: "Send message",
      confirmation: "Thank you for writing. We will answer within one working day.",
      longLabel: "The number of the order this is about, as it stands in your confirmation email",
    },
  },
  el: {
    richText: {
      heading: "Φτιαγμένα για να φοριούνται χρόνια",
      paragraphs: [
        "Κάθε κομμάτι που πουλάμε ξεκινά από το ύφασμα: βιολογικό βαμβάκι, ανακυκλωμένο μαλλί και λινό από κλωστοϋφαντουργεία που έχουμε επισκεφθεί.",
        "Φτιάχνουμε μικρές παρτίδες, επιδιορθώνουμε ό,τι μπορούμε και παίρνουμε πίσω ό,τι δεν φοράτε πια.",
      ],
      list: [
        "Βιολογικές και ανακυκλωμένες ίνες",
        "Σε μικρές παρτίδες",
        "Δωρεάν επιδιορθώσεις για έναν χρόνο",
      ],
      linkLabel: "Διαβάστε τον οδηγό φροντίδας",
    },
    mediaWithText: {
      heading: "Η συλλογή Heritage",
      paragraphs: [
        "Βαρύ ζέρσεϊ, κουκούλα με φόδρα και ραφές ενισχυμένες από μέσα, ώστε το σχήμα να μένει μετά από πολλά πλυσίματα.",
        "Πέντε χρώματα, μεγέθη XS έως XXL.",
      ],
      alt: "Ένα διπλωμένο φούτερ σε ξύλινο πάγκο",
      primary: "Δείτε τη συλλογή",
      secondary: "Πώς φτιάχνεται",
      longHeading:
        "Η συλλογή Heritage: βαρύ βιολογικό ζέρσεϊ, φτιαγμένο για να φοριέται, να πλένεται και να επιδιορθώνεται για χρόνια",
    },
    usp: {
      delivery: { title: "Δωρεάν αποστολή", text: "Για παραγγελίες άνω των 75 €" },
      returns: { title: "Επιστροφές σε 30 ημέρες", text: "Δωρεάν και εύκολα" },
      secure: { title: "Ασφαλής πληρωμή", text: "Κάρτες, Apple Pay και PayPal" },
      support: { title: "Αληθινοί άνθρωποι", text: "Απαντήσεις μέσα σε μία ημέρα" },
      long: {
        title: "Δωρεάν αποστολή με ουδέτερο αποτύπωμα άνθρακα ως την πόρτα σας",
        text: "Για κάθε παραγγελία άνω των 75 €, μαζί με τις προσφορές και τις δωροκάρτες",
      },
    },
    logoCloud: { heading: "Μας είδατε στα" },
    faq: { heading: "Συχνές ερωτήσεις" },
    testimonials: {
      heading: "Τι λένε οι πελάτες μας",
      roles: ["Επιβεβαιωμένος αγοραστής", "Πελάτισσα από το 2024", "Αγόρασε το Heritage Hoodie"],
    },
    video: {
      heading: "Από το κλωστοϋφαντουργείο στην ντουλάπα σας",
      title: "Πώς φτιάχνεται το Heritage Hoodie",
      caption: "Δύο λεπτά στο συνεργαζόμενο κλωστοϋφαντουργείο μας στην Πορτογαλία.",
      poster: "Ρολά άβαφου βαμβακιού σε κλωστοϋφαντουργείο",
      longTitle:
        "Πώς φτιάχνεται το Heritage Hoodie, από το χωράφι με το βιολογικό βαμβάκι ως την τελευταία ραφή",
      tracks,
    },
    newsletter: {
      heading: "Ιστορίες από το κλωστήριο",
      text: "Ένα γράμμα τον μήνα: νέα υφάσματα, επιδιορθώσεις και οι άνθρωποι που φτιάχνουν τα ρούχα μας.",
      longHeading:
        "Ιστορίες από το κλωστήριο, το εργαστήριο και τους ανθρώπους που φτιάχνουν, επιδιορθώνουν και φορούν τα ρούχα μας",
    },
    form: {
      heading: "Γράψτε μας",
      intro: "Απαντάμε σε κάθε μήνυμα μέσα σε μία εργάσιμη ημέρα.",
      name: "Το όνομά σας",
      email: "Διεύθυνση email",
      order: "Αριθμός παραγγελίας",
      topic: "Για ποιο θέμα;",
      topics: ["Μια παραγγελία", "Επιστροφές και επιδιορθώσεις", "Κάτι άλλο"],
      message: "Το μήνυμά σας",
      consent: "Συμφωνώ να κρατήσετε το μήνυμά μου για να μου απαντήσετε.",
      note: "Μη στέλνετε αριθμούς καρτών ή κωδικούς σε αυτή τη φόρμα.",
      submit: "Αποστολή μηνύματος",
      confirmation: "Ευχαριστούμε που μας γράψατε. Θα απαντήσουμε μέσα σε μία εργάσιμη ημέρα.",
      longLabel: "Ο αριθμός της παραγγελίας που αφορά, όπως φαίνεται στο email επιβεβαίωσης",
    },
  },
  de: {
    richText: {
      heading: "Gemacht, um jahrelang getragen zu werden",
      paragraphs: [
        "Jedes Stück beginnt beim Stoff: Bio-Baumwolle, recycelte Wolle und Leinen aus Webereien, die wir selbst besucht haben.",
        "Wir fertigen in kleinen Serien, reparieren, was sich reparieren lässt, und nehmen zurück, was Sie nicht mehr tragen.",
      ],
      list: [
        "Bio- und recycelte Fasern",
        "In kleinen Serien gefertigt",
        "Ein Jahr kostenlose Reparaturen",
      ],
      linkLabel: "Zur Pflegeanleitung",
    },
    mediaWithText: {
      heading: "Die Heritage-Kollektion",
      paragraphs: [
        "Schwerer Jersey, eine gefütterte Kapuze und innen getapte Nähte, damit die Form auch nach vielen Wäschen bleibt.",
        "Fünf Farben, Größen XS bis XXL.",
      ],
      alt: "Ein gefalteter Hoodie auf einer Holzbank",
      primary: "Zur Kollektion",
      secondary: "So wird er gemacht",
      longHeading:
        "Die Heritage-Kollektion: schwerer Bio-Jersey, gemacht, um jahrelang getragen, gewaschen und repariert zu werden",
    },
    usp: {
      delivery: { title: "Kostenloser Versand", text: "Ab 75 € Bestellwert" },
      returns: { title: "30 Tage Rückgabe", text: "Kostenlos und einfach" },
      secure: { title: "Sichere Zahlung", text: "Karte, Apple Pay und PayPal" },
      support: { title: "Echte Menschen", text: "Antwort innerhalb eines Tages" },
      long: {
        title: "Kostenloser klimaneutraler Versand bis an Ihre Haustür",
        text: "Für jede Bestellung ab 75 €, auch für reduzierte Artikel und Geschenkgutscheine",
      },
    },
    logoCloud: { heading: "Bekannt aus" },
    faq: { heading: "Häufig gestellte Fragen" },
    testimonials: {
      heading: "Das sagen unsere Kundinnen und Kunden",
      roles: ["Verifizierter Kauf", "Kundin seit 2024", "Hat den Heritage Hoodie gekauft"],
    },
    video: {
      heading: "Von der Weberei in Ihren Kleiderschrank",
      title: "So entsteht der Heritage Hoodie",
      caption: "Zwei Minuten in unserer Partnerweberei in Portugal.",
      poster: "Rollen ungefärbter Baumwolle in einer Weberei",
      longTitle: "So entsteht der Heritage Hoodie, vom Bio-Baumwollfeld bis zur fertigen Naht",
      tracks,
    },
    newsletter: {
      heading: "Geschichten aus der Weberei",
      text: "Ein Brief im Monat: neue Stoffe, Reparaturen und die Menschen, die unsere Kleidung machen.",
      longHeading:
        "Geschichten aus der Weberei, der Werkstatt und von den Menschen, die unsere Kleidung machen, flicken und tragen",
    },
    form: {
      heading: "Schreiben Sie uns",
      intro: "Wir beantworten jede Nachricht innerhalb eines Werktags.",
      name: "Ihr Name",
      email: "E-Mail-Adresse",
      order: "Bestellnummer",
      topic: "Worum geht es?",
      topics: ["Eine Bestellung", "Rücksendungen und Reparaturen", "Etwas anderes"],
      message: "Ihre Nachricht",
      consent: "Ich bin einverstanden, dass Sie meine Nachricht speichern, um sie zu beantworten.",
      note: "Bitte senden Sie in diesem Formular keine Kartennummern oder Passwörter.",
      submit: "Nachricht senden",
      confirmation: "Danke für Ihre Nachricht. Wir antworten innerhalb eines Werktags.",
      longLabel:
        "Die Nummer der Bestellung, um die es geht, wie sie in Ihrer Bestätigungs-E-Mail steht",
    },
  },
  fr: {
    richText: {
      heading: "Faits pour être portés des années",
      paragraphs: [
        "Chaque pièce commence par le tissu : coton biologique, laine recyclée et lin de filatures que nous avons visitées nous-mêmes.",
        "Nous produisons en petites séries, réparons ce qui peut l’être et reprenons ce que vous ne portez plus.",
      ],
      list: [
        "Fibres biologiques et recyclées",
        "Fabriqué en petites séries",
        "Réparations gratuites pendant un an",
      ],
      linkLabel: "Lire notre guide d’entretien",
    },
    mediaWithText: {
      heading: "La collection Heritage",
      paragraphs: [
        "Un jersey épais, une capuche doublée et des coutures renforcées à l’intérieur, pour que la forme tienne après de nombreux lavages.",
        "Cinq couleurs, du XS au XXL.",
      ],
      alt: "Un sweat à capuche plié sur un banc en bois",
      primary: "Voir la collection",
      secondary: "Comment il est fabriqué",
      longHeading:
        "La collection Heritage : un jersey biologique épais, fait pour être porté, lavé et réparé pendant des années",
    },
    usp: {
      delivery: { title: "Livraison offerte", text: "Dès 75 € d’achat" },
      returns: { title: "Retours sous 30 jours", text: "Gratuits et simples" },
      secure: { title: "Paiement sécurisé", text: "Carte, Apple Pay et PayPal" },
      support: { title: "De vraies personnes", text: "Réponse sous un jour" },
      long: {
        title: "Livraison neutre en carbone offerte jusqu’à votre porte",
        text: "Pour toute commande dès 75 €, articles soldés et cartes cadeaux compris",
      },
    },
    logoCloud: { heading: "Ils parlent de nous" },
    faq: { heading: "Questions fréquentes" },
    testimonials: {
      heading: "Ce que disent nos clients",
      roles: ["Achat vérifié", "Cliente depuis 2024", "A acheté le Heritage Hoodie"],
    },
    video: {
      heading: "De la filature à votre garde-robe",
      title: "Comment est fabriqué le Heritage Hoodie",
      caption: "Deux minutes dans notre filature partenaire au Portugal.",
      poster: "Des rouleaux de coton écru dans une filature",
      longTitle:
        "Comment est fabriqué le Heritage Hoodie, du champ de coton biologique à la dernière couture",
      tracks,
    },
    newsletter: {
      heading: "Des nouvelles de la filature",
      text: "Une lettre par mois : nouvelles étoffes, réparations et les personnes qui font nos vêtements.",
      longHeading:
        "Des nouvelles de la filature, de l’atelier et des personnes qui font, réparent et portent nos vêtements",
    },
    form: {
      heading: "Écrivez-nous",
      intro: "Nous répondons à chaque message en un jour ouvré.",
      name: "Votre nom",
      email: "Adresse e-mail",
      order: "Numéro de commande",
      topic: "De quoi s’agit-il ?",
      topics: ["Une commande", "Retours et réparations", "Autre chose"],
      message: "Votre message",
      consent: "J’accepte que vous conserviez mon message pour y répondre.",
      note: "N’envoyez ni numéro de carte ni mot de passe dans ce formulaire.",
      submit: "Envoyer le message",
      confirmation: "Merci de nous avoir écrit. Nous répondrons en un jour ouvré.",
      longLabel:
        "Le numéro de la commande concernée, tel qu’il figure dans votre e-mail de confirmation",
    },
  },
};
