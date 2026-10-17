import type { Copy } from "./types";

// French as French-speaking Switzerland reads it (fr-CH): "vous", Swiss francs after the number.
export const fr: Copy = {
  home: "Accueil",
  productTitles: {
    "relaxed-fit-zip-hoodie":
      "Sweat à capuche zippé en coton biologique, coupe ample, avec poignets et bas côtelés",
    "brushed-fleece-hoodie": "Sweat à capuche en molleton gratté",
    "garment-dyed-hoodie": "Sweat à capuche teint après confection",
    "essential-tee": "T-shirt essentiel en coton biologique",
    "fisherman-knit-sweater": "Pull de pêcheur en maille",
    "canvas-tote-bag": "Sac tote en toile",
    "organic-cotton-cap": "Casquette en coton biologique",
    "merino-ankle-socks": "Chaussettes basses en laine mérinos, lot de 3",
    "tapered-chino-trousers": "Pantalon chino coupe fuselée",
    "waxed-field-jacket": "Veste field en coton ciré",
    "ribbed-merino-turtleneck": "Pull à col roulé en mérinos côtelé",
  },
  hoodieDetails:
    "L’intérieur gratté tient chaud sans alourdir, et la capuche doublée garde sa forme. Coutures renforcées, poignets côtelés et poche kangourou complètent la coupe. Taille normalement ; prenez une taille au-dessus pour une coupe plus ample.",
  customBadge: "Édition limitée",
  categories: {
    women: "Femme",
    men: "Homme",
    accessories: "Accessoires",
    clothing: "Vêtements",
    bags: "Sacs",
    headwear: "Couvre-chefs",
    socks: "Chaussettes",
    hoodies: "Sweats à capuche",
    "t-shirts": "T-shirts",
    knitwear: "Maille",
    jackets: "Vestes",
    trousers: "Pantalons",
    totes: "Sacs tote",
    backpacks: "Sacs à dos",
    caps: "Casquettes",
    beanies: "Bonnets",
    "ankle-socks": "Chaussettes basses",
    "crew-socks": "Chaussettes mi-hautes",
  },
  colours: {
    white: "Blanc",
    charcoal: "Anthracite",
    navy: "Bleu marine",
    olive: "Vert olive",
    rust: "Rouille",
    burgundy: "Bordeaux",
    sand: "Sable",
  },
  options: { colour: "Couleur", size: "Taille" },
  imageAlt: {
    front: (title) => `${title}, vue de face`,
    back: (title) => `${title}, vue de dos`,
    detail: (title) => `${title}, gros plan sur le tissu`,
    colour: (title, colour) => `${title}, couleur ${colour.toLowerCase()}`,
  },
  reviews: [
    {
      author: "Camille D.",
      title: "Mon nouveau sweat préféré",
      body: "Doux à l’intérieur, solide à l’extérieur. Je l’ai déjà lavé une douzaine de fois et il a toujours l’air neuf. La taille correspond bien.",
    },
    {
      author: "Julien M.",
      title: "Super, mais un peu long",
      body: "J’adore le tissu et la couleur. Les manches sont un peu longues pour moi, donc si vous hésitez entre deux tailles, prenez la plus petite.",
    },
    {
      author: "Sophie R.",
      title: "Vaut chaque franc",
      body: "Le poids est idéal pour l’automne : chaud sans être lourd. La capuche est bien doublée et ne s’affaisse pas.",
    },
    {
      author: "Nicolas B.",
      body: "Bonne qualité dans l’ensemble. La couleur avoine est un peu plus claire que sur les photos.",
    },
    {
      author: "Laura F.",
      title: "Il a rétréci au lavage",
      body: "Magnifique au début, mais après le premier lavage il était nettement plus court. En lavant à froid et en le faisant sécher à l’air, c’est mieux, mais j’aurais aimé le savoir avant.",
    },
    {
      author: "Marc T.",
      title: "Parfait pour superposer",
      body: "Je le porte sous une veste ou seul. La poche est assez profonde pour mon téléphone et mes clés.",
    },
  ],
  navigation: {
    newIn: "Nouveautés",
    sale: "Soldes",
    discover: "À découvrir",
    bestsellers: "Les plus vendus",
    giftCards: "Cartes cadeaux",
    organic: "Coton biologique",
    womenFeatures: [
      {
        title: "La sélection d’automne",
        alt: "Une femme en sweat à capuche avoine et pantalon large marche dans un parc en automne",
      },
      {
        title: "C’est la saison de la maille",
        alt: "Gros pulls en maille pliés, avoine, bleu marine et vert, posés sur un banc en bois",
      },
    ],
    menFeatures: [
      {
        title: "Les essentiels du quotidien",
        alt: "Un homme en t-shirt uni et chino appuyé contre un mur de briques",
      },
    ],
  },
  footer: {
    shop: "Boutique",
    help: "Aide",
    company: "Entreprise",
    legal: "Informations légales",
    shipping: "Livraison et retours",
    sizeGuide: "Guide des tailles",
    contact: "Nous contacter",
    faq: "Questions fréquentes",
    trackOrder: "Suivre ma commande",
    about: "À propos",
    sustainability: "Durabilité",
    careers: "Carrières",
    stores: "Nos magasins",
    terms: "Conditions générales",
    privacy: "Politique de confidentialité",
    cookies: "Paramètres des cookies",
    imprint: "Mentions légales",
  },
  shipping: {
    standard: "Livraison standard",
    express: "Livraison express",
    free: "Livraison économique gratuite",
    pickup: "Retrait en magasin",
    sameDay: "Livraison le jour même",
    storeName: "Magasin Shopblok Zurich",
  },
  card: "Carte de crédit ou de débit",
  search: {
    query: "sweat",
    categories: ["Sweats à capuche femme", "Sweats à capuche homme"],
    suggestions: [
      "sweat à capuche zippé",
      "sweat à capuche oversize",
      "sweat à capuche en coton biologique",
    ],
  },
  facets: {
    category: "Catégorie",
    colour: "Couleur",
    size: "Taille",
    price: "Prix",
    inStock: "En stock",
    onSale: "En promotion",
  },
  activeFilters: { priceRange: (min, max) => `${min} à ${max} CHF` },
  announcement: { message: "Livraison gratuite dès 150 CHF", link: "En savoir plus" },
  header: {
    announcements: [
      { message: "Retours gratuits sous 30 jours", link: "Comment fonctionnent les retours" },
      {
        message: "Nouveau : la collection d’automne en coton bio",
        link: "Découvrir la collection",
      },
    ],
    longAnnouncement: {
      message:
        "Commandez avant 14 h en semaine pour une expédition le jour même, et profitez des retours gratuits sous 30 jours sur chaque commande",
      link: "Lire notre politique de livraison et de retour",
    },
    account: { signIn: "Se connecter", orders: "Commandes", wishlist: "Liste d’envies" },
    suggestionMessage:
      "Achetez dans la boutique de votre pays, avec des prix et des délais de livraison locaux.",
    heroAlt: "Tricots pliés coloris avoine et anthracite sur un banc en bois",
  },
  figure: {
    alt: "Une personne en sweat à capuche couleur avoine marche le long d’un quai au lever du soleil",
    caption: "La collection d’automne, photographiée sur le port.",
    credit: "Shopblok Studio",
  },
  emptyStates: {
    filters: {
      title: "Aucun produit ne correspond à ces filtres",
      text: "Essayez de retirer un filtre ou d’élargir la fourchette de prix.",
      action: "Effacer tous les filtres",
    },
    search: {
      title: "Aucun résultat",
      text: "Vérifiez l’orthographe ou essayez un mot plus général.",
      action: "Parcourir la boutique",
    },
    category: {
      title: "Aucun produit pour le moment",
      text: "Les nouveautés arrivent bientôt. Revenez nous voir prochainement.",
    },
  },
  // French sets a no-break space (U+00A0) before ? : ; and !.
  site: {
    faq: {
      items: [
        {
          title: "Quel est le délai de livraison ?",
          answer: [
            "La plupart des commandes arrivent en 2 à 4 jours ouvrés. Nous vous envoyons un lien de suivi par e-mail dès que votre colis quitte notre entrepôt.",
            "La livraison est gratuite dès que votre commande dépasse le montant de livraison gratuite indiqué dans votre panier.",
          ],
        },
        {
          title: "Puis-je retourner un article ?",
          answer: [
            "Oui. Les articles non portés, dans leur emballage d’origine, peuvent être retournés dans les 30 jours suivant la livraison contre un remboursement intégral.",
            "Lancez le retour depuis votre compte, imprimez l’étiquette et déposez le colis dans n’importe quel point relais.",
          ],
        },
        {
          title: "Comment trouver ma taille ?",
          answer: [
            "Chaque fiche produit comporte un guide des tailles avec les mesures en centimètres et en pouces.",
            "Si vous hésitez entre deux tailles, prenez la plus grande pour une coupe plus ample.",
          ],
        },
        {
          title: "Quels moyens de paiement acceptez-vous ?",
          answer: [
            "Nous acceptons les principales cartes de crédit et de débit, Apple Pay, Google Pay, Revolut Pay, PayPal et Klarna.",
            "Les données de votre carte vont directement à notre prestataire de paiement. Nous ne les conservons jamais.",
          ],
        },
        {
          title: "Comment laver mon sweat à capuche ?",
          answer: [
            "Lavez-le en machine à froid avec des couleurs similaires, retourné, et séchez-le à basse température.",
            "N’utilisez pas d’eau de Javel et ne repassez pas l’imprimé.",
          ],
        },
      ],
      long: {
        title:
          "Que devient ma commande si l’un des articles est épuisé alors que j’ai déjà payé avec une carte cadeau et un code promo ?",
        answer: [
          "Si un article est épuisé avant que nous préparions votre commande, nous vous écrivons le jour même et vous proposons un remplacement dans une autre taille ou couleur, une date de livraison plus tardive ou le remboursement intégral de cet article sur les moyens de paiement d’origine.",
          "Le solde d’une carte cadeau est recrédité sur la carte cadeau, et un code promo reste valable 14 jours après le remboursement, afin que vous puissiez l’utiliser sur une nouvelle commande sans payer un centime de plus.",
        ],
      },
    },
    toasts: {
      success: {
        trigger: "Ajouter au panier",
        title: "Ajouté au panier",
        description: "Votre article vous attend dans votre panier.",
        actionLabel: "Annuler",
      },
      error: {
        trigger: "Appliquer le code",
        title: "Ce code n’a pas fonctionné",
        description: "Vérifiez l’orthographe, ou le code est peut-être expiré.",
      },
      info: { trigger: "Vérifier la livraison", title: "La livraison prend 2 à 4 jours ouvrés" },
      long: {
        trigger: "Passer une grande commande",
        title:
          "Votre commande est passée, et l’e-mail de confirmation est en route vers votre boîte de réception",
        description:
          "Nous vous enverrons le lien de suivi dès que le colis quittera notre entrepôt, généralement sous un jour ouvré.",
        actionLabel: "Voir le détail de votre commande",
      },
    },
  },
  checkoutFlow: {
    cart: "Panier",
    contact: "Contact et adresse",
    delivery: "Livraison",
    deliveryAndPayment: "Livraison et paiement",
    payment: "Paiement",
    review: "Récapitulatif",
    long: [
      "Coordonnées et adresse de livraison de votre commande",
      "Choix du mode de livraison de votre commande",
      "Mode de paiement et adresse de facturation",
      "Vérification et validation de votre commande",
    ],
  },
  long: {
    productTitle:
      "Sweat à capuche Heritage en molleton de coton biologique gratté, coutures renforcées, capuche doublée, poche kangourou et poignets côtelés assortis, édition limitée d’automne",
    badge: "Édition limitée d’automne dans la limite des stocks disponibles",
    cartLine: {
      title:
        "Sweat à capuche Heritage en molleton de coton biologique gratté, coutures renforcées et capuche doublée, édition limitée d’automne",
      options: [
        {
          option: "Couleur et finition",
          value: "Avoine Heritage avec surpiqûres contrastées et cordons plats ton sur ton",
        },
        {
          option: "Taille et coupe",
          value:
            "Très grande taille, coupe longue (ajoute cinq centimètres à la longueur du corps)",
        },
      ],
    },
    address: {
      firstName: "Anne-Catherine",
      lastName: "Keller-Dubois-Lefèvre",
      company:
        "Société coopérative de développement durable et d’innovation textile de la Suisse romande SA",
      address1: "Chemin du Général-Guisan-Prolongé, angle de la Rue des Deux-Marchés 128–132",
      address2: "Bâtiment B, 4e étage, bureau 402, réception des marchandises et des retours",
      city: "Saint-Légier-La Chiésaz",
      postalCode: "1806",
      phone: "+41 21 555 01 99",
    },
    nav: {
      label: "Vêtements pour femme, accessoires et collections de saison",
      columns: [
        {
          title:
            "Des vêtements de tous les jours pour le travail, le week-end et tout ce qui se passe entre les deux",
          links: [
            "Sweats à capuche, sweat-shirts et vestes zippées en coton biologique",
            "T-shirts, manches longues et sous-vêtements techniques pour chaque saison",
            "Pulls en maille, gilets et gros pulls d’hiver",
          ],
        },
        {
          title: "Sacs, bonnets, chaussettes et les petits détails qui complètent une tenue",
          links: [
            "Sacs tote en toile, sacs à dos et sacs de week-end faits pour durer",
            "Casquettes, bonnets et écharpes en laine et en coton biologique",
            "Chaussettes en mérinos, collants et sous-couches thermiques",
          ],
        },
      ],
      feature: {
        title:
          "La sélection d’automne : onze pièces à porter du premier matin frais aux premières gelées",
        alt: "Une femme en sweat à capuche avoine et pantalon large marche dans un parc en automne",
      },
    },
    footer: {
      title:
        "Service clientèle, livraison, retours et tout ce que vous pourriez avoir envie de savoir",
      links: [
        "Délais de livraison, frais d’expédition et suivi de votre colis",
        "Retours, échanges et traitement des remboursements",
        "Notre guide des tailles avec mensurations et conseils de coupe pour chaque article",
        "Contactez notre service clientèle par téléphone, par chat ou par e-mail",
        "Questions fréquentes sur les commandes, les paiements et votre compte",
      ],
    },
    review: {
      author: "Claire V.",
      title: "Un avis très détaillé après une saison complète de port, de lavages et de voyages",
      body: [
        "J’ai acheté le sweat à capuche Heritage en avoine au début de l’automne dernier et je le porte depuis au moins trois fois par semaine : voici donc l’avis d’une saison complète, et non une première impression.",
        "D’abord, la coupe. Je mesure 1,78 m pour environ 75 kilos, et le M correspond exactement à ce que je voulais : à l’aise sur la poitrine et les épaules sans paraître trop grand, avec des manches qui s’arrêtent juste au poignet. Les poignets et le bas côtelés ont gardé leur forme après de nombreux lavages.",
        "Le tissu est le vrai point fort. L’intérieur gratté est doux dès le premier jour et n’a pas bouloché, même sous la bretelle d’un sac à dos, et l’extérieur ne montre presque aucune usure aux coudes. Je l’ai lavé à froid et fait sécher à l’air libre : il a rétréci de moins d’un centimètre en longueur.",
        "La capuche est doublée et tient toute seule, ce qui est formidable par temps de vent et un peu gênant si l’on préfère une capuche souple qui retombe. Les cordons sont plats et ne se tortillent pas, et la poche est assez profonde pour un téléphone, des clés et une paire de gants.",
        "Mon seul reproche est que j’aimerais plus de couleurs, car j’en achèterais un deuxième dès demain. Pour le reste, je n’ai que du bien à en dire et je le recommande à toute personne qui cherche un sweat à capuche qui dure.",
      ].join("\n\n"),
    },
    shippingName:
      "Livraison express jusqu’à votre porte avec signature à la réception et suivi par SMS",
  },
};
