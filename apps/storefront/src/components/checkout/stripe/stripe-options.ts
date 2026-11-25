// Ours (M6 T100, SETUP.md "Stripe in the checkout (T100)"; D117). What the Payment Element is made
// with, pure: Stripe's locale for the market's language, an amount in the currency's smallest unit,
// and the Element's look from the shop's tokens.

/** The locales Stripe's Elements speak (Stripe's `StripeElementLocale`, less `auto`). */
const STRIPE_LOCALES: ReadonlySet<string> = new Set([
  "ar",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "en-AU",
  "en-CA",
  "en-NZ",
  "en-GB",
  "es",
  "es-ES",
  "es-419",
  "et",
  "fi",
  "fil",
  "fr",
  "fr-CA",
  "fr-FR",
  "he",
  "hr",
  "hu",
  "id",
  "it",
  "it-IT",
  "ja",
  "ko",
  "lt",
  "lv",
  "ms",
  "mt",
  "nb",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sv",
  "th",
  "tr",
  "vi",
  "zh",
  "zh-HK",
  "zh-TW",
]);

/**
 * Stripe's locale for a market's `<html lang>`: the tag itself (`fr-CA`), else its language (`el`
 * for `el-CY`), else English (a language Stripe does not speak, such as Persian: D117 step 2).
 */
export function stripeLocale(htmlLang: string): string {
  if (STRIPE_LOCALES.has(htmlLang)) return htmlLang;
  const language = htmlLang.split("-")[0]?.toLowerCase() ?? "";
  return STRIPE_LOCALES.has(language) ? language : "en";
}

/**
 * An amount in its currency's smallest unit, as Stripe counts it and as Medusa's provider sends it
 * (`getSmallestUnit`): cents for EUR, yen for JPY. Medusa's totals are in the main unit.
 */
export function smallestUnit(amount: number, currency: string): number {
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).resolvedOptions().maximumFractionDigits;
  return Math.round(amount * 10 ** (digits ?? 2));
}

/** The shop's tokens the Element's look follows, read in the browser (`--primary`…). */
export type TokenColors = {
  primary: string;
  background: string;
  foreground: string;
  muted: string;
  destructive: string;
  border: string;
};

/** The Element's `appearance` (Stripe's `flat` theme in the shop's colours, corners and type). */
export function appearanceFrom(colors: TokenColors, radiusPx: number, fontFamily: string) {
  const radius = `${Math.max(0, Math.round(radiusPx))}px`;
  return {
    theme: "stripe" as const,
    variables: {
      colorPrimary: colors.primary,
      colorBackground: colors.background,
      colorText: colors.foreground,
      colorTextSecondary: colors.muted,
      colorDanger: colors.destructive,
      borderRadius: radius,
      fontFamily,
      spacingUnit: "4px",
    },
    rules: {
      ".Input": { borderColor: colors.border, boxShadow: "none" },
      ".Tab": { borderColor: colors.border, boxShadow: "none" },
      ".AccordionItem": { borderColor: colors.border, boxShadow: "none" },
    },
  };
}
