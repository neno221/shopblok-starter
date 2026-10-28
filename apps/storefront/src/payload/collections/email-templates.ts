import emailCopy from "@shopblok/fixtures/email/templates.json";
import type { CollectionConfig } from "payload";
import { isAdmin, isStaff, staffOrMedusaSync } from "../access/roles";
import { seedKey } from "../fields/seed-key";

/** The e-mails whose copy Payload holds (D84); M6 adds the order e-mails. */
export const EMAIL_TYPES = ["verify-email", "password-reset", "order-transfer"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/** The `{{variables}}` each type's copy may use; the backend fills them (`email-copy.ts`). */
export const EMAIL_VARIABLES: Record<EmailType, readonly string[]> = emailCopy.variables;

const LABELS: Record<EmailType, string> = {
  "verify-email": "Verify the e-mail address",
  "password-reset": "Password reset",
  "order-transfer": "Order transfer to an account",
};

const variablesHelp = EMAIL_TYPES.map(
  (type) => `${LABELS[type]}: ${EMAIL_VARIABLES[type].map((name) => `{{${name}}}`).join(", ")}`,
).join(". ");

/**
 * The copy of the e-mails the backend sends (D84, SPEC §6.2): one document per type, every text in
 * each language. The backend reads it as the `medusa-sync` integration, keeps it 5 minutes, and
 * falls back to its built-in English when Payload does not answer; nothing is revalidated, so an
 * edit reaches the next e-mail within those 5 minutes. The link itself is not in the copy: the
 * backend adds it, and `cta` is its label. In M4 the body goes out as plain text (headings,
 * paragraphs, lists and links); M6 renders it in `packages/emails`' layouts.
 */
export const EmailTemplates: CollectionConfig = {
  slug: "email-templates",
  labels: { singular: "E-mail template", plural: "E-mail templates" },
  admin: {
    group: "Settings",
    useAsTitle: "subject",
    defaultColumns: ["type", "subject", "updatedAt"],
    description: `Variables in double braces are filled in when the e-mail is sent. ${variablesHelp}. Anything else in braces stays as it is.`,
  },
  access: {
    read: staffOrMedusaSync,
    // One document per type: the seed creates them, and a type is code (the backend sends it).
    create: isAdmin,
    update: isStaff,
    delete: isAdmin,
  },
  fields: [
    {
      name: "type",
      type: "select",
      required: true,
      unique: true,
      index: true,
      options: EMAIL_TYPES.map((value) => ({ value, label: LABELS[value] })),
      access: { update: () => false },
      admin: { position: "sidebar" },
    },
    { name: "subject", type: "text", localized: true, required: true },
    {
      name: "preheader",
      type: "text",
      localized: true,
      admin: { description: "The line inboxes show after the subject." },
    },
    { name: "heading", type: "text", localized: true, required: true },
    { name: "body", type: "richText", localized: true, required: true },
    {
      name: "cta",
      label: "Button label",
      type: "text",
      localized: true,
      required: true,
      admin: { description: "The link's label; the link itself is added when the e-mail is sent." },
    },
    seedKey(),
  ],
};
