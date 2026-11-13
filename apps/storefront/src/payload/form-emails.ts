import { safeLink, type EmailForm, type RichTextDocument } from "@shopblok/emails";
import type { BeforeEmail, FormattedEmail } from "@payloadcms/plugin-form-builder/types";
import type { ArrayField, Field, TextFieldSingleValidation } from "payload";
import { renderEmail } from "./send-email";

// A form's e-mails to the shop (T99, D122). Form-builder sends them after a submission: its
// `{{field}}` replacement escapes a value once in the HTML (checked: `escapeHTML` in
// `replaceDoubleCurlys` and the Lexical text converter), but it also escapes the subject, which is
// text (`o'brien` would read `o&#39;brien`), lets a visitor's answer choose who the e-mail goes to
// (`{{email}}` in "to" turns a contact form into a way to e-mail anyone) and draws the message as
// bare HTML in no frame. So D122's hook takes every e-mail form-builder made and makes it again
// through `@shopblok/emails`' `form-message`: the shop's frame, the form's subject and message with
// each `{{field}}` filled in as text, the answers as text, a button to the submission in the admin.
// The recipients are the form's own, as written: never a value a visitor typed.

/** One address, as a mail client writes it: `name@example.com` or `Name <name@example.com>`. */
const ADDRESS =
  /^(?:[^<>@,;\s"]+@[^<>@,;\s"]+\.[^<>@,;\s"]+|[^<>@,;"]*<[^<>@,;\s"]+@[^<>@,;\s"]+\.[^<>@,;\s"]+>)$/;

/** A list of addresses, comma-separated. */
export function isAddressList(value: string): boolean {
  const parts = value.split(",").map((part) => part.trim());
  return parts.length > 0 && parts.every((part) => ADDRESS.test(part));
}

/** `{{field}}`: one of the form's answers as the reply-to address. */
const FIELD = /^\{\{\s*([A-Za-z][A-Za-z0-9_-]*)\s*\}\}$/;

export const NOT_AN_ADDRESS =
  "Addresses only, separated by commas. A form's answers ({{field}}) cannot choose who the e-mail goes to.";
export const NOT_A_REPLY_TO = "One address, or one field of the form, such as {{email}}.";

const recipients: TextFieldSingleValidation = (value) =>
  value === null || value === undefined || value.trim() === "" || isAddressList(value.trim())
    ? true
    : NOT_AN_ADDRESS;

const replyTo: TextFieldSingleValidation = (value) => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" || FIELD.test(trimmed) || ADDRESS.test(trimmed) ? true : NOT_A_REPLY_TO;
};

/**
 * The form's `emails` (form-builder's array) as D122 keeps it: to, cc and bcc are addresses as
 * written; reply-to an address or one answer (`{{email}}`, so the shop answers the visitor); no
 * "from" (every e-mail goes from the adapter's sender, the address Resend has verified); the
 * subject and the message localized, with `{{field}}` filled in as text.
 */
export const formEmailsField: ArrayField = {
  name: "emails",
  type: "array",
  // As form-builder's: only a signed-in user of the admin reads where a form's e-mails go.
  access: { read: ({ req }) => req.user?.collection === req.payload.config.admin.user },
  admin: {
    description:
      "E-mails to the shop when the form is sent, in the shop's frame with the answers listed. In the subject and the message, {{field}} is the answer to that field, written as text.",
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "emailTo",
          label: "To",
          type: "text",
          validate: recipients,
          admin: {
            width: "100%",
            placeholder: "shop@example.com",
            description: "Empty: the shop's sender address.",
          },
        },
        { name: "cc", label: "CC", type: "text", validate: recipients, admin: { width: "50%" } },
        { name: "bcc", label: "BCC", type: "text", validate: recipients, admin: { width: "50%" } },
      ],
    },
    {
      name: "replyTo",
      label: "Reply to",
      type: "text",
      validate: replyTo,
      admin: { placeholder: "{{email}}", description: "So a reply goes to the visitor." },
    },
    {
      name: "subject",
      type: "text",
      localized: true,
      required: true,
      defaultValue: "New answer to {{form}}",
      admin: { description: "{{form}} is the form's title." },
    },
    {
      name: "message",
      type: "richText",
      localized: true,
      admin: { description: "Empty: the shop's own line. The answers are listed under it." },
    },
  ] satisfies Field[],
};

type StoredField = { blockType?: string; name?: string; label?: string | null };
type StoredEmail = {
  emailTo?: string | null;
  cc?: string | null;
  bcc?: string | null;
  replyTo?: string | null;
  subject?: string | null;
  message?: unknown;
};

const answerText = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.map(answerText).join(", ")
        : String(value);

/** The answers as text, each with its field's label (or its name), the plugin's own row left out. */
export function answersOf(
  submission: readonly { field?: string; value?: unknown }[],
  fields: readonly StoredField[],
): EmailForm["answers"] {
  return submission.flatMap(({ field, value }) => {
    if (!field || field === "formSubmissionID") return [];
    const label = fields.find((each) => each.name === field)?.label?.trim() || field;
    return [{ name: field, label, value: answerText(value) }];
  });
}

/** The reply-to address: as written, or the answer `{{field}}` names when it is one address. */
export function replyToOf(
  written: string | null | undefined,
  answers: EmailForm["answers"],
): string | undefined {
  const value = written?.trim() ?? "";
  const field = FIELD.exec(value)?.[1];
  const address = field === undefined ? value : answers.find((each) => each.name === field)?.value;
  return address !== undefined && ADDRESS.test(address.trim()) ? address.trim() : undefined;
}

/** The admin's page of the submission, on the site's own origin. */
export function submissionLink(serverURL: string, id: string | number): string | undefined {
  return safeLink(`${serverURL.replace(/\/+$/, "")}/admin/collections/form-submissions/${id}`, [
    "http:",
    "https:",
  ]);
}

/**
 * form-builder's `beforeEmail`: each e-mail the form has, made again as `form-message` (above).
 * An e-mail whose recipients are not addresses as written (a form saved before T99's check) is
 * dropped, logged without its addresses.
 */
export const formMessages: BeforeEmail = async (emails, params) => {
  // form-builder calls it from the submission's `afterChange` (its type says `beforeChange`), so the
  // stored submission is `doc`.
  const { req } = params;
  const payload = req.payload;
  const submission = (params as unknown as { doc: unknown }).doc as {
    id: string | number;
    form?: unknown;
    submissionData?: { field?: string; value?: unknown }[];
  };
  const formId =
    typeof submission.form === "object" && submission.form !== null
      ? (submission.form as { id: number }).id
      : submission.form;
  const form = (await payload.findByID({
    collection: "forms",
    id: formId as number,
    depth: 0,
    locale: req.locale as never,
    overrideAccess: true,
    req,
  })) as unknown as { title?: string; fields?: StoredField[]; emails?: StoredEmail[] };
  const answers = answersOf(submission.submissionData ?? [], form.fields ?? []);
  const title = form.title?.trim() || "Form";
  const url = submissionLink(
    payload.config.serverURL || process.env["NEXT_PUBLIC_BASE_URL"] || "",
    submission.id,
  );
  const language = typeof req.locale === "string" ? req.locale : "en";
  // Every e-mail goes from the adapter's sender (no "from" on the form, D122).
  const from = `${payload.email.defaultFromName} <${payload.email.defaultFromAddress}>`;

  const rebuilt = await Promise.all(
    (form.emails ?? []).slice(0, emails.length).map(async (written, index) => {
      const to = written.emailTo?.trim() || payload.email.defaultFromAddress;
      const cc = written.cc?.trim() || undefined;
      const bcc = written.bcc?.trim() || undefined;
      if (
        ![to, cc, bcc].every((list) => list === undefined || isAddressList(list)) ||
        url === undefined
      ) {
        payload.logger.error(
          `form: e-mail ${index + 1} of form ${String(formId)} has recipients that are not addresses as written (or no admin URL), so it was not sent.`,
        );
        return [];
      }
      const rendered = await renderEmail(payload, {
        type: "form-message",
        language,
        variables: { form: title },
        url,
        form: {
          title,
          answers,
          ...(written.subject?.trim() ? { subject: written.subject } : {}),
          ...(written.message ? { message: written.message as RichTextDocument } : {}),
        },
      });
      const email: FormattedEmail & { text: string } = {
        from,
        to,
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
        replyTo: replyToOf(written.replyTo, answers) ?? from,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      };
      return [email];
    }),
  );
  return rebuilt.flat();
};
