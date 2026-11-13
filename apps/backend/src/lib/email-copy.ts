import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  copyFromTemplate,
  EMAIL_VARIABLES,
  fillVariables,
  lexicalToText,
  type EmailCopy as LayoutCopy,
  type EmailType,
} from "@shopblok/emails";

import { payloadModule } from "./payload-sync";

/**
 * The copy of the e-mails the backend sends (D84, T70): Payload's `email-templates` in the
 * shopper's language, read as the `medusa-sync` integration and kept 5 minutes in memory, with
 * the `{{variables}}` filled in. When Payload does not answer within 2 s (or is not configured),
 * the e-mail goes out with the built-in English below, so a CMS outage never stops a link. Until
 * M6 the body was plain text only (`lexicalToText`); since M6 (D121) the copy as written goes to
 * `@shopblok/emails`, which lays it out as HTML, and the plain text stays in the notification's
 * `data` for the console provider.
 */

// The types, their variables, the variables' rule and the rich text's plain text live in
// `@shopblok/emails` since M6 (D121), so the HTML layouts and this module read one list.
export { EMAIL_TYPES, EMAIL_VARIABLES, fillVariables, lexicalToText } from "@shopblok/emails";
export type { EmailType } from "@shopblok/emails";

type Copy = { subject: string; preheader: string; heading: string; body: string[]; cta: string };

/** The seed's English (the fixture's), used whenever Payload has no answer. */
export const BUILT_IN: Record<EmailType, Copy> = {
  "verify-email": {
    subject: "Confirm your e-mail address",
    preheader: "One click to finish creating your account.",
    heading: "Confirm your e-mail address",
    body: [
      "Hello,",
      "Please confirm that {{email}} is your address by opening the link below. The link works once.",
    ],
    cta: "Confirm my address",
  },
  "password-reset": {
    subject: "Reset your password",
    preheader: "Choose a new password for your account.",
    heading: "Reset your password",
    body: [
      "Someone asked to reset the password for {{email}}. If it was you, open the link below and choose a new one.",
      "If it was not you, you can ignore this e-mail: your password stays as it is.",
    ],
    cta: "Choose a new password",
  },
  "order-transfer": {
    subject: "Order {{orderNumber}}: confirm the move to an account",
    preheader: "Accept or decline the request.",
    heading: "Move order {{orderNumber}} to an account?",
    body: [
      "Someone signed in to an account asked to add order {{orderNumber}}, placed with {{email}}, to their account.",
      "If it was you, open the link below to accept. If not, you can decline there, or ignore this e-mail.",
    ],
    cta: "See the request",
  },
  "order-placed": {
    subject: "Order {{orderNumber}} confirmed",
    preheader: "Thank you for your order. Here is what you ordered.",
    heading: "Thank you for your order",
    body: [
      "We have received order {{orderNumber}} and are getting it ready. You will get another e-mail when it ships.",
      "The order comes to {{total}}. Here is a summary:",
    ],
    cta: "View your order",
  },
  "order-shipped": {
    subject: "Order {{orderNumber}} is on its way",
    preheader: "Your order has shipped.",
    heading: "Your order is on its way",
    body: [
      "Good news: order {{orderNumber}} has left our warehouse.",
      "Follow the parcel with the tracking number below.",
    ],
    cta: "View your order",
  },
  "order-canceled": {
    subject: "Order {{orderNumber}} canceled",
    preheader: "Your order has been canceled.",
    heading: "Your order has been canceled",
    body: [
      "Order {{orderNumber}} has been canceled. If you paid for it, the payment is returned to you.",
      "If you did not ask for this, reply to this e-mail and we will help.",
    ],
    cta: "View your order",
  },
  "return-requested": {
    subject: "Return for order {{orderNumber}} received",
    preheader: "We have your return request.",
    heading: "We have your return request",
    body: [
      "We have received your request to return items from order {{orderNumber}}. These are the items:",
      "Send them back as the return's instructions say. We refund you once they arrive.",
    ],
    cta: "View your order",
  },
  "refund-issued": {
    subject: "Refund for order {{orderNumber}}",
    preheader: "We have refunded {{amount}}.",
    heading: "Your refund is on its way",
    body: [
      "We have refunded {{amount}} for order {{orderNumber}} to the way you paid.",
      "It can take a few working days to show on your statement.",
    ],
    cta: "View your order",
  },
  welcome: {
    subject: "Welcome to the shop",
    preheader: "Your account is ready.",
    heading: "Welcome",
    body: [
      "Your address {{email}} is confirmed and your account is ready.",
      "Sign in to see your orders, keep your addresses and check out faster.",
    ],
    cta: "Start shopping",
  },
  "admin-invite": {
    subject: "You are invited to the shop's admin",
    preheader: "Accept the invite to manage the shop.",
    heading: "You are invited",
    body: [
      "You have been invited to manage the shop in Medusa Admin as {{email}}.",
      "Open the link below to choose a password and accept. The invite expires after a day.",
    ],
    cta: "Accept the invite",
  },
  "newsletter-confirm": {
    subject: "Confirm your subscription",
    preheader: "One click to start getting our newsletter.",
    heading: "Confirm your subscription",
    body: [
      "Someone, hopefully you, asked to send our newsletter to {{email}}.",
      "Open the link below and press “Confirm” to subscribe. If it was not you, ignore this e-mail: nothing is sent until you confirm. The link works for 48 hours.",
    ],
    cta: "Confirm my subscription",
  },
  "form-message": {
    subject: "New answer to “{{form}}”",
    preheader: "A visitor sent the form.",
    heading: "New answer to “{{form}}”",
    body: ["A visitor sent the form “{{form}}”. Their answers are below."],
    cta: "Open it in the admin",
  },
};

/** What an e-mail's copy came to, ready for the notification's `data`. */
export type EmailCopy = {
  subject: string;
  preheader: string;
  heading: string;
  /** The body as plain text, paragraphs separated by a blank line. */
  text: string;
  cta: string;
  /** The language the copy is in (`en` for the built-in copy). */
  language: string;
  source: "payload" | "built-in";
  /**
   * The same copy as written, `{{variables}}` not filled in and the body as rich text, for the HTML
   * layouts (`render()` of `@shopblok/emails` fills the variables in as text nodes, D121).
   */
  template: LayoutCopy;
};

/** A template as Payload answers it, in one language (fields Payload has none for are missing). */
export type StoredTemplate = Partial<
  Record<"subject" | "preheader" | "heading" | "cta", unknown>
> & {
  body?: unknown;
};

const DEFAULT_LANGUAGE = "en";
const LANGUAGE = /^[a-z]{2,3}$/;

/**
 * The language the storefront sent with the request (`metadata.language`, T70), or English. It
 * comes from the client, so only a language code's shape is taken: it becomes Payload's `locale`.
 */
export function languageFrom(metadata: unknown): string {
  const language = (metadata as { language?: unknown } | null | undefined)?.language;
  return typeof language === "string" && LANGUAGE.test(language) ? language : DEFAULT_LANGUAGE;
}

/** Reads a type's template in a language; `null` when Payload has none. */
export type TemplateSource = (
  type: EmailType,
  language: string,
  timeoutMs: number,
) => Promise<StoredTemplate | null>;

export type EmailCopyOptions = {
  source: TemplateSource;
  /** How long Payload may take before the built-in copy is used (D84: 2 s). */
  timeoutMs?: number;
  /** How long an answer is kept (D84: 5 minutes). */
  ttlMs?: number;
  /** How many answers are kept at most; the oldest goes first. */
  maxEntries?: number;
  now?: () => number;
  warn?: (message: string) => void;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function createEmailCopy({
  source,
  timeoutMs = 2_000,
  ttlMs = 5 * 60_000,
  maxEntries = 100,
  now = Date.now,
  warn = () => undefined,
}: EmailCopyOptions) {
  // The language in the key comes from the client (PR 92 review, item 3): the cache is bounded,
  // and e-mails that miss the same key at once share one request to Payload.
  const cache = new Map<string, { at: number; template: StoredTemplate | null }>();
  const pending = new Map<string, Promise<StoredTemplate | null>>();

  function keep(key: string, template: StoredTemplate | null) {
    cache.delete(key);
    cache.set(key, { at: now(), template });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value as string);
  }

  async function read(type: EmailType, language: string, key: string) {
    try {
      const found = await withTimeout(source(type, language, timeoutMs), timeoutMs);
      keep(key, found);
      return found;
    } catch (error) {
      // Not kept: the next e-mail asks Payload again.
      warn(
        `email-copy: ${type} (${language}) from Payload failed, so it goes out in English: ${reason(error)}`,
      );
      return null;
    } finally {
      pending.delete(key);
    }
  }

  function template(type: EmailType, language: string): Promise<StoredTemplate | null> {
    const key = `${type}:${language}`;
    const kept = cache.get(key);
    if (kept !== undefined && now() - kept.at < ttlMs) return Promise.resolve(kept.template);
    let request = pending.get(key);
    if (request === undefined) {
      request = read(type, language, key);
      pending.set(key, request);
    }
    return request;
  }

  return {
    async copyFor(
      type: EmailType,
      language: string,
      values: Record<string, string | undefined>,
    ): Promise<EmailCopy> {
      const stored = await template(type, language);
      const fill = (text: string) => fillVariables(text, EMAIL_VARIABLES[type], values);
      // A field Payload leaves empty takes the built-in English one (`@shopblok/emails`' rule).
      const {
        copy: written,
        language: copyLanguage,
        source,
      } = copyFromTemplate(stored, BUILT_IN[type], language);
      return {
        subject: fill(written.subject),
        preheader: fill(written.preheader),
        heading: fill(written.heading),
        text: fill(lexicalToText(written.body)),
        cta: fill(written.cta),
        language: copyLanguage,
        source,
        template: written,
      };
    },
    /** How many answers are kept (tests). */
    size: () => cache.size,
  };
}

export type EmailCopySource = ReturnType<typeof createEmailCopy>;

let shared: EmailCopySource | undefined;

/**
 * The process's copy reader: through the `payload` module when it is registered
 * (`PAYLOAD_SERVER_URL` and `PAYLOAD_API_KEY`), else the built-in English only.
 */
export function emailCopyFor(container: MedusaContainer): EmailCopySource {
  if (shared !== undefined) return shared;
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  // The sync's check, which logs once when the module is off (PR 92 review, item 6).
  const payload = payloadModule(container);
  shared = createEmailCopy({
    source: async (type, language, timeoutMs) =>
      payload === undefined
        ? null
        : ((await payload.findEmailTemplate(type, language, timeoutMs)) as StoredTemplate | null),
    warn: (message) => logger.warn(message),
  });
  return shared;
}
