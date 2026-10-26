import type { Messages } from "@shopblok/i18n";
import { HeaderCentered } from "@shopblok/ui/organisms/header/centered";
import { HeaderClassic } from "@shopblok/ui/organisms/header/classic";
import { HeaderMegaMenu } from "@shopblok/ui/organisms/header/mega-menu";
import { HeaderMinimal } from "@shopblok/ui/organisms/header/minimal";
import type { HeaderProps } from "@shopblok/ui/organisms/header/parts";
import { HeaderTwoTier } from "@shopblok/ui/organisms/header/two-tier";
import { getMessages } from "next-intl/server";
import type { ReactElement } from "react";
import { toNavigation } from "../../lib/navigation";
import { announcementFor, SHELL_PREFETCH, SITE, type HeaderVariant } from "../../lib/site";
import { CartIsland } from "../../lib/visitor/cart-island";
import { CartIslandParts } from "./cart-island-parts";
import { SearchOverlayIsland } from "./search-overlay-island";
import { getShellData } from "./shell-data";

// The shop's header (D66): the variant `site.ts` names, with the navigation from Medusa's category
// tree, the market switcher, the announcement bar, and the visitor's parts as islands in its slots
// (D44): the cart button, which draws the count once the visitor store has it and opens the cart
// drawer and the quick cart (T52), and the search overlay. The menu's panels stay unmounted (T35's item 8): their links are in the footer.

const HEADERS: Record<HeaderVariant, (props: HeaderProps) => ReactElement> = {
  classic: HeaderClassic,
  centered: HeaderCentered,
  "two-tier": HeaderTwoTier,
  "mega-menu": HeaderMegaMenu,
  minimal: HeaderMinimal,
};

export async function SiteHeader() {
  const [{ market, url, categories, choice }, messages] = await Promise.all([
    getShellData(),
    getMessages() as Promise<Messages>,
  ]);
  const Header = HEADERS[SITE.header];
  const cartHref = url("/cart");
  return (
    <Header
      storeName={SITE.storeName}
      homeHref={url("/")}
      cartHref={cartHref}
      navigation={toNavigation(categories)}
      utilities={{
        search: url("/search"),
        account: url("/account"),
        marketSwitcher: choice !== undefined,
      }}
      {...(choice === undefined ? {} : { market: choice })}
      announcement={announcementFor(market.language)}
      sticky={SITE.stickyHeader}
      copy={messages.organisms}
      marketSwitcherCopy={messages.molecules.marketSwitcher}
      locale={market.htmlLang}
      prefetch={SHELL_PREFETCH}
      cart={
        <>
          <CartIslandParts />
          <CartIsland
            market={market.key}
            href={cartHref}
            copy={messages.organisms.header}
            locale={market.htmlLang}
            prefetch={SHELL_PREFETCH}
          />
        </>
      }
      search={
        <SearchOverlayIsland
          market={market.key}
          action={url("/search")}
          copy={messages.organisms.searchOverlay}
          priceCopy={messages.molecules.priceBlock}
          locale={market.htmlLang}
          prefetch={SHELL_PREFETCH}
        />
      }
    />
  );
}
