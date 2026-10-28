import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { PAYLOAD_MODULE } from "../modules/payload";
import type PayloadModuleService from "../modules/payload/service";

/**
 * The copy of the e-mails the backend sends (D84, T70): Payload's `email-templates` in the
 * shopper's language, read as the `medusa-sync` integration and kept 5 minutes in memory, with
 * the `{{variables}}` filled in. When Payload does not answer within 2 s (or is not configured),
 * the e-mail goes out with the built-in English below, so a CMS outage never stops a link. In M4
 * the body is plain text (`lexicalToText`); M6 renders the same copy as HTML.
 */

export const EMAIL_TYPES = ["verify-email", "password-reset", "order-transfer"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/**
 * The variables each type's copy may use, as the storefront's collection lists them (both match
 * `@shopblok/fixtures/email/templates.json`, which the tests on each side read).
 */
export const EMAIL_VARIABLES: Record<EmailType, readonly string[]> = {
  "verify-email": ["email", "code"],
  "password-reset": ["email"],
  "order-transfer": ["email", "orderNumber"],
};

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

type LexicalNode = {
  type?: unknown;
  text?: unknown;
  children?: unknown;
  listType?: unknown;
  fields?: { url?: unknown } | null;
  url?: unknown;
};

const childrenOf = (node: LexicalNode): LexicalNode[] =>
  Array.isArray(node.children) ? (node.children as LexicalNode[]) : [];

function inline(node: LexicalNode): string {
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (node.type === "linebreak") return "\n";
  if (node.type === "tab") return "\t";
  const text = childrenOf(node).map(inline).join("");
  if (node.type === "link" || node.type === "autolink") {
    const url = typeof node.fields?.url === "string" ? node.fields.url : node.url;
    return typeof url === "string" && url !== "" && url !== text ? `${text} (${url})` : text;
  }
  return text;
}

function list(node: LexicalNode, depth: number): string[] {
  const indent = "  ".repeat(depth);
  let number = 0;
  return childrenOf(node).flatMap((item) => {
    const nested = childrenOf(item).filter((child) => child.type === "list");
    const own = childrenOf(item).filter((child) => child.type !== "list");
    const lines = nested.flatMap((child) => list(child, depth + 1));
    // A list item that holds only a nested list is Lexical's way to indent; it gets no marker.
    if (own.length === 0) return lines;
    number++;
    const marker = node.listType === "number" ? `${number}.` : "-";
    return [`${indent}${marker} ${own.map(inline).join("")}`, ...lines];
  });
}

/**
 * A Lexical document (Payload's `richText` JSON) as plain text: each paragraph, heading or quote
 * a block, lists as `-` or `1.` lines, a link as its text followed by its URL. Anything else
 * gives its text. Not Lexical JSON gives `""`.
 */
export function lexicalToText(value: unknown): string {
  const root = (value as { root?: LexicalNode } | null | undefined)?.root;
  if (root === undefined || root === null || typeof root !== "object") return "";
  return childrenOf(root)
    .map((block) => (block.type === "list" ? list(block, 0).join("\n") : inline(block).trim()))
    .filter((block) => block !== "")
    .join("\n\n");
}

/** A value as text that is safe inside HTML (M6 renders the copy as HTML; the values are users'). */
export function escapeMarkup(value: string): string {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

const VARIABLE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * `{{name}}` replaced by its value, escaped, for each name the type allows; any other `{{…}}` stays
 * as it is written. One pass, so a value that itself contains `{{…}}` is not filled again.
 */
export function fillVariables(
  text: string,
  allowed: readonly string[],
  values: Record<string, string | undefined>,
): string {
  return text.replace(VARIABLE, (match, name: string) => {
    const value = allowed.includes(name) ? values[name] : undefined;
    return value === undefined ? match : escapeMarkup(value);
  });
}

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

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
  now = Date.now,
  warn = () => undefined,
}: EmailCopyOptions) {
  const cache = new Map<string, { at: number; template: StoredTemplate | null }>();

  async function template(type: EmailType, language: string): Promise<StoredTemplate | null> {
    const key = `${type}:${language}`;
    const kept = cache.get(key);
    if (kept !== undefined && now() - kept.at < ttlMs) return kept.template;
    try {
      const found = await withTimeout(source(type, language, timeoutMs), timeoutMs);
      cache.set(key, { at: now(), template: found });
      return found;
    } catch (error) {
      // Not kept: the next e-mail asks Payload again.
      warn(
        `email-copy: ${type} (${language}) from Payload failed, so it goes out in English: ${reason(error)}`,
      );
      return null;
    }
  }

  return {
    async copyFor(
      type: EmailType,
      language: string,
      values: Record<string, string | undefined>,
    ): Promise<EmailCopy> {
      const stored = await template(type, language);
      const builtIn = BUILT_IN[type];
      const fill = (text: string) => fillVariables(text, EMAIL_VARIABLES[type], values);
      const subject = textOf(stored?.subject);
      const fromPayload = stored !== null && subject !== undefined;
      // A field Payload leaves empty takes the built-in English one.
      const body = stored === null ? "" : lexicalToText(stored.body);
      return {
        subject: fill(subject ?? builtIn.subject),
        preheader: fill(textOf(stored?.preheader) ?? builtIn.preheader),
        heading: fill(textOf(stored?.heading) ?? builtIn.heading),
        text: fill(body !== "" ? body : builtIn.body.join("\n\n")),
        cta: fill(textOf(stored?.cta) ?? builtIn.cta),
        language: fromPayload ? language : DEFAULT_LANGUAGE,
        source: fromPayload ? "payload" : "built-in",
      };
    },
    /** Forgets every kept answer (tests). */
    clear: () => cache.clear(),
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
  const payload = container.hasRegistration(PAYLOAD_MODULE)
    ? container.resolve<PayloadModuleService>(PAYLOAD_MODULE)
    : undefined;
  if (payload === undefined) {
    logger.info(
      "email-copy: Payload is not configured, so e-mails go out with the built-in English.",
    );
  }
  shared = createEmailCopy({
    source: async (type, language, timeoutMs) =>
      payload === undefined
        ? null
        : ((await payload.findEmailTemplate(type, language, timeoutMs)) as StoredTemplate | null),
    warn: (message) => logger.warn(message),
  });
  return shared;
}
