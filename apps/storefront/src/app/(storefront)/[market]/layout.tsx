import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentMarket } from "../../../lib/current-market";
import { listShellMarkets } from "../../../lib/shell-markets";
import "../../../styles/globals.css";

export const metadata: Metadata = { title: "Shopblok" };

// With Cache Components every root param needs at least one value, or the build fails.
export function generateStaticParams() {
  return listShellMarkets().map((market) => ({ market: market.key }));
}

// This is the root layout: there is no `app/layout.tsx`, so `market` is a root param that any
// server component can read through `next/root-params`.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const market = await getCurrentMarket();
  return (
    <html lang={market.htmlLang}>
      <body>{children}</body>
    </html>
  );
}
