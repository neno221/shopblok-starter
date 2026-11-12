import {
  copyFromTemplate,
  render,
  type EmailCopy,
  type EmailForm,
  type EmailType,
  type RenderedEmail,
} from "@shopblok/emails";
import emailCopy from "@shopblok/fixtures/email/templates.json";
import type { Payload } from "payload";

// The e-mails Payload sends itself (T99, D121, D122): the newsletter's confirmation and a form's
// e-mail to the shop. They are laid out by `@shopblok/emails` like Medusa's, from the same copy
// (`email-templates`, read here through the Local API in the language asked for, each empty field
// the seed's English, as the backend's built-in copy is), and go out through Payload's adapter
// (`payload/email.ts`: Resend with its key, Mailpit with `SMTP_HOST`, else Payload's log). No
// `server-only` here: Payload's CLI loads the config, and the form hook with it.

type SeedCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: string[];
  cta: string;
};

const SEED = emailCopy.templates as Record<EmailType, Record<string, SeedCopy>>;
const FALLBACK_SHOP_NAME = "Shopblok";

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

/**
 * The copy of `type` in `language`, as written (`{{variables}}` not filled in): Payload's document,
 * each field it leaves empty the seed's English, by `@shopblok/emails`' `copyFromTemplate` (the
 * backend's rule too). `language` is the copy's language when Payload has the subject in it, else
 * `en`.
 */
export async function copyFor(
  payload: Payload,
  type: EmailType,
  language: string,
): Promise<{ copy: EmailCopy; language: string }> {
  const english = SEED[type]["en"]!;
  let stored: Record<string, unknown> | undefined;
  try {
    const { docs } = await payload.find({
      collection: "email-templates",
      where: { type: { equals: type } },
      locale: language as never,
      fallbackLocale: false as never,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    stored = docs[0] as Record<string, unknown> | undefined;
  } catch (error) {
    payload.logger.warn({ err: error, msg: `email: the ${type} copy could not be read; English` });
  }
  const { copy, language: copyLanguage } = copyFromTemplate(stored, english, language);
  return { copy, language: copyLanguage };
}

/** The shop's name in the e-mail's frame: Payload's site settings, or `Shopblok`. */
export async function shopName(payload: Payload): Promise<string> {
  try {
    const settings = (await payload.findGlobal({
      slug: "site-settings",
      depth: 0,
      overrideAccess: true,
    })) as { storeName?: unknown };
    return text(settings.storeName)?.trim() ?? FALLBACK_SHOP_NAME;
  } catch {
    return FALLBACK_SHOP_NAME;
  }
}

export type PayloadEmail = {
  type: EmailType;
  language: string;
  variables: Record<string, string>;
  url: string;
  form?: EmailForm;
};

/** The e-mail of `type` laid out in `language` (the copy's), ready for `payload.sendEmail`. */
export async function renderEmail(payload: Payload, email: PayloadEmail): Promise<RenderedEmail> {
  const [{ copy, language }, name] = await Promise.all([
    copyFor(payload, email.type, email.language),
    shopName(payload),
  ]);
  return render(email.type, {
    copy,
    variables: email.variables,
    url: email.url,
    language,
    shop: { name },
    ...(email.form === undefined ? {} : { form: email.form }),
  });
}
