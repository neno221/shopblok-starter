import type { Field } from "payload";
import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { link } from "../fields/link";
import { variantField } from "../fields/variant";
import { contentGlobal, shownWhen } from "./content-global";

/** What an internal link in the header or the footer may point at (T61; T65 adds pages). */
export const SHELL_LINK_TARGETS = [...CATALOG_COLLECTIONS];

/**
 * The header variants the global offers: the registry's `header` family without `transparent`.
 * The transparent header lies over the page's hero, and the shell draws it on every page of the
 * market (the cart and the account have none), so it needs a page that says it starts with a hero:
 * T65's CMS pages are the first that can, and M5 offers it then (SETUP.md, "Globals (T61)").
 */
export const HEADER_EXCLUDED_VARIANTS = ["transparent"];

const isKind = (kind: string) => (sibling: Record<string, unknown>) => sibling["kind"] === kind;

const navigationItem: Field[] = [
  {
    name: "kind",
    type: "select",
    required: true,
    defaultValue: "link",
    options: [
      { label: "Link", value: "link" },
      { label: "Dropdown", value: "dropdown" },
      { label: "Mega menu", value: "megaMenu" },
    ],
  },
  shownWhen(link({ relationTo: SHELL_LINK_TARGETS }), isKind("link")),
  shownWhen(
    { name: "label", type: "text", localized: true, required: true },
    (sibling) => sibling["kind"] !== "link",
  ),
  shownWhen(
    {
      name: "links",
      type: "array",
      minRows: 1,
      maxRows: 12,
      labels: { singular: "Link", plural: "Links" },
      fields: [link({ relationTo: SHELL_LINK_TARGETS })],
    },
    isKind("dropdown"),
  ),
  shownWhen(
    {
      name: "columns",
      type: "array",
      minRows: 1,
      maxRows: 5,
      labels: { singular: "Column", plural: "Columns" },
      fields: [
        { name: "title", type: "text", localized: true, required: true },
        {
          name: "links",
          type: "array",
          minRows: 1,
          maxRows: 12,
          labels: { singular: "Link", plural: "Links" },
          fields: [link({ relationTo: SHELL_LINK_TARGETS })],
        },
      ],
    },
    isKind("megaMenu"),
  ),
];

/**
 * The `header` global (D78, SPEC §7.3): the design, the announcement bar, the navigation (Medusa's
 * category tree, M3's, or items an editor builds), the utilities, sticky, and the logo. The
 * structure is shared by every language and the texts are localized (D79's rule for blocks).
 */
export const Header = contentGlobal({
  slug: "header",
  label: "Header",
  description:
    "The shop's header in every market. Texts are per language; a language without its own shows the English.",
  fields: [
    variantField({
      family: "header",
      name: "design",
      label: "Design",
      defaultValue: "classic",
      exclude: HEADER_EXCLUDED_VARIANTS,
    }),
    {
      name: "announcement",
      type: "group",
      admin: { description: "The bar above the header. Without a message there is no bar." },
      fields: [
        { name: "message", type: "text", localized: true, maxLength: 120 },
        link({ relationTo: SHELL_LINK_TARGETS, required: false }),
        { name: "dismissible", type: "checkbox", defaultValue: true },
      ],
    },
    {
      name: "navigation",
      type: "group",
      fields: [
        {
          name: "source",
          type: "radio",
          defaultValue: "categories",
          options: [
            { label: "Medusa's categories", value: "categories" },
            { label: "Built here", value: "manual" },
          ],
          admin: {
            layout: "horizontal",
            description:
              "Medusa's categories: the top-level categories, with their children as a mega menu, follow Medusa without a save here.",
          },
        },
        shownWhen(
          {
            name: "items",
            type: "array",
            maxRows: 8,
            labels: { singular: "Item", plural: "Items" },
            fields: navigationItem,
          },
          (sibling) => sibling["source"] === "manual",
        ),
      ],
    },
    {
      name: "utilities",
      type: "group",
      fields: [
        { name: "search", type: "checkbox", defaultValue: true },
        { name: "account", type: "checkbox", defaultValue: true },
        { name: "marketSwitcher", type: "checkbox", defaultValue: true },
      ],
    },
    {
      name: "sticky",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "The header stays at the top while the page scrolls." },
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      admin: { description: "Empty: the site settings' logo, or the store's name as text." },
    },
  ],
});
