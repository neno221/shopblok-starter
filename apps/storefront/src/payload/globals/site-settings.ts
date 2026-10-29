import type { TextFieldSingleValidation } from "payload";
import { text } from "payload/shared";
import { contentGlobal } from "./content-global";

/** A title template has one `%s`, where the page's own title goes (`%s | Shopblok`). */
export const titleTemplate: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (value == null || value === "") return true;
  return value.split("%s").length === 2 ? true : "Put %s, once, where the page's title goes.";
};

/**
 * The `site-settings` global (D78, SPEC §7.3): the store's name, logo and icon, the homepage (T65
 * renders it), the SEO defaults (T68 reads them), the Organization data, the free-shipping message,
 * and the product page's shop texts that `site.ts` held (the product page reads them from T69 on).
 * The 404, error and cookie texts are `ui-strings`' (T62): one home for microcopy.
 */
export const SiteSettings = contentGlobal({
  slug: "site-settings",
  label: "Site settings",
  description: "The store's name, its pictures and the texts every market shares.",
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Store",
          fields: [
            { name: "storeName", type: "text", required: true, defaultValue: "Shopblok" },
            { name: "logo", type: "upload", relationTo: "media" },
            {
              name: "icon",
              type: "upload",
              relationTo: "media",
              admin: { description: "A square picture, at least 512 × 512." },
            },
            {
              name: "homepage",
              type: "relationship",
              relationTo: "pages",
              admin: {
                description:
                  "The page the market's home shows, once it is published. Empty: the built-in home page.",
              },
            },
            {
              name: "freeShippingMessage",
              type: "text",
              localized: true,
              admin: { description: "For example: Free shipping on orders over €50." },
            },
          ],
        },
        {
          label: "SEO",
          fields: [
            {
              name: "seo",
              type: "group",
              fields: [
                {
                  name: "titleTemplate",
                  type: "text",
                  validate: titleTemplate,
                  admin: { description: "%s is the page's title. Empty: %s | the store's name." },
                },
                { name: "description", type: "textarea", localized: true, maxLength: 160 },
                { name: "image", type: "upload", relationTo: "media" },
              ],
            },
            {
              name: "organization",
              type: "group",
              admin: { description: "The shop as search engines describe it (Organization data)." },
              fields: [
                { name: "legalName", type: "text" },
                { name: "email", type: "email" },
                { name: "telephone", type: "text" },
              ],
            },
          ],
        },
        {
          label: "Product page",
          fields: [
            {
              name: "productNotes",
              type: "array",
              localized: true,
              maxRows: 4,
              labels: { singular: "Note", plural: "Notes" },
              admin: { description: "The short lines under the buy button." },
              fields: [{ name: "note", type: "text", required: true }],
            },
            {
              name: "deliveryAndReturns",
              type: "richText",
              localized: true,
              admin: { description: "The product page's delivery and returns section." },
            },
          ],
        },
      ],
    },
  ],
});
