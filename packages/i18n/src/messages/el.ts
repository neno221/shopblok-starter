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
  molecules: {
    variantSelector: {
      chosen: "{option}: {value}",
      unavailable: "Μη διαθέσιμο",
    },
    ratingSummary: {
      rating: "{value} στα {max}",
      count:
        "{count, plural, =0 {Δεν υπάρχουν κριτικές ακόμη} one {Βάσει # κριτικής} other {Βάσει # κριτικών}}",
      distribution: "Βαθμολογίες ανά αριθμό αστεριών",
      row: "{stars, plural, one {# αστέρι} other {# αστέρια}}, {count, plural, one {# κριτική} other {# κριτικές}}",
    },
    reviewItem: {
      rating: "Βαθμολογία {value} στα {max}",
      verified: "Επαληθευμένη αγορά",
    },
    mediaFigure: {
      credit: "Φωτογραφία: {credit}",
    },
    priceBlock: {
      sale: "Τιμή προσφοράς",
      original: "Αρχική τιμή",
      from: "Από {price}",
      taxIncluded: "Οι φόροι περιλαμβάνονται",
      taxExcluded: "Οι φόροι δεν περιλαμβάνονται",
    },
    productCard: {
      soldOut: "Εξαντλημένο",
      badges: { sale: "Προσφορά", new: "Νέο", bestseller: "Δημοφιλές" },
      rating: "{average} στα 5, {count, plural, one {# αξιολόγηση} other {# αξιολογήσεις}}",
      ratingCount: "({count, number})",
      swatches: "Χρώματα",
      swatchUnavailable: "Μη διαθέσιμο",
      swatchesMore: "{count, plural, one {# ακόμη χρώμα} other {# ακόμη χρώματα}}",
      moreCount: "+{count, number}",
      quickAdd: {
        add: "Προσθήκη στο καλάθι",
        chooseOptions: "Επιλογή επιλογών",
        adding: "Γίνεται προσθήκη…",
        added: "Προστέθηκε στο καλάθι",
        error: "Η προσθήκη στο καλάθι δεν ήταν δυνατή. Δοκιμάστε ξανά.",
        forProduct: ", {title}",
      },
    },
    // T33: discovery and the site-wide molecules (each filled by the task's component).
    searchField: {
      label: "Αναζήτηση προϊόντων",
      placeholder: "Αναζήτηση προϊόντων",
      submit: "Αναζήτηση",
      clear: "Καθαρισμός αναζήτησης",
    },
    breadcrumbs: {
      label: "Διαδρομή πλοήγησης",
      more: "Ενδιάμεσα επίπεδα",
    },
    pagination: {
      label: "Σελιδοποίηση",
      previous: "Προηγούμενη",
      next: "Επόμενη",
      more: "Περισσότερες σελίδες",
      page: "Σελίδα {page, number}",
      current: "Σελίδα {page, number} από {pageCount, number}",
    },
    sortSelect: {
      label: "Ταξινόμηση κατά",
      apply: "Εφαρμογή",
      options: {
        relevance: "Συνάφεια",
        newest: "Νεότερα",
        priceAsc: "Τιμή: από τη χαμηλότερη στην υψηλότερη",
        priceDesc: "Τιμή: από την υψηλότερη στη χαμηλότερη",
      },
    },
    filterGroup: {
      products: "{count, plural, one {# προϊόν} other {# προϊόντα}}",
      showMore: "Εμφάνιση {count} ακόμη",
      showFewer: "Εμφάνιση λιγότερων",
      minimum: "Ελάχιστη τιμή",
      maximum: "Μέγιστη τιμή",
      bounds: "Τιμές από {min} έως {max}",
    },
    activeFilterChips: {
      label: "{count, plural, one {# ενεργό φίλτρο} other {# ενεργά φίλτρα}}",
      chip: "{group}: {label}",
      remove: "Αφαίρεση {filter}",
      clearAll: "Εκκαθάριση όλων",
      clearAllLabel: "Εκκαθάριση όλων των φίλτρων",
    },
    emptyState: {},
    marketSwitcher: {
      trigger: "Χώρα και γλώσσα: {country}, {language}, {currency}",
      title: "Χώρα και γλώσσα",
      description:
        "Η χώρα σας καθορίζει το νόμισμα, τις τιμές και την παράδοση. Η γλώσσα σας καθορίζει τα κείμενα της σελίδας.",
      close: "Κλείσιμο",
      list: "Χώρες και γλώσσες",
      option: "{language}, {country}",
    },
    newsletterForm: {
      title: "Εγγραφείτε στο ενημερωτικό μας δελτίο",
      description: "Νέες αφίξεις, προσφορές και ιστορίες, μία φορά τον μήνα. Χωρίς spam.",
      emailLabel: "Διεύθυνση email",
      submit: "Εγγραφή",
      sending: "Γίνεται εγγραφή…",
      consent:
        "Με την εγγραφή σας αποδέχεστε την {privacy} μας. Μπορείτε να διαγραφείτε ανά πάσα στιγμή.",
      privacyLink: "πολιτική απορρήτου",
      done: "Ευχαριστούμε, η εγγραφή σας ολοκληρώθηκε.",
      error: "Δεν ήταν δυνατή η εγγραφή αυτής της διεύθυνσης. Ελέγξτε την και δοκιμάστε ξανά.",
    },
    accordionItem: {},
    toast: {
      kinds: { success: "Επιτυχία", error: "Σφάλμα", info: "Πληροφορία" },
      close: "Κλείσιμο ειδοποίησης",
    },
    copyCodeChip: {
      copy: "Αντιγραφή",
      label: "Αντιγραφή κωδικού {code}",
      copied: "Αντιγράφηκε",
      fallback: "Επιλέξτε τον κωδικό και αντιγράψτε τον",
    },
    countdownTimer: {
      label: "Η προσφορά λήγει στις {date}",
      ended: "Η προσφορά έχει λήξει",
    },
  },
  organisms: {},
  notFound: {
    title: "Η σελίδα δεν βρέθηκε",
    body: "Η σελίδα που ψάχνετε δεν υπάρχει.",
    home: "Επιστροφή στην αρχική σελίδα",
  },
};
