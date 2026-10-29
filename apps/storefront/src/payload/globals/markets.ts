import type {
  Field,
  GlobalBeforeChangeHook,
  GlobalConfig,
  TextFieldSingleValidation,
} from "payload";
import { ValidationError } from "payload";
import { text } from "payload/shared";
import { isLanguageTag, isTimeZone } from "../../lib/markets/market";
import { MEDUSA_LOCALES, isMedusaLocale, medusaLocalesOf } from "../../lib/markets/medusa-locales";
import type { MarketsGlobal } from "../../lib/markets/global";
import {
  isSyncedEmpty,
  syncedFromGlobal,
  syncedMarketProblems,
  type SyncedMarketsGlobal,
} from "../../lib/markets/synced";
import {
  adminOrMedusaSync,
  isAdminField,
  isMedusaSyncField,
  staffOrMedusaSync,
  staffUser,
} from "../access/roles";
import { revalidateGlobalOnPublish } from "../hooks/revalidate-on-publish";
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
 * D76: a staff member's save is checked against the synced part (`syncedMarketProblems`), and
 * refused with the reasons on their fields. While `synced` is empty (a fresh clone, before the
 * first sync) the reasons are only logged, so `pnpm bootstrap` and a first edit keep working. The
 * sync's own writes are not checked: Medusa is the truth for the synced part, and a country it
 * took out of a region shows up in doctor's `markets-sync` and on the next staff save.
 */
export const checkAgainstSynced: GlobalBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (staffUser(req) === null) return data;
  // A REST save may send only some fields; the rest keep their stored values. The synced part is
  // always the stored one: staff cannot write it (Payload drops it after this hook runs).
  const stored = originalDoc as (MarketsGlobal & { synced?: SyncedMarketsGlobal }) | undefined;
  const merged = { ...stored, ...data } as MarketsGlobal;
  const synced = syncedFromGlobal(stored?.synced);
  const problems = syncedMarketProblems(merged, synced);
  if (problems.length === 0) return data;
  if (isSyncedEmpty(synced)) {
    req.payload.logger.warn(
      `markets: not checked against Medusa yet (no sync has run): ${problems.map((problem) => problem.message).join(" ")}`,
    );
    return data;
  }
  throw new ValidationError({ global: "markets", errors: problems, req });
};

/** The parts staff edit: only an admin may write them, never the sync's API key. */
const editable = (field: Field): Field =>
  ({
    ...field,
    access: { ...("access" in field ? field.access : {}), update: isAdminField },
  }) as Field;

// `revalidateTag("global:markets")` on every save (D76): the layout's map read and the proxy's
// map follow at once instead of after their 30 s. Expired, not refreshed in the background, and
// the entry is computed from the global itself, not the 30 s in-process map (T71): otherwise
// `/next/markets` kept the old map up to twice more for 30 s each, and a new market took up to 90 s
// to reach the proxy. Now the next read waits for the saved map, as the redirects' does (T68), and
// only the proxy's own 30 s remain.
const revalidate = revalidateGlobalOnPublish({
  tags: () => ["global:markets"],
  profile: { expire: 0 },
});

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
  // REST and admin side. The sync reads it and writes `synced` (each field's access says which
  // part is whose).
  access: { read: staffOrMedusaSync, update: adminOrMedusaSync },
  hooks: {
    beforeChange: [checkAgainstSynced, ...revalidate.beforeChange],
    afterChange: [
      // The admin's locale selector follows this global (`filterAvailableLocales`), which keeps
      // its read for a moment. Hand it the saved list, so the page the save refreshes offers it.
      ({ doc, req }) => rememberEnabledLanguages(req.payload, doc),
      ...revalidate.afterChange,
    ],
  },
  fields: [
    ...(
      [
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
      ] satisfies Field[]
    ).map(editable),
    {
      name: "synced",
      type: "group",
      admin: {
        description:
          "What Medusa has, written by the Medusa sync (D76). Read-only: change regions, currencies and locales in Medusa Admin.",
        readOnly: true,
      },
      // Only the sync writes it; an admin's form sends it back unchanged and Payload drops it.
      access: { create: isMedusaSyncField, update: isMedusaSyncField },
      fields: [
        {
          name: "regions",
          type: "array",
          labels: { singular: "Region", plural: "Regions" },
          fields: [
            { name: "medusaId", type: "text", required: true },
            { name: "name", type: "text", required: true },
            { name: "currency", type: "text", required: true },
            { name: "countries", type: "text", hasMany: true },
          ],
        },
        { name: "currencies", type: "text", hasMany: true },
        { name: "defaultCurrency", type: "text" },
        { name: "locales", type: "text", hasMany: true },
        { name: "syncedAt", type: "date", admin: { date: { pickerAppearance: "dayAndTime" } } },
      ],
    },
  ],
};
