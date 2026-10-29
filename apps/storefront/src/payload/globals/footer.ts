import { PaymentBrand, SocialNetwork } from "@shopblok/registry/contracts";
import type { ArrayFieldValidation, TextFieldSingleValidation } from "payload";
import { array, text } from "payload/shared";
import { formReference, privacyLink } from "../fields/form-reference";
import { link } from "../fields/link";
import { variantField } from "../fields/variant";
import { contentGlobal } from "./content-global";
import { SHELL_LINK_TARGETS } from "./header";

/** A social profile is an https URL (the footer's contract, `SocialLink`). */
export const profileUrl: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (value == null || value === "") return true;
  try {
    return new URL(value).protocol === "https:" ? true : "Use the profile's https address.";
  } catch {
    return "Use the profile's https address.";
  }
};

/**
 * One profile per network (the contract refuses two). Payload's own array check runs first: a
 * custom `validate` replaces it, and it is where `maxRows` is enforced.
 */
export const oneProfilePerNetwork: ArrayFieldValidation = (rows, options) => {
  const base = array(rows, options);
  if (base !== true) return base;
  const networks = (Array.isArray(rows) ? rows : []).map(
    (row) => (row as { network?: unknown }).network,
  );
  return new Set(networks).size === networks.length ? true : "Add each network once.";
};

/**
 * The `footer` global (D78, SPEC §7.3): the design, up to five columns of links (a column may list
 * the top-level categories first, as M3's "Shop" column did), the social profiles, the legal links,
 * the payment marks, the market switcher and the copyright line, and the newsletter's signup (T67,
 * D81): a form with one email field and the privacy page its consent sentence links to.
 */
export const Footer = contentGlobal({
  slug: "footer",
  label: "Footer",
  description:
    "The shop's footer in every market. Texts are per language; a language without its own shows the English.",
  fields: [
    variantField({
      family: "footer",
      name: "design",
      label: "Design",
      defaultValue: "multi-column",
    }),
    {
      name: "columns",
      type: "array",
      maxRows: 5,
      labels: { singular: "Column", plural: "Columns" },
      fields: [
        { name: "title", type: "text", localized: true, required: true },
        {
          name: "categories",
          type: "checkbox",
          label: "List the top-level categories first",
          admin: { description: "They follow Medusa, so a new category shows without a save." },
        },
        {
          name: "links",
          type: "array",
          maxRows: 12,
          labels: { singular: "Link", plural: "Links" },
          fields: [link({ relationTo: SHELL_LINK_TARGETS })],
        },
      ],
    },
    {
      name: "newsletter",
      type: "group",
      admin: { description: "The signup in the footer. No form: no signup." },
      fields: [
        formReference({ newsletter: true, required: false }),
        {
          ...privacyLink(),
          admin: {
            ...privacyLink().admin,
            condition: (_: unknown, sibling: { form?: unknown }) => sibling?.form != null,
          },
        },
      ],
    },
    {
      name: "social",
      type: "array",
      maxRows: 8,
      labels: { singular: "Profile", plural: "Profiles" },
      validate: oneProfilePerNetwork,
      fields: [
        { name: "network", type: "select", required: true, options: [...SocialNetwork.options] },
        { name: "url", type: "text", required: true, validate: profileUrl },
      ],
    },
    {
      name: "legalLinks",
      type: "array",
      maxRows: 6,
      labels: { singular: "Legal link", plural: "Legal links" },
      fields: [link({ relationTo: SHELL_LINK_TARGETS })],
    },
    {
      name: "paymentIcons",
      type: "select",
      hasMany: true,
      options: [...PaymentBrand.options],
      admin: { description: "The marks of the ways to pay, in this order." },
    },
    { name: "marketSwitcher", type: "checkbox", defaultValue: true },
    {
      name: "copyright",
      type: "text",
      localized: true,
      admin: {
        description:
          "The last line. {year} becomes the current year. Empty: © {year} and the store's name.",
      },
    },
  ],
});
