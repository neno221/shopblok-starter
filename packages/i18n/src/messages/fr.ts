import type { Messages } from "./en";

// The French catalog: English's keys and ICU arguments (D43), drafted by the sessions as M1's were;
// W4 is where a native speaker reads it.

export const fr: Messages = {
  wiring: {
    title: "Vérification de la connexion Shopblok",
    market: "Marché",
    language: "Langue",
    currency: "Devise",
    products: "Produits",
    pages: "Pages Payload",
    backendUnavailable: "Le backend Medusa est injoignable.",
    backendHint:
      "Démarrez le backend avec pnpm dev puis rechargez la page ; le journal du serveur donne les détails.",
    region: "Région",
    noRegion:
      "Medusa n'a pas de région pour le pays de ce marché, il n'y a donc aucun prix à afficher.",
    priceCurrencies: "Devises du filtre de prix",
    noProducts: "Cette région n'a aucun produit.",
  },
  atoms: {
    spinner: { loading: "Chargement" },
    chip: { remove: "Supprimer" },
    link: { newTab: "S’ouvre dans un nouvel onglet" },
    price: { sale: "Prix soldé", original: "Prix initial" },
    rating: { label: "{value} sur {max}" },
    quantityStepper: {
      label: "Quantité",
      decrease: "Diminuer la quantité",
      increase: "Augmenter la quantité",
    },
    stock: {
      inStock: "En stock",
      low: "{count, plural, other {Plus que # en stock}}",
      outOfStock: "Rupture de stock",
    },
    variant: { unavailable: "Indisponible" },
    payment: {
      visa: "Visa",
      mastercard: "Mastercard",
      americanexpress: "American Express",
      applepay: "Apple Pay",
      googlepay: "Google Pay",
      revolut: "Revolut",
      paypal: "PayPal",
      klarna: "Klarna",
    },
  },
  primitives: { toast: { region: "Notifications", close: "Fermer la notification" } },
  // Filled by M2's component tasks (T32 to T39), each with its components' strings.
  molecules: {
    variantSelector: {
      // A no-break space before the colon, as French sets it.
      chosen: "{option} : {value}",
      unavailable: "Indisponible",
    },
    ratingSummary: {
      rating: "{value} sur {max}",
      // "avis" does not change in the plural, and French counts 0 and 1 as "one".
      count: "{count, plural, =0 {Aucun avis pour le moment} other {Basé sur # avis}}",
      distribution: "Avis par nombre d’étoiles",
      row: "{stars, plural, one {# étoile} other {# étoiles}}, {count, plural, other {# avis}}",
    },
    reviewItem: {
      rating: "Noté {value} sur {max}",
      verified: "Achat vérifié",
    },
    mediaFigure: {
      credit: "Photo : {credit}",
    },
    priceBlock: {
      sale: "Prix soldé",
      original: "Prix initial",
      from: "À partir de {price}",
      taxIncluded: "Taxes comprises",
      taxExcluded: "Hors taxes",
    },
    productCard: {
      soldOut: "Épuisé",
      badges: { sale: "Promo", new: "Nouveau", bestseller: "Meilleure vente" },
      rating: "{average} sur 5, {count, plural, one {# avis} other {# avis}}",
      ratingCount: "({count, number})",
      swatches: "Couleurs",
      swatchUnavailable: "Indisponible",
      swatchesMore: "{count, plural, one {# couleur de plus} other {# couleurs de plus}}",
      moreCount: "+{count, number}",
      quickAdd: {
        add: "Ajouter au panier",
        chooseOptions: "Choisir les options",
        adding: "Ajout au panier…",
        added: "Ajouté au panier",
        error: "Impossible d’ajouter l’article au panier. Veuillez réessayer.",
        forProduct: ", {title}",
      },
    },
  },
  organisms: {},
  notFound: {
    title: "Page introuvable",
    body: "La page que vous recherchez n'existe pas.",
    home: "Retour à l'accueil",
  },
};
