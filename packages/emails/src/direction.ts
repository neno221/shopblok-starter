/**
 * The right-to-left languages among the shop's (`@shopblok/i18n`'s `LANGUAGES` holds `ar` and `fa`;
 * the storefront's Payload locales mark the same as `rtl`), and the others a shop may add.
 */
const RTL = new Set(["ar", "fa", "he", "ur", "ps", "yi", "dv", "ckb", "sd", "ug"]);

/** `rtl` for a right-to-left language (`fa`, `ar-EG`), else `ltr`. */
export function directionOf(language: string): "ltr" | "rtl" {
  const base = language.toLowerCase().split(/[-_]/)[0] ?? "";
  return RTL.has(base) ? "rtl" : "ltr";
}
