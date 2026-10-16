import type { Locale } from "@shopblok/i18n";
import type { ReactNode } from "react";
import { inter } from "../../lib/fonts";
import { createContext } from "../context";

/**
 * The `<html>` and `<body>` of a DS page or frame (each DS route group is a root layout of its own,
 * D33): `lang` is the locale's market (`en-US`, `el-CY`, `de-DE`, `fr-CH`), and the font variable
 * is the one the shared stylesheet reads.
 */
export function Document({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { fixture } = createContext(locale);
  return (
    <html lang={fixture.market.htmlLang} className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
