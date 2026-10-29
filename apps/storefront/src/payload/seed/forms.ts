import type { Payload } from "payload";
import { DEFAULT_LOCALE } from "../locales";
import { lexicalParagraphs } from "./email-templates";
import type { SeedCounts } from "./types";

// The seeded forms (T67, D81): "Newsletter", the footer's signup (one email field, the shape a
// newsletter needs), and "Contact", a contact form with every kind D81 offers. Created once, in the
// seeded markets' four languages; after that a form is the editors' own, so a second run leaves an
// existing one alone, whatever it holds now (a form's fields are its structure, which no seed rule
// can merge with an editor's change).

const LANGUAGES = ["en", "el", "de", "fr"] as const;
type Language = (typeof LANGUAGES)[number];

type Words = {
  email: string;
  name: string;
  topic: string;
  topics: [string, string, string];
  order: string;
  message: string;
  note: string;
  consent: string;
  submit: string;
  confirmation: string;
};

const WORDS: Record<Language, Words> = {
  en: {
    email: "Email address",
    name: "Your name",
    topic: "What is it about?",
    topics: ["An order", "Returns and repairs", "Something else"],
    order: "Order number",
    message: "Your message",
    note: "Please do not send card numbers or passwords in this form.",
    consent: "I agree that you may keep my message to answer it.",
    submit: "Send message",
    confirmation: "Thank you for writing. We will answer within one working day.",
  },
  el: {
    email: "Διεύθυνση email",
    name: "Το όνομά σας",
    topic: "Για ποιο θέμα;",
    topics: ["Μια παραγγελία", "Επιστροφές και επιδιορθώσεις", "Κάτι άλλο"],
    order: "Αριθμός παραγγελίας",
    message: "Το μήνυμά σας",
    note: "Μη στέλνετε αριθμούς καρτών ή κωδικούς σε αυτή τη φόρμα.",
    consent: "Συμφωνώ να κρατήσετε το μήνυμά μου για να μου απαντήσετε.",
    submit: "Αποστολή μηνύματος",
    confirmation: "Ευχαριστούμε που μας γράψατε. Θα απαντήσουμε μέσα σε μία εργάσιμη ημέρα.",
  },
  de: {
    email: "E-Mail-Adresse",
    name: "Ihr Name",
    topic: "Worum geht es?",
    topics: ["Eine Bestellung", "Rücksendungen und Reparaturen", "Etwas anderes"],
    order: "Bestellnummer",
    message: "Ihre Nachricht",
    note: "Bitte senden Sie in diesem Formular keine Kartennummern oder Passwörter.",
    consent: "Ich bin einverstanden, dass Sie meine Nachricht speichern, um sie zu beantworten.",
    submit: "Nachricht senden",
    confirmation: "Danke für Ihre Nachricht. Wir antworten innerhalb eines Werktags.",
  },
  fr: {
    email: "Adresse e-mail",
    name: "Votre nom",
    topic: "De quoi s’agit-il ?",
    topics: ["Une commande", "Retours et réparations", "Autre chose"],
    order: "Numéro de commande",
    message: "Votre message",
    note: "N’envoyez ni numéro de carte ni mot de passe dans ce formulaire.",
    consent: "J’accepte que vous conserviez mon message pour y répondre.",
    submit: "Envoyer le message",
    confirmation: "Merci de nous avoir écrit. Nous répondrons en un jour ouvré.",
  },
};

type Row = Record<string, unknown> & { id?: string; options?: Row[] };

/** One seeded form: its key, its title (not localized) and its data in one language. */
export type FormSeed = {
  key: string;
  title: string;
  data: (words: Words) => {
    fields: Row[];
    submitButtonLabel?: string;
    confirmationMessage?: unknown;
  };
};

export const FORM_SEEDS: readonly FormSeed[] = [
  {
    key: "newsletter",
    title: "Newsletter",
    data: (words) => ({
      fields: [
        { blockType: "email", name: "email", label: words.email, required: true, width: 100 },
      ],
    }),
  },
  {
    key: "contact",
    title: "Contact",
    data: (words) => ({
      fields: [
        { blockType: "text", name: "name", label: words.name, required: true, width: 50 },
        { blockType: "email", name: "email", label: words.email, required: true, width: 50 },
        {
          blockType: "select",
          name: "topic",
          label: words.topic,
          required: false,
          width: 50,
          options: words.topics.map((label, index) => ({
            label,
            value: ["order", "returns", "other"][index],
          })),
        },
        { blockType: "text", name: "order", label: words.order, required: false, width: 50 },
        {
          blockType: "textarea",
          name: "message",
          label: words.message,
          required: true,
          width: 100,
        },
        { blockType: "message", message: lexicalParagraphs([words.note]) },
        {
          blockType: "checkbox",
          name: "consent",
          label: words.consent,
          required: true,
          width: 100,
        },
      ],
      submitButtonLabel: words.submit,
      confirmationMessage: lexicalParagraphs([words.confirmation]),
    }),
  },
];

/** The rows of another language, given the ids Payload gave the rows (and their options) on create. */
function withIds(rows: Row[], stored: Row[]): Row[] {
  return rows.map((row, index) => {
    const twin = stored[index];
    const options =
      row.options === undefined
        ? {}
        : {
            options: row.options.map((option, at) => ({ ...option, id: twin?.options?.[at]?.id })),
          };
    return { ...row, id: twin?.id, ...options };
  });
}

/** Seeds writes many documents: no revalidation per save (`run.ts`). */
const CONTEXT = { disableRevalidate: true };

/**
 * Creates each seeded form that is not there yet (found by its `seedKey`): English first, then
 * the other languages' labels on the same rows. One that is there is left as it is. A system task:
 * access control is off, and nothing is revalidated.
 */
export async function seedForms(
  payload: Payload,
  seeds: readonly FormSeed[] = FORM_SEEDS,
): Promise<SeedCounts> {
  const counts: SeedCounts = { created: 0, updated: 0, unchanged: 0, kept: [] };
  for (const seed of seeds) {
    const { docs } = await payload.find({
      collection: "forms",
      where: { seedKey: { equals: seed.key } },
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
    });
    if (docs.length > 0) {
      counts.unchanged++;
      continue;
    }
    const created = await payload.create({
      collection: "forms",
      locale: DEFAULT_LOCALE,
      data: { title: seed.title, seedKey: seed.key, ...seed.data(WORDS.en) } as never,
      depth: 0,
      overrideAccess: true,
      context: CONTEXT,
    });
    const stored = (created.fields ?? []) as Row[];
    for (const language of LANGUAGES) {
      if (language === DEFAULT_LOCALE) continue;
      const data = seed.data(WORDS[language]);
      await payload.update({
        collection: "forms",
        id: created.id,
        locale: language,
        data: { ...data, fields: withIds(data.fields, stored) } as never,
        depth: 0,
        overrideAccess: true,
        context: CONTEXT,
      });
    }
    counts.created++;
  }
  return counts;
}

/** The seeded newsletter form's id, for the footer's seed; `undefined` before `seedForms` ran. */
export async function seededNewsletterId(payload: Payload): Promise<number | undefined> {
  const { docs } = await payload.find({
    collection: "forms",
    where: { seedKey: { equals: "newsletter" } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  });
  return docs[0]?.id;
}
