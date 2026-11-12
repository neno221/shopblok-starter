import { z } from "zod";

// What an e-mail's layout shows (M6 D121, D130): `@shopblok/emails`' `EmailInput`, the copy as an
// editor wrote it in Payload's `email-templates` (its `{{variables}}` not filled in), the values the
// layout fills in as text, the link of its button, the language and the shop. The DS draws each
// layout with the seed's copy (`@shopblok/fixtures`' `emailFixtures`), which this parses.

/** A block of Payload's rich text (a Lexical node: paragraph, heading, list, quote…). */
const RichTextBlock = z.looseObject({ type: z.string().min(1) });

/** The e-mail's copy in one language, as written. */
export const EmailCopy = z.object({
  subject: z.string().min(1).describe("Also the document's title; {{variables}} filled in as text"),
  preheader: z.string().describe("The line an inbox shows after the subject; hidden in the body"),
  heading: z.string().min(1),
  body: z
    .object({
      root: z.looseObject({ type: z.literal("root"), children: z.array(RichTextBlock) }),
    })
    .describe("Payload's rich text: paragraphs, h2 to h4, lists, quotes and http(s) links"),
  cta: z.string().min(1).describe("The button's label"),
});

/** What an e-mail layout draws (VerifyEmail, PasswordResetEmail, OrderTransferEmail). */
export const EmailView = z.object({
  copy: EmailCopy,
  variables: z
    .record(z.string(), z.string())
    .describe("The type's variables (email, code, orderNumber): text nodes, escaped once"),
  url: z
    .url({ protocol: /^https?$/ })
    .describe("The button's link: an absolute http(s) URL, or the e-mail is refused"),
  language: z
    .string()
    .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/)
    .describe("lang of the e-mail; dir is rtl for Persian or Arabic"),
  shop: z.object({ name: z.string().min(1).describe("Settings → Store in Medusa") }),
});
export type EmailView = z.infer<typeof EmailView>;
