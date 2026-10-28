import emailCopy from "@shopblok/fixtures/email/templates.json";
import { EMAIL_TYPES } from "../collections/email-templates";
import type { SeedDocument, SeedModule } from "./types";
import type { Seeded } from "./values";

type Copy = { subject: string; preheader: string; heading: string; body: string[]; cta: string };

/** Paragraphs as Lexical's JSON, in the shape Payload's editor stores. */
export function lexicalParagraphs(paragraphs: readonly string[]) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        textFormat: 0,
        textStyle: "",
        children: [
          { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
        ],
      })),
    },
  };
}

function perLanguage(
  copy: Record<string, Copy>,
  field: (copy: Copy) => unknown,
): Record<string, Seeded> {
  return Object.fromEntries(
    Object.entries(copy).map(([language, text]) => [language, { value: field(text) }]),
  );
}

/**
 * The copy of M3's three e-mails in the seeded markets' four languages (D84), from
 * `@shopblok/fixtures/email/templates.json`, whose English the backend also keeps as its built-in
 * copy. Under the seed runner's rule, so an editor's change survives `pnpm bootstrap`.
 */
export const emailTemplatesSeed: SeedModule = {
  collection: "email-templates",
  documents: () =>
    EMAIL_TYPES.map((type): SeedDocument => {
      const copy = emailCopy.templates[type] as Record<string, Copy>;
      return {
        key: `email-${type}`,
        publish: false,
        shared: { type: { value: type } },
        localized: {
          subject: perLanguage(copy, (text) => text.subject),
          preheader: perLanguage(copy, (text) => text.preheader),
          heading: perLanguage(copy, (text) => text.heading),
          body: perLanguage(copy, (text) => lexicalParagraphs(text.body)),
          cta: perLanguage(copy, (text) => text.cta),
        },
      };
    }),
};
