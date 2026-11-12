import type { EmailView, Money, SummaryItem } from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { fixtureNow } from "../commerce/now";
import {
  designSystemFixtures,
  designSystemLocales,
  type DesignSystemLocale,
} from "../design-system";
import seed from "./templates.json" with { type: "json" };

// The e-mails' DS fixtures (M6 D130): each layout of `@shopblok/emails` with the seed's copy (the
// Payload documents `pnpm bootstrap` writes, `templates.json`) in the DS locale, the body as the
// seed's Lexical paragraphs, sample values for the type's variables, and the link a market's page
// would get. The address has an apostrophe, so the DS shows it escaped once. The order e-mails
// (T99) draw the delivered order of the checkout's fixtures, written as the backend writes it: the
// amounts in the market's currency and the date in the locale.

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
const ORDER_ID = "order_01JD4X8Q2E";

const ORIGIN = "https://shop.example";
/** Medusa Admin, where the admin's own e-mails go (`MEDUSA_BACKEND_URL` + `/app`). */
const ADMIN = "https://admin.shop.example/app";

/** Where each type's link goes (`lib/storefront-mail.ts` and the newsletter build them). */
const LINKS: Record<EmailFixtureType, (prefix: string, email: string) => string> = {
  "verify-email": (prefix) => `${ORIGIN}${prefix}/verify?code=${TOKEN}`,
  "password-reset": (prefix, email) =>
    `${ORIGIN}${prefix}/reset-password?token=${TOKEN}&email=${encodeURIComponent(email)}`,
  "order-transfer": (prefix) => `${ORIGIN}${prefix}/order/${ORDER_ID}/transfer/${TOKEN}`,
  "order-placed": (prefix) => `${ORIGIN}${prefix}/account/orders/${ORDER_ID}`,
  "order-shipped": (prefix) => `${ORIGIN}${prefix}/account/orders/${ORDER_ID}`,
  "order-canceled": (prefix) => `${ORIGIN}${prefix}/account/orders/${ORDER_ID}`,
  "return-requested": (prefix) => `${ORIGIN}${prefix}/account/orders/${ORDER_ID}`,
  "refund-issued": (prefix) => `${ORIGIN}${prefix}/account/orders/${ORDER_ID}`,
  welcome: (prefix) => `${ORIGIN}${prefix}/store`,
  "admin-invite": () => `${ADMIN}/invite?token=${TOKEN}`,
  "newsletter-confirm": (prefix) => `${ORIGIN}${prefix}/newsletter/confirm?token=${TOKEN}`,
  "form-message": () => `${ORIGIN}/admin/collections/form-submissions/42`,
};

type EmailOrder = NonNullable<EmailView["order"]>;

const moneyIn = (locale: DesignSystemLocale) => (money: Money) =>
  new Intl.NumberFormat(designSystemFixtures[locale].market.htmlLang, {
    style: "currency",
    currency: money.currencyCode,
  }).format(money.amount);

const optionsOf = (item: SummaryItem) =>
  item.options.map((option) => `${option.option}: ${option.value}`).join(", ") || undefined;

/** The checkout fixtures' delivered order as an order e-mail shows it, in the DS locale. */
function orderOf(locale: DesignSystemLocale): EmailOrder {
  const commerce = commerceFixtures[locale];
  const summary = commerce.cartCheckout.summary.order;
  const money = moneyIn(locale);
  const address = commerce.addresses[0];
  const date = new Date(Date.parse(fixtureNow) - 3 * 24 * 60 * 60 * 1000);
  return {
    number: "1042",
    date: new Intl.DateTimeFormat(designSystemFixtures[locale].market.htmlLang, {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date),
    lines: summary.items.map((item) => ({
      title: item.title,
      ...(optionsOf(item) === undefined ? {} : { detail: optionsOf(item) }),
      quantity: item.quantity,
      total: money(item.total),
    })),
    // A discount is the amount taken off (Medusa's `discount_total`), drawn with a minus.
    totals: summary.rows.flatMap((row) =>
      row.amount === undefined
        ? []
        : [{ kind: row.kind, amount: `${row.kind === "discount" ? "−" : ""}${money(row.amount)}` }],
    ),
    ...(address === undefined
      ? {}
      : {
          shipTo: [
            `${address.firstName} ${address.lastName}`,
            address.address1,
            [address.postalCode, address.city].filter(Boolean).join(" "),
            address.countryCode.toUpperCase(),
          ].filter((line) => line !== ""),
        }),
  };
}

/** What each order e-mail adds to the order: the parcel, the lines going back, the refund. */
function orderFor(type: EmailFixtureType, locale: DesignSystemLocale): EmailOrder | undefined {
  const order = orderOf(locale);
  const total = order.totals.find((row) => row.kind === "total")?.amount ?? "";
  switch (type) {
    case "order-placed":
    case "order-canceled":
      return order;
    case "order-shipped":
      return {
        ...order,
        totals: [],
        tracking: [
          { number: "1Z999AA10123456784", url: "https://tracking.example/1Z999AA10123456784" },
        ],
      };
    case "return-requested": {
      const { shipTo: _shipTo, ...rest } = order;
      return { ...rest, lines: order.lines.slice(0, 1), totals: [] };
    }
    case "refund-issued": {
      const { shipTo: _shipTo, ...rest } = order;
      return { ...rest, totals: [{ kind: "refunded", amount: total }] };
    }
    default:
      return undefined;
  }
}

/** A contact form's answers, with a value that holds markup: the e-mail shows it as text. */
const FORM: Record<DesignSystemLocale, NonNullable<EmailView["form"]>> = {
  en: {
    title: "Contact",
    answers: [
      { name: "name", label: "Name", value: "Siobhán O'Brien" },
      { name: "email", label: "Email", value: "o'brien@example.com" },
      {
        name: "message",
        label: "Message",
        value: "Do you ship to Ireland? <b>Asking</b> for a friend.\nThanks!",
      },
    ],
  },
  el: {
    title: "Επικοινωνία",
    answers: [
      { name: "name", label: "Όνομα", value: "Ελένη Παπαδοπούλου" },
      { name: "email", label: "Email", value: "eleni.papadopoulou@example.gr" },
      { name: "message", label: "Μήνυμα", value: "Στέλνετε στην Κύπρο;" },
    ],
  },
  de: {
    title: "Kontakt",
    answers: [
      { name: "name", label: "Name", value: "Jonas Müller" },
      { name: "email", label: "E-Mail", value: "jonas.mueller@example.de" },
      { name: "message", label: "Nachricht", value: "Liefern Sie auch nach Österreich?" },
    ],
  },
  fr: {
    title: "Contact",
    answers: [
      { name: "name", label: "Nom", value: "Chloé Dubois" },
      { name: "email", label: "E-mail", value: "chloe.dubois@example.fr" },
      { name: "message", label: "Message", value: "Livrez-vous en Belgique ?" },
    ],
  },
};

function view(locale: DesignSystemLocale, type: EmailFixtureType): EmailView {
  const copy = (seed.templates[type] as Record<string, SeedCopy>)[locale];
  if (copy === undefined) throw new Error(`templates.json has no ${type} in ${locale}`);
  const email = ADDRESSES[locale];
  // The market's public prefix (`/us`), or none for a market at the root (`/`).
  const prefix = commerceFixtures[locale].header.content.homeHref.replace(/\/$/, "");
  const order = orderFor(type, locale);
  const total = order?.totals.find((row) => row.kind === "total" || row.kind === "refunded");
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
    variables: {
      email,
      code: TOKEN,
      orderNumber: "1042",
      total: total?.amount ?? "",
      amount: total?.amount ?? "",
      form: FORM[locale].title,
    },
    url: LINKS[type](prefix, email),
    language: locale,
    shop: { name: designSystemFixtures[locale].ordinary.storeName },
    ...(order === undefined ? {} : { order }),
    ...(type === "form-message" ? { form: FORM[locale] } : {}),
  };
}

const types = Object.keys(seed.templates) as EmailFixtureType[];

/** Each e-mail type's layout input in each DS locale. */
export const emailFixtures = Object.fromEntries(
  designSystemLocales.map((locale) => [
    locale,
    Object.fromEntries(types.map((type) => [type, view(locale, type)])),
  ]),
) as Record<DesignSystemLocale, Record<EmailFixtureType, EmailView>>;
