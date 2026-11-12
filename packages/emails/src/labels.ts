import type { EmailTotalKind } from "./types";

/**
 * The words of an order's summary and of a form's answers (D122), in the four languages the seed
 * writes the copy in; any other language reads English, as its copy does when Payload has none.
 * They are the layout's own, not copy an editor changes: the copy (subject, heading, body, button)
 * is Payload's `email-templates`, and these only name the columns and the sums under it.
 */
export type EmailLabels = {
  order: string;
  placed: string;
  quantity: string;
  totals: Record<EmailTotalKind, string>;
  shipTo: string;
  tracking: string;
  answers: string;
};

const LABELS: Readonly<Record<string, EmailLabels>> = {
  en: {
    order: "Order",
    placed: "Placed",
    quantity: "Qty",
    totals: {
      subtotal: "Subtotal",
      discount: "Discount",
      shipping: "Shipping",
      tax: "Taxes",
      total: "Total",
      refunded: "Refunded",
    },
    shipTo: "Ship to",
    tracking: "Tracking",
    answers: "Answers",
  },
  el: {
    order: "Παραγγελία",
    placed: "Ημερομηνία",
    quantity: "Ποσ.",
    totals: {
      subtotal: "Υποσύνολο",
      discount: "Έκπτωση",
      shipping: "Αποστολή",
      tax: "Φόροι",
      total: "Σύνολο",
      refunded: "Επιστροφή χρημάτων",
    },
    shipTo: "Αποστολή σε",
    tracking: "Παρακολούθηση",
    answers: "Απαντήσεις",
  },
  de: {
    order: "Bestellung",
    placed: "Datum",
    quantity: "Menge",
    totals: {
      subtotal: "Zwischensumme",
      discount: "Rabatt",
      shipping: "Versand",
      tax: "Steuern",
      total: "Gesamt",
      refunded: "Erstattet",
    },
    shipTo: "Lieferadresse",
    tracking: "Sendungsverfolgung",
    answers: "Antworten",
  },
  fr: {
    order: "Commande",
    placed: "Date",
    quantity: "Qté",
    totals: {
      subtotal: "Sous-total",
      discount: "Remise",
      shipping: "Livraison",
      tax: "Taxes",
      total: "Total",
      refunded: "Remboursé",
    },
    shipTo: "Livrer à",
    tracking: "Suivi",
    answers: "Réponses",
  },
};

/** The labels in `language` (`el`, `de-CH` reads `de`), or English. */
export function labelsFor(language: string): EmailLabels {
  const base = language.toLowerCase().split("-")[0] ?? "";
  return LABELS[base] ?? LABELS["en"]!;
}

export const LABEL_LANGUAGES = Object.keys(LABELS);
