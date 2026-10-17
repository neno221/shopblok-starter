import { catalogs } from "@shopblok/i18n";
import { Providers } from "@shopblok/ui/providers";
import type { Metadata } from "next";
import type { ReactNode } from "react";
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
export default async function RootLayout({ children }: { children: ReactNode }) {
  const market = await getCurrentMarket();
  const { toast } = catalogs[market.locale].primitives;
  return (
    <html lang={market.htmlLang} className={inter.variable}>
      <body>
        <Providers copy={{ toastRegion: toast.region, toastClose: toast.close }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
