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
  molecules: {},
  organisms: {},
  notFound: {
    title: "Page introuvable",
    body: "La page que vous recherchez n'existe pas.",
    home: "Retour à l'accueil",
  },
};
