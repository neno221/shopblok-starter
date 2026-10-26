import type { GlobalConfig, TextFieldSingleValidation } from "payload";
import { text } from "payload/shared";
import { isLanguageTag, isTimeZone } from "../../lib/markets/market";
import { MEDUSA_LOCALES, isMedusaLocale, medusaLocalesOf } from "../../lib/markets/medusa-locales";
import { isAdmin, isStaff } from "../access/roles";
import { rememberEnabledLanguages } from "../filter-available-locales";
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
 * A language's `htmlLang`, when the owner writes one, is a language tag (`pt-BR`): next-intl and
 * `formatMoney` hand it to `Intl`, which throws on `pt_BR` or `Portuguese`. Payload's own text
 * check runs first, then an empty optional value goes through (the language and country make the
 * lang value then). `listMarkets` ignores a stored value that is not a tag, so a value saved
 * before this check exists does not break a page either (PR 70 review, item 1).
 */
export const htmlLang: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (value === undefined || value === null || value === "") return true;
  return isLanguageTag(value)
    ? true
    : `"${value}" is not a language tag. Use a code such as pt-BR or de-CH, or leave it empty.`;
};

/**
 * D65: a country's `timeZone` is the IANA zone its order dates are written in. It runs Payload's
 * own text check first, lets an empty value through (UTC is used then), and otherwise asks `Intl`
 * whether it takes the zone, since `formatDate` and next-intl hand it to `Intl.DateTimeFormat`,
 * which throws a RangeError on anything else. `mapFromGlobal` ignores a stored value that fails
 * this, so one saved before the check existed does not break a page.
 */
export const timeZone: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (value === undefined || value === null || value === "") return true;
  return isTimeZone(value)
    ? true
    : `"${value}" is not a time zone. Use an IANA name such as Europe/Nicosia or America/New_York, or leave it empty.`;
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
    // read for a moment. Hand it the saved list, so the page the save refreshes already offers it.
    afterChange: [({ doc, req }) => rememberEnabledLanguages(req.payload, doc)],
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
        {
          name: "timeZone",
          type: "text",
          validate: timeZone,
          admin: {
            description:
              "The IANA time zone this country's order dates are written in, for example Europe/Nicosia. UTC is used when this is empty (D65).",
          },
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
          validate: htmlLang,
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
