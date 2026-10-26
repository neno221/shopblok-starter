import type { Copy } from "./types";

// German as Germany reads it (de-DE): "Sie" throughout, "ß" where the spelling asks for it.
export const de: Copy = {
  home: "Startseite",
  productTitles: {
    "relaxed-fit-zip-hoodie":
      "Lockerer Zip-Hoodie aus Bio-Baumwolle mit Rippbündchen an Ärmeln und Saum",
    "brushed-fleece-hoodie": "Hoodie aus gebürstetem Fleece",
    "garment-dyed-hoodie": "Stückgefärbter Kapuzenpullover",
    "essential-tee": "Essential T-Shirt aus Bio-Baumwolle",
    "fisherman-knit-sweater": "Fischer-Strickpullover",
    "canvas-tote-bag": "Tragetasche aus Canvas",
    "organic-cotton-cap": "Cap aus Bio-Baumwolle",
    "merino-ankle-socks": "Merino-Sneakersocken, 3er-Pack",
    "tapered-chino-trousers": "Chino-Hose mit schmal zulaufendem Bein",
    "waxed-field-jacket": "Gewachste Feldjacke",
    "ribbed-merino-turtleneck": "Rollkragenpullover aus Merino in Rippstrick",
  },
  hoodieDetails:
    "Die gebürstete Innenseite wärmt, ohne aufzutragen, und die doppelt gefütterte Kapuze behält ihre Form. Verstärkte Nähte, Rippbündchen und eine Känguru-Tasche runden den Schnitt ab. Fällt normal aus; für eine lockerere Passform eine Größe größer wählen.",
  customBadge: "Limitierte Auflage",
  categories: {
    women: "Damen",
    men: "Herren",
    accessories: "Accessoires",
    clothing: "Kleidung",
    bags: "Taschen",
    headwear: "Kopfbedeckungen",
    socks: "Socken",
    hoodies: "Hoodies",
    "t-shirts": "T-Shirts",
    knitwear: "Strickwaren",
    jackets: "Jacken",
    trousers: "Hosen",
    totes: "Tragetaschen",
    backpacks: "Rucksäcke",
    caps: "Caps",
    beanies: "Mützen",
    "ankle-socks": "Sneakersocken",
    "crew-socks": "Crew-Socken",
  },
  colours: {
    white: "Weiß",
    charcoal: "Anthrazit",
    navy: "Marineblau",
    olive: "Olivgrün",
    rust: "Rostbraun",
    burgundy: "Bordeaux",
    sand: "Sand",
  },
  options: { colour: "Farbe", size: "Größe" },
  imageAlt: {
    front: (title) => `${title}, Vorderansicht`,
    back: (title) => `${title}, Rückansicht`,
    detail: (title) => `${title}, Nahaufnahme des Stoffs`,
    colour: (title, colour) => `${title} in ${colour}`,
  },
  reviews: [
    {
      author: "Thomas B.",
      title: "Mein neuer Lieblings-Hoodie",
      body: "Innen weich, außen robust. Ich habe ihn schon ein Dutzend Mal gewaschen und er sieht immer noch aus wie neu. Fällt wie angegeben aus.",
    },
    {
      author: "Julia K.",
      title: "Super, aber etwas lang",
      body: "Stoff und Farbe gefallen mir sehr. Die Ärmel sind mir allerdings etwas zu lang – wer zwischen zwei Größen liegt, sollte die kleinere nehmen.",
    },
    {
      author: "Michael S.",
      title: "Jeden Cent wert",
      body: "Das Gewicht ist ideal für den Herbst: warm, ohne schwer zu sein. Die Kapuze ist ordentlich gefüttert und fällt nicht in sich zusammen.",
    },
    {
      author: "Sabine W.",
      body: "Insgesamt gute Qualität. Der Farbton Hafer ist etwas heller als auf den Fotos.",
    },
    {
      author: "Lukas H.",
      title: "Beim Waschen eingelaufen",
      body: "Anfangs war ich begeistert, aber nach der ersten Wäsche war er deutlich kürzer. Mit kaltem Wasser und Lufttrocknen wird es besser, das hätte ich gern vorher gewusst.",
    },
    {
      author: "Anja R.",
      title: "Perfekt zum Schichten",
      body: "Ich trage ihn unter einer Jacke oder allein. Die Tasche ist tief genug für Handy und Schlüssel.",
    },
  ],
  navigation: {
    newIn: "Neuheiten",
    sale: "Sale",
    discover: "Entdecken",
    bestsellers: "Bestseller",
    giftCards: "Geschenkgutscheine",
    organic: "Bio-Baumwolle",
    womenFeatures: [
      {
        title: "Die Herbst-Auswahl",
        alt: "Eine Frau in einem Hoodie in Hafer und einer weiten Hose geht im Herbst durch einen Park",
      },
      {
        title: "Zeit für Strick",
        alt: "Gefaltete dicke Strickpullover in Hafer, Marineblau und Grün auf einer Holzbank",
      },
    ],
    menFeatures: [
      {
        title: "Alltags-Basics",
        alt: "Ein Mann in einem schlichten T-Shirt und Chinos lehnt an einer Backsteinwand",
      },
    ],
  },
  footer: {
    shop: "Shop",
    help: "Hilfe",
    company: "Unternehmen",
    shipping: "Versand und Rückgabe",
    sizeGuide: "Größentabelle",
    contact: "Kontakt",
    faq: "Häufige Fragen",
    trackOrder: "Sendung verfolgen",
    about: "Über uns",
    sustainability: "Nachhaltigkeit",
    careers: "Karriere",
    stores: "Unsere Geschäfte",
    terms: "Allgemeine Geschäftsbedingungen",
    privacy: "Datenschutzerklärung",
    cookies: "Cookie-Richtlinie",
    imprint: "Impressum",
    copyright: (store, year) => `© ${year} ${store}. Alle Rechte vorbehalten.`,
  },
  shipping: {
    standard: "Standardversand",
    express: "Expressversand",
    free: "Kostenloser Spar-Versand",
    pickup: "Abholung im Geschäft",
    sameDay: "Lieferung am selben Tag",
    storeName: "Shopblok Berlin-Mitte",
  },
  card: "Kredit- oder Debitkarte",
  search: {
    query: "hoodie",
    categories: ["Damen-Hoodies", "Herren-Hoodies"],
    suggestions: ["Hoodie mit Reißverschluss", "Oversize-Hoodie", "Hoodie aus Bio-Baumwolle"],
    recent: ["Leinenhemd", "Hoodie", "Wollsocken", "Canvas-Tasche"],
    misspelt: "hoddie",
  },
  carousel: { title: "Neu eingetroffen", viewAll: "Alle Neuheiten ansehen" },
  productPage: {
    related: "Das könnte Ihnen auch gefallen",
    notes: ["Versand in 2 bis 4 Werktagen", "Kostenlose Rückgabe innerhalb von 30 Tagen"],
    sections: {
      description: "Beschreibung",
      details: "Details und Pflege",
      delivery: "Versand",
      returns: "Rückgabe",
    },
    facts: {
      material: ["Material", "100 % Bio-Baumwolle, innen angeraut"],
      fit: ["Passform", "Normal, fällt größengerecht aus"],
      origin: ["Herstellung", "Portugal"],
    },
    care: [
      "Maschinenwäsche kalt, auf links",
      "Nicht im Trockner trocknen",
      "Bügeln bei niedriger Temperatur",
    ],
    delivery: [
      "Der Standardversand dauert 2 bis 4 Werktage.",
      "Der Expressversand kommt am nächsten Werktag, wenn Sie bis 14 Uhr bestellen.",
    ],
    returns:
      "Ungetragene Artikel können Sie innerhalb von 30 Tagen gegen volle Erstattung zurückgeben. Die Rückgabe ist kostenlos.",
    returnsLink: "Rückgabebedingungen lesen",
    sizeGuide: {
      title: "Hoodies: Maße",
      chest: "Brustumfang",
      waist: "Taillenumfang",
      length: "Rückenlänge",
      sleeve: "Ärmellänge",
      note: "Messen Sie an der breitesten Stelle der Brust und halten Sie das Maßband waagerecht.",
    },
  },
  facets: {
    category: "Kategorie",
    colour: "Farbe",
    size: "Größe",
    price: "Preis",
    inStock: "Auf Lager",
    onSale: "Im Angebot",
  },
  activeFilters: { priceRange: (min, max) => `${min} € bis ${max} €` },
  announcement: { message: "Kostenloser Versand ab 150 €", link: "Mehr erfahren" },
  header: {
    announcements: [
      {
        message: "Kostenlose Rücksendung innerhalb von 30 Tagen",
        link: "So funktioniert die Rücksendung",
      },
      { message: "Neu: die Herbstkollektion aus Bio-Baumwolle", link: "Zur Kollektion" },
    ],
    longAnnouncement: {
      message:
        "Bestellen Sie werktags bis 14 Uhr für den Versand am selben Tag und genießen Sie bei jeder Bestellung kostenlose Rücksendungen innerhalb von 30 Tagen",
      link: "Unsere Versand- und Rückgabebedingungen lesen",
    },
    account: { signIn: "Anmelden", orders: "Bestellungen", wishlist: "Wunschliste" },
    suggestionMessage: "Kaufen Sie im Shop Ihres Landes ein, mit lokalen Preisen und Lieferzeiten.",
    heroAlt: "Gefaltete Strickwaren in Hafer und Anthrazit auf einer Holzbank",
  },
  figure: {
    alt: "Eine Person in einem Hoodie in Hafer geht bei Sonnenaufgang an einer Hafenmauer entlang",
    caption: "Die Herbstkollektion, fotografiert am Hafen.",
    credit: "Shopblok Studio",
  },
  emptyStates: {
    filters: {
      title: "Keine Produkte entsprechen diesen Filtern",
      text: "Entfernen Sie einen Filter oder erweitern Sie den Preisbereich.",
      action: "Alle Filter zurücksetzen",
    },
    search: {
      title: "Keine Ergebnisse gefunden",
      text: "Prüfen Sie die Schreibweise oder versuchen Sie einen allgemeineren Begriff.",
      action: "Zum Shop",
    },
    category: {
      title: "Hier gibt es noch keine Produkte",
      text: "Neuheiten sind auf dem Weg. Schauen Sie bald wieder vorbei.",
    },
  },
  site: {
    faq: {
      items: [
        {
          title: "Wie lange dauert die Lieferung?",
          answer: [
            "Die meisten Bestellungen kommen innerhalb von 2 bis 4 Werktagen an. Sobald Ihr Paket unser Lager verlässt, schicken wir Ihnen per E-Mail einen Tracking-Link.",
            "Die Lieferung ist kostenlos, sobald Ihre Bestellung den im Warenkorb angezeigten Betrag für kostenlosen Versand überschreitet.",
          ],
        },
        {
          title: "Kann ich einen Artikel zurückgeben?",
          answer: [
            "Ja. Ungetragene Artikel in der Originalverpackung können Sie innerhalb von 30 Tagen nach Lieferung gegen volle Erstattung zurückgeben.",
            "Starten Sie die Rücksendung in Ihrem Konto, drucken Sie das Etikett aus und geben Sie das Paket an einer beliebigen Abgabestelle ab.",
          ],
        },
        {
          title: "Wie finde ich meine Größe?",
          answer: [
            "Jede Produktseite enthält eine Größentabelle mit Maßen in Zentimetern und Zoll.",
            "Wenn Sie zwischen zwei Größen liegen, wählen Sie die größere für eine lockerere Passform.",
          ],
        },
        {
          title: "Welche Zahlungsarten akzeptieren Sie?",
          answer: [
            "Wir akzeptieren die gängigen Kredit- und Debitkarten, Apple Pay, Google Pay, Revolut Pay, PayPal und Klarna.",
            "Ihre Kartendaten gehen direkt an unseren Zahlungsanbieter. Wir speichern sie nie.",
          ],
        },
        {
          title: "Wie wasche ich meinen Hoodie?",
          answer: [
            "Waschen Sie ihn in der Maschine kalt, mit ähnlichen Farben und auf links gedreht, und trocknen Sie ihn bei niedriger Temperatur im Trockner.",
            "Nicht bleichen und den Aufdruck nicht bügeln.",
          ],
        },
      ],
      long: {
        title:
          "Was passiert mit meiner Bestellung, wenn einer der Artikel ausverkauft ist, nachdem ich bereits mit einer Geschenkkarte und einem Rabattcode bezahlt habe?",
        answer: [
          "Wird ein Artikel ausverkauft, bevor wir Ihre Bestellung verpacken, schreiben wir Ihnen noch am selben Tag eine E-Mail und bieten Ihnen einen Ersatz in einer anderen Größe oder Farbe, einen späteren Liefertermin oder die vollständige Erstattung dieses Artikels auf die ursprünglichen Zahlungsmittel an.",
          "Das Guthaben einer Geschenkkarte wird der Geschenkkarte wieder gutgeschrieben, und ein Rabattcode bleibt nach der Erstattung noch 14 Tage gültig, damit Sie ihn bei einer neuen Bestellung ohne Mehrkosten einlösen können. Die Rückerstattungsbearbeitungszeit beträgt in der Regel höchstens fünf Werktage.",
        ],
      },
    },
    toasts: {
      success: {
        trigger: "In den Warenkorb",
        title: "Zum Warenkorb hinzugefügt",
        description: "Ihr Artikel liegt in Ihrem Warenkorb.",
        actionLabel: "Rückgängig",
      },
      error: {
        trigger: "Code einlösen",
        title: "Dieser Code hat nicht funktioniert",
        description: "Prüfen Sie die Schreibweise, oder der Code ist abgelaufen.",
      },
      info: { trigger: "Lieferung prüfen", title: "Die Lieferung dauert 2 bis 4 Werktage" },
      long: {
        trigger: "Große Bestellung aufgeben",
        title:
          "Ihre Bestellung wurde erfolgreich aufgegeben, und die Bestätigungs-E-Mail mit allen Einzelheiten ist bereits unterwegs in Ihr Postfach",
        description:
          "Den Tracking-Link senden wir Ihnen, sobald das Paket unser Lager verlässt, in der Regel innerhalb eines Werktags.",
        actionLabel: "Alle Bestelldetails ansehen und überprüfen",
      },
    },
    cookieMessage:
      "Shopblok verwendet einige Cookies, um Ihren Warenkorb und Ihr Land zu speichern. Wenn Sie zustimmen, zählen wir außerdem Besuche und stimmen unsere Angebote auf Sie ab.",
  },
  account: {
    nav: {
      overview: "Übersicht",
      orders: "Bestellungen",
      addresses: "Adressen",
      paymentMethods: "Zahlungsarten",
      returns: "Rücksendungen",
      profile: "Profil",
    },
    reasons: {
      tooSmall: "Zu klein",
      tooLarge: "Zu groß",
      notAsDescribed: "Nicht wie beschrieben",
      changedMind: "Gefällt mir doch nicht",
    },
    note: "Das T-Shirt fällt eine Nummer kleiner aus, als die Größentabelle angibt.",
  },
  checkoutFlow: {
    cart: "Warenkorb",
    contact: "Kontakt und Adresse",
    delivery: "Versand",
    deliveryAndPayment: "Versand und Zahlung",
    payment: "Zahlung",
    review: "Übersicht",
    long: [
      "Kontaktdaten und Lieferadresse für Ihre Bestellung",
      "Versandart und Lieferoptionen auswählen",
      "Zahlungsmittel und Rechnungsadresse angeben",
      "Bestellübersichtsseite prüfen und verbindlich bestellen",
    ],
  },
  long: {
    productTitle:
      "Heritage-Kapuzenpullover aus gebürstetem Bio-Baumwollfleece mit verstärkten Nähten, doppelt gefütterter Kapuze, geräumiger Känguru-Tasche und farblich passenden Rippbündchen an Ärmeln und Saum, limitierte Herbstedition",
    badge: "Limitierte Herbstedition, nur solange der Vorrat reicht und ohne Nachproduktion",
    cartLine: {
      title:
        "Heritage-Kapuzenpullover aus gebürstetem Bio-Baumwollfleece mit verstärkten Nähten und doppelt gefütterter Kapuze, limitierte Herbstedition der aktuellen Saison",
      options: [
        {
          option: "Farbe und Ausführung",
          value: "Heritage-Hafer mit Kontrastnähten und flachen Kordeln im gleichen Farbton",
        },
        {
          option: "Größe und Passform",
          value:
            "Extragroß, lange Passform (verlängert die Körperlänge um fünf Zentimeter gegenüber der Standardlänge)",
        },
      ],
    },
    address: {
      firstName: "Anna-Katharina Elisabeth",
      lastName: "Schmidt-Hohenzollern",
      company:
        "Hartmann & Söhne Beratungsgesellschaft für nachhaltige Unternehmensentwicklung und Digitalisierung mbH",
      address1: "Hauptstraße Ecke Kaiser-Wilhelm-Ring, Hinterhaus, Aufgang C, Nr. 128–132",
      address2: "3. Obergeschoss, Büro 3.14, Abteilung Wareneingang und Retourenabwicklung",
      city: "Villingen-Schwenningen",
      postalCode: "78050",
      phone: "+49 30 23125 099",
    },
    nav: {
      label:
        "Damenbekleidung, Accessoires und saisonale Kollektionen für Arbeit, Freizeit und besondere Anlässe",
      columns: [
        {
          title: "Alltagskleidung für die Arbeit, das Wochenende und alles dazwischen",
          links: [
            "Hoodies, Sweatshirts und Jacken mit Reißverschluss aus Bio-Baumwolle",
            "T-Shirts, Langarmshirts und Basics für jede Jahreszeit",
            "Strickwaren, Strickjacken und dicke Winterpullover",
          ],
        },
        {
          title: "Taschen, Mützen, Socken und die kleinen Dinge, die ein Outfit abrunden",
          links: [
            "Canvas-Tragetaschen, Rucksäcke und Wochenendtaschen, die lange halten",
            "Caps, Mützen und Schals aus Wolle und Bio-Baumwolle",
            "Merinosocken, Strumpfhosen und Thermo-Unterwäsche",
          ],
        },
      ],
      feature: {
        title:
          "Die Herbst-Auswahl: elf Teile für die Zeit vom ersten kühlen Morgen bis zum ersten Frost",
        alt: "Eine Frau in einem Hoodie in Hafer und einer weiten Hose geht im Herbst durch einen Park",
      },
    },
    footer: {
      title:
        "Kundenservice, Lieferung, Rückgabe und alles andere, was Sie vor und nach Ihrer Bestellung vielleicht wissen möchten",
      links: [
        "Lieferzeiten, Versandkosten und die Verfolgung Ihres Pakets",
        "Rückgabe, Umtausch und die Abwicklung von Erstattungen",
        "Unsere Größentabelle mit Maßen und Hinweisen zur Passform für jeden Artikel",
        "Kontakt zu unserem Kundenservice per Telefon, Chat oder E-Mail",
        "Häufig gestellte Fragen zu Bestellungen, Zahlungen und Ihrem Kundenkonto",
      ],
    },
    review: {
      author: "Katharina B.",
      title:
        "Eine sehr ausführliche Bewertung nach einer ganzen Saison mit Tragen, Waschen und Reisen",
      body: [
        "Ich habe den Heritage-Hoodie in Hafer zu Beginn des letzten Herbstes gekauft und trage ihn seitdem mindestens dreimal pro Woche. Das hier ist also die Bewertung einer ganzen Saison und kein erster Eindruck.",
        "Zuerst die Passform. Ich bin 1,78 m groß und wiege etwa 75 Kilo, und Größe M ist genau das, was ich mir gewünscht habe: Brust und Schultern sind angenehm weit, ohne dass er übergroß wirkt, und die Ärmel enden genau am Handgelenk. Die Rippbündchen und der Saum haben ihre Form auch nach vielen Wäschen behalten.",
        "Der Stoff ist das eigentliche Argument. Die gebürstete Innenseite ist vom ersten Tag an weich und hat nicht gepillt, nicht einmal unter dem Rucksackgurt, und die Außenseite zeigt an den Ellbogen kaum Abnutzung. Ich habe ihn kalt gewaschen und an der Luft getrocknet, dabei ist er in der Länge um weniger als einen Zentimeter eingelaufen.",
        "Die Kapuze ist doppelt gefüttert und steht von allein, was bei Wind großartig ist und ein wenig stört, wenn man eine lockere, hängende Kapuze bevorzugt. Die Kordeln sind flach und verdrehen sich nicht, und die Tasche ist tief genug für Handy, Schlüssel und ein Paar Handschuhe.",
        "Mein einziger Kritikpunkt ist, dass ich mir mehr Farben wünsche, denn ich würde mir morgen noch einen zweiten kaufen. Ansonsten kann ich nur Gutes sagen und empfehle ihn jedem, der einen Hoodie sucht, der lange hält.",
      ].join("\n\n"),
    },
    shippingName:
      "Expresslieferung bis an Ihre Haustür mit Unterschrift bei Empfang und kostenloser Sendungsverfolgung per SMS oder E-Mail",
  },
};
