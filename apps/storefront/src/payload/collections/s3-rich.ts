// S3 PROTOTYPE (not for main): a collection with many localized fields and drafts, so the cost of
// reading and editing a document that is filled in four languages (L9) is measurable. `pages` has
// two localized fields only.
import type { CollectionConfig, Field } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";

const texts: Field[] = Array.from({ length: 24 }, (_, i) => ({
  name: `text${String(i + 1).padStart(2, "0")}`,
  type: "text" as const,
  localized: true,
}));

export const S3Rich: CollectionConfig = {
  slug: "s3-rich",
  admin: { useAsTitle: "title" },
  access: {
    read: staffOrPublished,
    readVersions: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: { drafts: true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true, required: true },
    { name: "summary", type: "textarea", localized: true },
    { name: "body", type: "textarea", localized: true },
    ...texts,
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "metaTitle", type: "text", localized: true },
        { name: "metaDescription", type: "textarea", localized: true },
      ],
    },
    {
      name: "sections",
      type: "array",
      fields: [
        { name: "heading", type: "text", localized: true },
        { name: "text", type: "textarea", localized: true },
      ],
    },
  ],
};
