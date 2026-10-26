import { MarketSuggestionBanner } from "@shopblok/ui/organisms/market-suggestion-banner";
import { Providers } from "@shopblok/ui/providers";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { pickShell } from "../../../i18n/messages";
import { getCurrentMarket } from "../../../lib/current-market";
import { inter } from "../../../lib/fonts";
import { MarketChoiceIsland } from "../../../components/shell/market-choice-island";
import { SiteFooter } from "../../../components/shell/footer";
import { SiteHeader } from "../../../components/shell/header";
import { getShellData } from "../../../components/shell/shell-data";
import { ShellLinksProvider } from "../../../components/shell/shell-context";
import { SuggestionBannerIsland } from "../../../components/shell/suggestion-banner";
import { getMarketMap } from "../../../lib/markets/get-market-map";
import { listMarkets } from "../../../lib/markets/market";
import { siteBase } from "../../../lib/seo/product";
import { SHELL_PREFETCH, SITE } from "../../../lib/site";
import { VisitorCookieConsent } from "../../../lib/visitor/cookie-consent";
import { VisitorSource } from "../../../lib/visitor/visitor-source";
import "../../../styles/globals.css";

// A page's title is "{page} | Shopblok"; `metadataBase` turns the pages' relative canonical, hreflang
// and Open Graph URLs into absolute ones (SPEC §12), from `NEXT_PUBLIC_BASE_URL`.
export const metadata: Metadata = {
  title: { default: SITE.storeName, template: `%s | ${SITE.storeName}` },
  metadataBase: siteBase(),
};

// With Cache Components every root param needs at least one value, or the build fails. The keys
// come from the market map; keys it gains later render on request.
export async function generateStaticParams() {
  return listMarkets(await getMarketMap()).map((market) => ({
    market: market.key,
  }));
}

// This is the root layout: there is no `app/layout.tsx`, so `market` is a root param that any
// server component can read through `next/root-params`.
//
// D62: the copy comes from next-intl, which reads the same market (`src/i18n/request.ts`). The client
// provider is given the shell's namespaces only; without `messages` it would send the whole catalog.
//
// D66 (T48): the shell. The header and the footer read only `cached()` entries (the map, the
// category tree, the regions), so the layout reads nothing per request and a catalog page's
// `ensureStatic = "navigation"` covers it; the layout itself sets none, because it is above the
// cart, the checkout and the account too. What is the visitor's is an island that draws nothing on
// the server (D44): the store's source, the choice of market, the suggestion banner, the cookie
// banner, and in the header the cart's count and the search. A page's `<main id="main">` is the
// skip link's target.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [market, t, messages, shell] = await Promise.all([
    getCurrentMarket(),
    getTranslations("primitives.toast"),
    getMessages(),
    getShellData(),
  ]);
  const home = shell.url("/");
  return (
    <html lang={market.htmlLang} className={inter.variable}>
      <body className="flex min-h-svh flex-col">
        <NextIntlClientProvider messages={pickShell(messages, market.locale)}>
          <Providers copy={{ toastRegion: t("region"), toastClose: t("close") }}>
            <VisitorSource market={market.key} />
            <MarketChoiceIsland current={{ key: market.key, home }} markets={shell.homes} />
            <SiteHeader />
            {/* The island reads the path, which a page with a segment known only at run time (the
                receipt's order id, T52) does not have while the shell is prerendered. */}
            <Suspense fallback={null}>
              <SuggestionBannerIsland market={market.key} />
            </Suspense>
            {/* Draws nothing; it is what puts the banner's client part in this page (see the island). */}
            <MarketSuggestionBanner
              copy={messages.organisms.marketSuggestionBanner}
              locale={market.htmlLang}
            />
            <ShellLinksProvider value={{ home }}>
              <div className="flex flex-1 flex-col">{children}</div>
            </ShellLinksProvider>
            <SiteFooter />
            <VisitorCookieConsent
              policyHref={shell.url("/cookies")}
              copy={messages.organisms.cookieConsent}
              locale={market.htmlLang}
              prefetch={SHELL_PREFETCH}
            />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
