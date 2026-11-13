/**
 * The e-mail types this package lays out (D121, D122): M3's three (T98), and T99's order, account,
 * newsletter and form e-mails, each a layout here and a document of Payload's `email-templates`.
 */
export const EMAIL_TYPES = [
  "verify-email",
  "password-reset",
  "order-transfer",
  "order-placed",
  "order-shipped",
  "order-canceled",
  "return-requested",
  "refund-issued",
  "welcome",
  "admin-invite",
  "newsletter-confirm",
  "form-message",
] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/** The types that draw an order's summary (`EmailInput.order`, D122): the order's own e-mails. */
export const ORDER_EMAIL_TYPES = [
  "order-placed",
  "order-shipped",
  "order-canceled",
  "return-requested",
  "refund-issued",
] as const satisfies readonly EmailType[];
export type OrderEmailType = (typeof ORDER_EMAIL_TYPES)[number];

export const isOrderEmail = (type: EmailType): type is OrderEmailType =>
  (ORDER_EMAIL_TYPES as readonly EmailType[]).includes(type);

/**
 * The variables each type's copy may use, as Payload's `email-templates` collection lists them
 * (both match `@shopblok/fixtures/email/templates.json`, which the tests on each side read). Any
 * other `{{name}}` stays as it is written.
 */
export const EMAIL_VARIABLES: Readonly<Record<EmailType, readonly string[]>> = {
  "verify-email": ["email", "code"],
  "password-reset": ["email"],
  "order-transfer": ["email", "orderNumber"],
  "order-placed": ["email", "orderNumber", "total"],
  "order-shipped": ["email", "orderNumber"],
  "order-canceled": ["email", "orderNumber"],
  "return-requested": ["email", "orderNumber"],
  "refund-issued": ["email", "orderNumber", "amount"],
  welcome: ["email"],
  "admin-invite": ["email"],
  "newsletter-confirm": ["email"],
  "form-message": ["form"],
};

/** A node of a Lexical document (Payload's `richText` JSON), as far as the e-mails read it. */
export type LexicalNode = {
  type?: unknown;
  text?: unknown;
  /** Lexical's text format bits: 1 bold, 2 italic, 8 underline (the others are drawn plain). */
  format?: unknown;
  tag?: unknown;
  children?: unknown;
  listType?: unknown;
  fields?: { url?: unknown } | null;
  url?: unknown;
};

/** Payload's `richText` value: `{ root: { children: [...] } }`. */
export type RichTextDocument = { root: LexicalNode };

/**
 * An e-mail's copy as an editor wrote it, `{{variables}}` not filled in: the subject, the preheader
 * (the line an inbox shows after the subject), the heading, the body (rich text) and the button's
 * label (`cta`). The link is not copy: it is the notification's `url`.
 */
export type EmailCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: RichTextDocument;
  cta: string;
};

/** The shop the e-mail comes from: its name in the frame's head and foot. */
export type EmailShop = { name: string };

/**
 * An order as its e-mails show it (D122), every value already written for the reader: the backend
 * formats the amounts in the order's currency and the date in the market's time zone, in the
 * order's language (SPEC §8.4), so the layout only lays them out. Each value is a text node.
 */
export type EmailOrder = {
  /** The order's number as the shop shows it (`display_id`). */
  number: string;
  /** When it was placed, formatted. */
  date: string;
  /** The lines the e-mail is about: the order's, or the ones a return names. */
  lines: readonly EmailOrderLine[];
  /** The sums under the lines, in this order; `total` is drawn bold. */
  totals: readonly { kind: EmailTotalKind; amount: string }[];
  /** The shipping address, a line each. */
  shipTo?: readonly string[];
  /** A shipment's tracking numbers, each with its carrier's link when it has one. */
  tracking?: readonly { number: string; url?: string }[];
};

export type EmailOrderLine = {
  title: string;
  /** The variant's options (`Size: M`), or nothing. */
  detail?: string;
  quantity: number;
  /** The line's total, formatted. */
  total: string;
};

export const EMAIL_TOTAL_KINDS = [
  "subtotal",
  "discount",
  "shipping",
  "tax",
  "total",
  "refunded",
] as const;
export type EmailTotalKind = (typeof EMAIL_TOTAL_KINDS)[number];

/**
 * A Payload form's e-mail (`form-message`, D122): the form's title, the answers as they were sent,
 * and, when the form's e-mail has them, its own subject and message, whose `{{field}}` names are
 * filled in with the answers as text.
 */
export type EmailForm = {
  title: string;
  answers: readonly { name: string; label: string; value: string }[];
  subject?: string;
  message?: RichTextDocument;
};

/** What a layout draws, and what `render()` takes besides the type. */
export type EmailInput = {
  copy: EmailCopy;
  /** The values of the type's variables; a value goes in as text, escaped once, in React. */
  variables: Readonly<Record<string, string | undefined>>;
  /** The button's link: an absolute `http(s)` URL, or the e-mail is refused. */
  url: string;
  /** The copy's language (`en`, `el`, `fa`…): `lang` and `dir` of the document. */
  language: string;
  shop: EmailShop;
  /** The order the e-mail is about: required by the order e-mails (`ORDER_EMAIL_TYPES`). */
  order?: EmailOrder;
  /** The form and its answers: required by `form-message`. */
  form?: EmailForm;
};

/** An e-mail ready to send: the subject, the HTML and the plain-text part. */
export type RenderedEmail = { subject: string; html: string; text: string };
