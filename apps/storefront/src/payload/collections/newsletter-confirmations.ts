import type { CollectionConfig } from "payload";
import { isAdmin, isStaff } from "../access/roles";

/**
 * The newsletter's confirmations (D122, T99): one document per confirmation link used, made by the
 * confirmation page's POST (`lib/newsletter/confirm.ts`) through the Local API. `tokenId` is
 * unique, so a link's second POST cannot make another and is told the address is already
 * confirmed: the link works once. The document also records the consent (who, when, in which
 * market) and where the address went: Resend's segment, or a submission to the form (without
 * Resend's key or segment). Staff read them; nobody writes one through the API; an admin may
 * delete one (an erasure request: the contact in Resend is removed there).
 */
export const NewsletterConfirmations: CollectionConfig = {
  slug: "newsletter-confirmations",
  labels: { singular: "Newsletter confirmation", plural: "Newsletter confirmations" },
  admin: {
    group: "Forms",
    useAsTitle: "email",
    defaultColumns: ["email", "market", "destination", "createdAt"],
    description:
      "Addresses that confirmed the newsletter through the link in their e-mail (double opt-in). With Resend's key and segment the address is a contact there; otherwise it is kept as a submission to the form.",
  },
  access: {
    read: isStaff,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    { name: "tokenId", type: "text", required: true, unique: true, index: true },
    { name: "email", type: "text", required: true },
    // The form's id as a number, not a relationship: the record outlives the form.
    { name: "form", type: "number" },
    { name: "market", type: "text", required: true },
    { name: "language", type: "text", required: true },
    {
      name: "destination",
      type: "select",
      options: [
        { value: "resend", label: "Resend segment" },
        { value: "submission", label: "Form submission" },
      ],
    },
  ],
};
