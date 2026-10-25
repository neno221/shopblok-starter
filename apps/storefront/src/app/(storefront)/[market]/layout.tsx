import { Providers } from "@shopblok/ui/providers";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { pick, SHELL_MESSAGES } from "../../../i18n/messages";
import { getCurrentMarket } from "../../../lib/current-market";
import { inter } from "../../../lib/fonts";
import { getMarketMap } from "../../../lib/markets/get-market-map";
import { listMarkets } from "../../../lib/markets/market";
import "../../../styles/globals.css";

export const metadata: Metadata = { title: "Shopblok" };

// With Cache Components every root param needs at least one value, or the build fails. The keys
// come from the market map; keys it gains later render on request.
export async function generateStaticParams() {
  return listMarkets(await getMarketMap()).map((market) => ({ market: market.key }));
}

// This is the root layout: there is no `app/layout.tsx`, so `market` is a root param that any
// server component can read through `next/root-params`.
//
// D62: the copy comes from next-intl, which reads the same market (`src/i18n/request.ts`). The client
// provider is given the shell's namespaces only; without `messages` it would send the whole catalog.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const market = await getCurrentMarket();
  const [t, messages] = await Promise.all([getTranslations("primitives.toast"), getMessages()]);
  return (
    <html lang={market.htmlLang} className={inter.variable}>
      <body>
        <NextIntlClientProvider messages={pick(messages, SHELL_MESSAGES)}>
          <Providers copy={{ toastRegion: t("region"), toastClose: t("close") }}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
