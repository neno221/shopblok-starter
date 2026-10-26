import type { Messages } from "@shopblok/i18n";

// next-intl's type seam (its "TypeScript" guide): with the catalog's shape declared here,
// `getTranslations("wiring")` and `useTranslations("wiring")` take only the keys English defines,
// and `getMessages()` is typed as the catalog. `Locale` stays a string: the request's locale is the
// market's `<html lang>` (`el-CY`, `de-CH`, `mn`), which no closed list can name.
declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}
