import { catalogs, type Locale } from "@shopblok/i18n";
import { Providers } from "@shopblok/ui/providers";
import type { ReactNode } from "react";
import { inter } from "../../lib/fonts";
import { createContext } from "../context";

/**
 * The `<html>` and `<body>` of a DS page or frame (each DS route group is a root layout of its own,
 * D33): `lang` is the locale's market (`en-US`, `el-CY`, `de-DE`, `fr-CH`), and the font variable
 * is the one the shared stylesheet reads. Its body holds the same Providers as the storefront's root
 * layout (T31), so an entry's tooltips and toasts work as they will in a shop.
 */
export function Document({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { fixture } = createContext(locale);
  const { toast } = catalogs[locale].primitives;
  return (
    <html lang={fixture.market.htmlLang} className={inter.variable}>
      <body>
        <Providers copy={{ toastRegion: toast.region, toastClose: toast.close }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
