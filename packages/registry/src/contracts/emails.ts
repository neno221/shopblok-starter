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

/**
 * An order as its e-mails show it (T99, D122): every value written already, in the order's
 * language, currency and time zone (the backend formats them; the layout lays them out as text).
 */
export const EmailOrder = z.object({
  number: z.string().min(1).describe("The order's display number"),
  date: z.string().min(1).describe("When it was placed, formatted in the market's time zone"),
  lines: z.array(
    z.object({
      title: z.string().min(1),
      detail: z.string().min(1).optional().describe("The variant's options"),
      quantity: z.int().positive(),
      total: z.string().min(1).describe("The line's total, formatted"),
    }),
  ),
  totals: z
    .array(
      z.object({
        kind: z.enum(["subtotal", "discount", "shipping", "tax", "total", "refunded"]),
        amount: z.string().min(1),
      }),
    )
    .describe("The sums under the lines; total and refunded are drawn bold"),
  shipTo: z.array(z.string().min(1)).optional().describe("The shipping address, a line each"),
  tracking: z
    .array(
      z.object({
        number: z.string().min(1),
        url: z
          .url({ protocol: /^https?$/ })
          .optional()
          .describe("The carrier's page, http(s) only"),
      }),
    )
    .optional(),
});

/** A Payload form's e-mail (`form-message`): the form, its answers as text, its own subject and message. */
export const EmailForm = z.object({
  title: z.string().min(1),
  answers: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string().min(1),
      value: z.string().describe("As the visitor sent it: a text node, never HTML"),
    }),
  ),
  subject: z.string().optional(),
  message: EmailCopy.shape.body.optional(),
});

/** What an e-mail layout draws (VerifyEmail, OrderPlacedEmail, FormMessageEmail…). */
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
  order: EmailOrder.optional().describe("The order e-mails' summary"),
  form: EmailForm.optional().describe("form-message's form and answers"),
});
export type EmailView = z.infer<typeof EmailView>;
