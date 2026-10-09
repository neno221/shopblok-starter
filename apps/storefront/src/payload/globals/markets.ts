import type { GlobalConfig, TextFieldSingleValidation } from "payload";
import { text } from "payload/shared";
import { isAdmin, isStaff } from "../access/roles";
import { LOCALES } from "../locales";

const languageOptions = LOCALES.map(({ code, label }) => ({
  label: `${label} (${code})`,
  value: code,
}));

/**
 * A custom `validate` replaces Payload's own text check, so this runs that first (it enforces
 * `required`), then lets an empty optional field through and checks the shape of a value.
 */
export const countryCode: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (value === undefined || value === null || value === "") return true;
  return /^[a-z]{2}$/.test(value)
    ? true
    : "Use the two-letter ISO 3166-1 code in lowercase, for example cy";
};

/**
 * The market map (D10), the editable part (D12): which countries are open, in which languages,
 * and how each language maps to a Medusa locale (D8). T10 reads it (`getMarketMap()`) and checks
 * the Medusa locale codes; M4's sync fills `synced`. `filterAvailableLocales` reads it too: the
 * admin offers the languages of the enabled countries, and English.
 */
export const Markets: GlobalConfig = {
  slug: "markets",
  label: "Markets",
  // The storefront reads it through the Local API, which is not subject to access; this is the
  // REST and admin side.
  access: { read: isStaff, update: isAdmin },
  fields: [
    {
      name: "countries",
      type: "array",
      labels: { singular: "Country", plural: "Countries" },
      admin: { initCollapsed: true },
      fields: [
        { name: "code", type: "text", required: true, validate: countryCode },
        { name: "enabled", type: "checkbox", defaultValue: true },
        {
          name: "languages",
          type: "select",
          hasMany: true,
          required: true,
          options: languageOptions,
          admin: { description: "The default language first." },
        },
        {
          name: "domain",
          type: "text",
          admin: { description: "A domain of its own for this country, if it has one." },
        },
      ],
    },
    {
      name: "languages",
      type: "array",
      labels: { singular: "Language", plural: "Languages" },
      admin: { initCollapsed: true },
      fields: [
        { name: "code", type: "select", required: true, options: languageOptions },
        {
          name: "medusaLocale",
          type: "text",
          required: true,
          admin: { description: "The Medusa locale this language uses, for example el-GR (D8)." },
        },
        {
          name: "htmlLang",
          type: "text",
          admin: { description: "Overrides the lang attribute, for example pt-BR." },
        },
      ],
    },
    { name: "primaryCountry", type: "text", validate: countryCode },
    {
      name: "fallbackMarket",
      type: "text",
      admin: { description: "The market hreflang x-default points to, for example en-us." },
    },
    {
      name: "synced",
      type: "group",
      admin: { description: "Filled by the Medusa sync (M4). Read-only.", readOnly: true },
      fields: [],
    },
  ],
};
