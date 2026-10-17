import type { Messages } from "./en";

// The Greek catalog: English's keys and ICU arguments (D43), drafted by the sessions as M1's were;
// W4 is where a native speaker reads it.

export const el: Messages = {
  wiring: {
    title: "Έλεγχος σύνδεσης Shopblok",
    market: "Αγορά",
    language: "Γλώσσα",
    currency: "Νόμισμα",
    products: "Προϊόντα",
    pages: "Σελίδες Payload",
    backendUnavailable: "Το backend του Medusa δεν είναι προσβάσιμο.",
    backendHint:
      "Ξεκινήστε το backend με pnpm dev και φορτώστε ξανά τη σελίδα· το αρχείο καταγραφής του διακομιστή έχει τις λεπτομέρειες.",
    region: "Περιοχή",
    noRegion:
      "Το Medusa δεν έχει περιοχή για τη χώρα αυτής της αγοράς, γι' αυτό δεν υπάρχουν τιμές.",
    priceCurrencies: "Νομίσματα φίλτρου τιμής",
    noProducts: "Αυτή η περιοχή δεν έχει προϊόντα.",
  },
  atoms: {
    spinner: { loading: "Φόρτωση" },
    chip: { remove: "Αφαίρεση" },
    link: { newTab: "Ανοίγει σε νέα καρτέλα" },
    price: { sale: "Τιμή προσφοράς", original: "Αρχική τιμή" },
    rating: { label: "{value} στα {max}" },
    quantityStepper: {
      label: "Ποσότητα",
      decrease: "Μείωση ποσότητας",
      increase: "Αύξηση ποσότητας",
    },
    stock: {
      inStock: "Διαθέσιμο",
      low: "{count, plural, one {Απομένει μόνο #} other {Απομένουν μόνο #}}",
      outOfStock: "Εξαντλημένο",
    },
    variant: { unavailable: "Μη διαθέσιμο" },
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
  primitives: { toast: { region: "Ειδοποιήσεις", close: "Κλείσιμο ειδοποίησης" } },
  // Filled by M2's component tasks (T32 to T39), each with its components' strings.
  molecules: {},
  organisms: {},
  notFound: {
    title: "Η σελίδα δεν βρέθηκε",
    body: "Η σελίδα που ψάχνετε δεν υπάρχει.",
    home: "Επιστροφή στην αρχική σελίδα",
  },
};
