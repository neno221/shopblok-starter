import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/roles";

/** The kinds of record: the first choice of a consent id, a later change, or a withdrawal. */
export const CONSENT_RECORD_KINDS = ["given", "changed", "withdrawn"] as const;
export type ConsentRecordKind = (typeof CONSENT_RECORD_KINDS)[number];

/** How long a record is kept (D145): 13 months, then the retention job deletes it. */
export const CONSENT_RECORD_MONTHS = 13;

/**
 * M7 D145 (T109): a server-side record of each cookie choice (GDPR Art. 7(1): the shop must be able
 * to show that consent was given; the cookie alone sits on the visitor's device). One document per
 * choice, change and withdrawal, written by the consent action (`lib/consent/record.ts`) through the
 * Local API: the consent id (random, also kept in the `_shopblok_consent` cookie, so one visitor's
 * records share it), each category's answer, the policy's version (`CONSENT_VERSION`), the market
 * and the language; the time is Payload's `createdAt`. **No address, no user agent, no customer**:
 * nothing that identifies a person beyond what the record proves (`consent.spec.ts` reads the
 * table's columns). Only admins read them, and editors do not see the collection; nobody writes,
 * changes or deletes one through the API; the retention job (`payload/jobs/consent-retention.ts`)
 * deletes records older than 13 months.
 */
export const ConsentRecords: CollectionConfig = {
  slug: "consent-records",
  labels: { singular: "Consent record", plural: "Consent records" },
  admin: {
    group: "Forms",
    useAsTitle: "consentId",
    defaultColumns: ["consentId", "kind", "analytics", "marketing", "market", "createdAt"],
    description:
      "Each cookie choice a visitor made, kept for 13 months as proof of consent. A record holds a random id (the same in the visitor's cookie), the answers, the policy's version, the market and the language: no address, browser or customer.",
    hidden: ({ user }) => !(user?.collection === "users" && user.role === "admin"),
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "consentId", type: "text", required: true, index: true },
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { value: "given", label: "Given" },
        { value: "changed", label: "Changed" },
        { value: "withdrawn", label: "Withdrawn" },
      ],
    },
    { name: "analytics", type: "checkbox", required: true, defaultValue: false },
    { name: "marketing", type: "checkbox", required: true, defaultValue: false },
    { name: "policyVersion", type: "number", required: true },
    { name: "market", type: "text", required: true },
    { name: "language", type: "text", required: true },
  ],
};
