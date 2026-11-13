import { paragraphs } from "@shopblok/emails";
import type { FormattedEmail } from "@payloadcms/plugin-form-builder/types";
import { describe, expect, it, vi } from "vitest";
import {
  answersOf,
  formEmailsField,
  formMessages,
  isAddressList,
  NOT_A_REPLY_TO,
  NOT_AN_ADDRESS,
  replyToOf,
} from "./form-emails";

// T99 (D122): a form's e-mails to the shop, made again by `formMessages` as `form-message`. A
// stand-in Payload holds one form (its fields, its e-mails) and the copy's documents; the hook gets
// what form-builder hands it after a submission.

const FORM = {
  id: 7,
  title: "Contact",
  fields: [
    { blockType: "text", name: "name", label: "Your name" },
    { blockType: "email", name: "email", label: "Email" },
    { blockType: "textarea", name: "message", label: "Message" },
  ],
  emails: [
    {
      emailTo: "shop@example.com",
      cc: "",
      bcc: "",
      replyTo: "{{email}}",
      subject: "{{name}} wrote on {{form}}",
      message: paragraphs(["From {{name}}: {{message}}", "{{*:table}}"]),
    },
  ],
};

const XSS = '<img src=x onerror="alert(1)">';

function payloadWith(form: typeof FORM) {
  return {
    findByID: vi.fn(async () => form),
    // No copy in Payload: the seed's English.
    find: vi.fn(async () => ({ docs: [] })),
    findGlobal: vi.fn(async () => ({ storeName: "Kalimera" })),
    email: { defaultFromAddress: "orders@shop.example", defaultFromName: "Kalimera" },
    config: { serverURL: "https://shop.example" },
    logger: { error: vi.fn(), warn: vi.fn() },
  };
}

const submission = (values: Record<string, string>) => ({
  id: 42,
  form: 7,
  submissionData: [
    ...Object.entries(values).map(([field, value]) => ({ field, value })),
    { field: "formSubmissionID", value: "42" },
  ],
});

/** What form-builder hands the hook: its own e-mails (one per the form's), and the change. */
async function run(form: typeof FORM, values: Record<string, string>) {
  const payload = payloadWith(form);
  const made = form.emails.map(() => ({}) as FormattedEmail);
  const emails = (await formMessages(made, {
    doc: submission(values),
    req: { payload, locale: "en" },
  } as never)) as (FormattedEmail & { text: string })[];
  return { emails, payload };
}

describe("a form's e-mails (T99, D122)", () => {
  it("draws every answer as text: a value with <img onerror> never reaches the HTML", async () => {
    const { emails } = await run(FORM, {
      name: "Siobhán O'Brien",
      email: "o'brien@example.com",
      message: XSS,
    });
    expect(emails).toHaveLength(1);
    const [email] = emails;
    expect(email!.html).not.toMatch(/<img/i);
    expect(email!.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    // The subject is text: the apostrophe as typed (form-builder's own would read `&#39;`).
    expect(email!.subject).toBe("Siobhán O'Brien wrote on Contact");
    expect(email!.text).toContain(`Message: ${XSS}`);
    // The frame, the answers with their labels, the button to the submission.
    expect(email!.html).toContain("Kalimera");
    expect(email!.html).toContain("Your name");
    expect(email!.html).toContain(
      'href="https://shop.example/admin/collections/form-submissions/42"',
    );
    expect(email!.html).not.toContain("{{*");
  });

  it("sends to the form's own addresses, from the shop's sender, with the visitor's address to reply to", async () => {
    const { emails } = await run(FORM, { name: "Ana", email: "ana@example.com", message: "Hi" });
    expect(emails[0]).toMatchObject({
      to: "shop@example.com",
      from: "Kalimera <orders@shop.example>",
      replyTo: "ana@example.com",
    });
  });

  it("never lets an answer choose the recipient: a form saved with {{email}} in To sends nothing", async () => {
    const form = { ...FORM, emails: [{ ...FORM.emails[0]!, emailTo: "{{email}}" }] };
    const { emails, payload } = await run(form, {
      name: "Ana",
      email: "victim@example.com",
      message: "Hi",
    });
    expect(emails).toEqual([]);
    expect(payload.logger.error).toHaveBeenCalledOnce();
    expect(String(payload.logger.error.mock.calls[0]?.[0])).not.toContain("victim@example.com");
  });

  it("replies to the shop when the answer named for reply-to is not one address", async () => {
    const { emails } = await run(FORM, {
      name: "Ana",
      email: "a@example.com, b@example.com",
      message: "Hi",
    });
    expect(emails[0]?.replyTo).toBe("Kalimera <orders@shop.example>");
  });
});

describe("the e-mails' fields (T99, D122)", () => {
  const field = (name: string) =>
    formEmailsField.fields
      .flatMap((each) => ("fields" in each ? each.fields : [each]))
      .find((each) => "name" in each && each.name === name) as {
      validate: (value: string) => true | string;
    };

  it("take addresses only in To, CC and BCC, and an address or one field in Reply to", () => {
    expect(field("emailTo").validate("shop@example.com, Shop <help@example.com>")).toBe(true);
    expect(field("emailTo").validate("{{email}}")).toBe(NOT_AN_ADDRESS);
    expect(field("cc").validate("a@example.com; b@example.com")).toBe(NOT_AN_ADDRESS);
    expect(field("replyTo").validate("{{email}}")).toBe(true);
    expect(field("replyTo").validate("{{email}}, x@example.com")).toBe(NOT_A_REPLY_TO);
    expect(formEmailsField.fields.some((each) => "name" in each && each.name === "emailFrom")).toBe(
      false,
    );
  });

  it("parse addresses, answers and the reply-to as the hook reads them", () => {
    expect(isAddressList("a@example.com")).toBe(true);
    expect(isAddressList("a@example.com\nBcc: b@example.com")).toBe(false);
    const answers = answersOf(
      [
        { field: "email", value: "ana@example.com" },
        { field: "topics", value: ["a", "b"] },
        { field: "formSubmissionID", value: "1" },
      ],
      [{ name: "email", label: "Email" }],
    );
    expect(answers).toEqual([
      { name: "email", label: "Email", value: "ana@example.com" },
      { name: "topics", label: "topics", value: "a, b" },
    ]);
    expect(replyToOf("{{email}}", answers)).toBe("ana@example.com");
    expect(replyToOf("{{missing}}", answers)).toBeUndefined();
  });
});
