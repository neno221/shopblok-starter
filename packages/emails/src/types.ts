/**
 * The e-mail types this package lays out (D121): M3's three. T99 adds the order, account and
 * newsletter e-mails (D122), each a layout here and a document of Payload's `email-templates`.
 */
export const EMAIL_TYPES = ["verify-email", "password-reset", "order-transfer"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/**
 * The variables each type's copy may use, as Payload's `email-templates` collection lists them
 * (both match `@shopblok/fixtures/email/templates.json`, which the tests on each side read). Any
 * other `{{name}}` stays as it is written.
 */
export const EMAIL_VARIABLES: Readonly<Record<EmailType, readonly string[]>> = {
  "verify-email": ["email", "code"],
  "password-reset": ["email"],
  "order-transfer": ["email", "orderNumber"],
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
};

/** An e-mail ready to send: the subject, the HTML and the plain-text part. */
export type RenderedEmail = { subject: string; html: string; text: string };
