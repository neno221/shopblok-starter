import type { GlobalConfig, TextFieldSingleValidation } from "payload";
import { text } from "payload/shared";
import { MEDUSA_LOCALES, isMedusaLocale, medusaLocalesOf } from "../../lib/markets/medusa-locales";
import { isAdmin, isStaff } from "../access/roles";
import { clearEnabledLanguages } from "../filter-available-locales";
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
 * D17: a language's `medusaLocale` is one of Medusa's 51 locale codes, and the owner picks which
 * (D8: `pt` is `pt-BR` for a Brazilian shop and `pt-PT` for a Portuguese one). It runs Payload's
 * own text check first, which enforces `required` (T09, item 3), then lets an empty optional value
 * through. The message names the choices for the row's language when Medusa has any.
 */
export const medusaLocale: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (value === undefined || value === null || value === "") return true;
  if (isMedusaLocale(value)) return true;
  const language = (options.siblingData as { code?: unknown } | undefined)?.code;
  const choices = typeof language === "string" ? medusaLocalesOf(language) : [];
  const hint =
    choices.length > 0
      ? `For ${language}, use ${choices.join(" or ")}.`
      : "Use one of Medusa's locales, for example en-US, el-GR or pt-BR.";
  return `"${value}" is not a Medusa locale. ${hint}`;
};

/**
 * The market map (D10), the editable part (D12): which countries are open, in which languages,
 * and how each language maps to a Medusa locale (D8). `getMarketMap()` reads it (T10) and the
 * validator above checks the Medusa locale codes; M4's sync fills `synced`. `filterAvailableLocales` reads it too: the
 * admin offers the languages of the enabled countries, and English.
 */
export const Markets: GlobalConfig = {
  slug: "markets",
  label: "Markets",
  // The storefront reads it through the Local API, which is not subject to access; this is the
  // REST and admin side.
  access: { read: isStaff, update: isAdmin },
  hooks: {
    // The admin's locale selector follows this global (`filterAvailableLocales`), which keeps its
    // read for a moment. Forget it, so the page the save refreshes already offers the new list.
    afterChange: [
      () => {
        clearEnabledLanguages();
      },
    ],
  },
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
          validate: medusaLocale,
          admin: {
            description: `The Medusa locale this language uses (D8), one of Medusa's ${MEDUSA_LOCALES.length}: el-GR for Greek, pt-BR or pt-PT for Portuguese.`,
          },
        },
        {
          name: "htmlLang",
          type: "text",
          admin: {
            description:
              "Overrides the lang attribute of every country that uses this language, for example pt-BR.",
          },
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
