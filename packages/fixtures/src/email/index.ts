import type { EmailView } from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { designSystemFixtures, type DesignSystemLocale } from "../design-system";
import seed from "./templates.json" with { type: "json" };

// The e-mails' DS fixtures (M6 D130): each layout of `@shopblok/emails` with the seed's copy (the
// Payload documents `pnpm bootstrap` writes, `templates.json`) in the DS locale, the body as the
// seed's Lexical paragraphs, sample values for the type's variables, and the link a market's page
// would get. The address has an apostrophe, so the DS shows it escaped once.

export type EmailFixtureType = keyof typeof seed.templates;

type SeedCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: string[];
  cta: string;
};

const ADDRESSES: Record<DesignSystemLocale, string> = {
  en: "o'brien@example.com",
  el: "eleni.papadopoulou@example.gr",
  de: "jonas.mueller@example.de",
  fr: "chloe.dubois@example.fr",
};

/** A verification code or reset token as Medusa makes one: long, with nowhere to break. */
const TOKEN = "9f2c4e7a1b8d3f6e0a5c2b9d7e4f1a3c5b8e2d6f9a1c4e7b";

/** Where each type's link goes in the market's storefront (`lib/storefront-mail.ts` builds it). */
const LINKS: Record<EmailFixtureType, (prefix: string) => string> = {
  "verify-email": (prefix) => `${prefix}/verify?code=${TOKEN}`,
  "password-reset": (prefix) => `${prefix}/reset-password?token=${TOKEN}&email=`,
  "order-transfer": (prefix) => `${prefix}/order/order_01JD4X8Q2E/transfer/${TOKEN}`,
};

const ORIGIN = "https://shop.example";

function view(locale: DesignSystemLocale, type: EmailFixtureType): EmailView {
  const copy = (seed.templates[type] as Record<string, SeedCopy>)[locale];
  if (copy === undefined) throw new Error(`templates.json has no ${type} in ${locale}`);
  const email = ADDRESSES[locale];
  // The market's public prefix (`/us`), or none for a market at the root (`/`).
  const prefix = commerceFixtures[locale].header.content.homeHref.replace(/\/$/, "");
  const link = LINKS[type](prefix);
  return {
    copy: {
      ...copy,
      body: {
        root: {
          type: "root",
          children: copy.body.map((text) => ({
            type: "paragraph",
            children: [{ type: "text", text, format: 0 }],
          })),
        },
      },
    },
    variables: { email, code: TOKEN, orderNumber: "1042" },
    url: `${ORIGIN}${type === "password-reset" ? `${link}${encodeURIComponent(email)}` : link}`,
    language: locale,
    shop: { name: designSystemFixtures[locale].ordinary.storeName },
  };
}

const types = Object.keys(seed.templates) as EmailFixtureType[];

/** Each e-mail type's layout input in each DS locale. */
export const emailFixtures: Record<DesignSystemLocale, Record<EmailFixtureType, EmailView>> = {
  en: Object.fromEntries(types.map((type) => [type, view("en", type)])) as Record<
    EmailFixtureType,
    EmailView
  >,
  el: Object.fromEntries(types.map((type) => [type, view("el", type)])) as Record<
    EmailFixtureType,
    EmailView
  >,
  de: Object.fromEntries(types.map((type) => [type, view("de", type)])) as Record<
    EmailFixtureType,
    EmailView
  >,
  fr: Object.fromEntries(types.map((type) => [type, view("fr", type)])) as Record<
    EmailFixtureType,
    EmailView
  >,
};
