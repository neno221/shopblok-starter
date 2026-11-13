import { paragraphs, richTextHasText } from "./rich-text";
import type { EmailCopy } from "./types";

// An e-mail's copy from its stored template (D84, D121), the one rule for both apps: the backend
// (Medusa's e-mails, `lib/email-copy.ts`) and the storefront (Payload's own e-mails,
// `payload/send-email.ts`) each read Payload their own way and hand the result here.

/** The seed's English for a type: what every field Payload leaves empty falls back to. */
export type EnglishCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: readonly string[];
  cta: string;
};

/** A template as Payload answers it, in one language; a field it has none for is missing. */
export type StoredCopy = Partial<
  Record<"subject" | "preheader" | "heading" | "cta" | "body", unknown>
>;

export type CopyFromTemplate = {
  /** The copy as written: `{{variables}}` not filled in, the body as rich text. */
  copy: EmailCopy;
  /** `language` when Payload has the subject in it, else `en` (the English filled in). */
  language: string;
  source: "payload" | "built-in";
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

/**
 * `stored` (a type's template in `language`, or nothing) with each empty field the seed's English;
 * the body only when its rich text has text. The copy counts as Payload's, in `language`, when
 * Payload has its subject.
 */
export function copyFromTemplate(
  stored: StoredCopy | null | undefined,
  english: EnglishCopy,
  language: string,
): CopyFromTemplate {
  const subject = text(stored?.subject);
  const body = stored?.body;
  const fromPayload = subject !== undefined;
  return {
    copy: {
      subject: subject ?? english.subject,
      preheader: text(stored?.preheader) ?? english.preheader,
      heading: text(stored?.heading) ?? english.heading,
      body: richTextHasText(body) ? body : paragraphs(english.body),
      cta: text(stored?.cta) ?? english.cta,
    },
    language: fromPayload ? language : "en",
    source: fromPayload ? "payload" : "built-in",
  };
}
