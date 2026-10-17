// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). The narrow screen's navigation: a
// 44 px menu button that opens a sheet from the start side, with the items as the first level, a level
// for each dropdown or mega menu (a back button, the label as a heading, "Shop all …", the links), and
// at the foot the account links and the market switcher in its bottom-sheet form (SPEC §9.4: the
// "bottom-sheet market switcher"). A server component on purpose, as MarketSwitcher is (D49): it makes
// every word (`formatMessage` for "Back to Menu" and each "Shop all …") and renders the switcher, a
// server component that draws its flags, and hands the words, the items as plain data and the
// switcher as a node to `MobileNavDrawerClient`, which opens, moves focus and keeps the level. No
// flag's drawing is in a client chunk. The header shows the button below `lg` with `triggerClassName`
// (`lg:hidden`); the cart stays in the header beside it, never in the sheet (SPEC §9.4).
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { MobileNav } from "@shopblok/registry/contracts";
import { MarketSwitcher } from "@shopblok/ui/molecules/market-switcher";
import {
  MobileNavDrawerClient,
  type DrawerEntry,
  type DrawerLink,
} from "./mobile-nav-drawer-client";

type MobileNavDrawerProps = MobileNav & {
  /** The wording, from the catalog's `organisms.mobileNavDrawer`. */
  copy: Messages["organisms"]["mobileNavDrawer"];
  /** MarketSwitcher's wording, for the switcher at the foot when `market` is given. */
  marketSwitcherCopy: Messages["molecules"]["marketSwitcher"];
  /** The market's `<html lang>`, for `formatMessage` and the switcher's names. */
  locale: string;
  /** next/link's `prefetch` for every link; the design system passes `false` (the pages 404 until M3). */
  prefetch?: boolean | null;
  /** Drawn open at first render (the design system's states); takes no focus until a reader opens it again. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  /** The level drawn first (the design system's states): the index in `items` of a dropdown or mega menu. */
  defaultLevel?: number;
  /** Classes for the menu button (a header hides it from `lg` up). */
  triggerClassName?: string;
  /** Classes for the sheet (the design system's states switch its slide off). */
  popupClassName?: string;
};

function MobileNavDrawer({
  items,
  account,
  market,
  copy,
  marketSwitcherCopy,
  locale,
  prefetch,
  defaultOpen,
  modal,
  defaultLevel,
  triggerClassName,
  popupClassName,
}: MobileNavDrawerProps) {
  const shopAll = (what: string, href: string): DrawerLink => ({
    label: formatMessage(copy.shopAll, { label: what }, locale),
    href,
  });
  const link = ({ label, href }: DrawerLink): DrawerLink => ({ label, href });
  const entries = items.map((item): DrawerEntry => {
    switch (item.kind) {
      case "link":
        return { kind: "link", label: item.label, href: item.href };
      case "dropdown":
        return {
          kind: "level",
          label: item.label,
          groups: [{ links: item.items.map(link) }],
          featured: [],
        };
      case "megaMenu":
        return {
          kind: "level",
          label: item.label,
          shopAll: item.href === undefined ? undefined : shopAll(item.label, item.href),
          groups: item.columns.map((column) => ({
            title: column.title,
            shopAll: column.href === undefined ? undefined : shopAll(column.title, column.href),
            links: column.links.map(link),
          })),
          featured: item.featured.map((feature) => ({ label: feature.title, href: feature.href })),
        };
    }
  });
  return (
    <MobileNavDrawerClient
      entries={entries}
      account={account.map(link)}
      marketSwitcher={
        market === undefined ? undefined : (
          <MarketSwitcher
            markets={market.markets}
            copy={marketSwitcherCopy}
            locale={locale}
            form="drawer"
            className="w-full *:data-[slot=market-switcher-trigger]:w-full"
          />
        )
      }
      copy={{
        open: copy.open,
        title: copy.title,
        close: copy.close,
        // Every level returns to the first, which is named by the sheet's title.
        back: formatMessage(copy.back, { label: copy.title }, locale),
        account: copy.account,
      }}
      prefetch={prefetch}
      defaultOpen={defaultOpen}
      modal={modal}
      defaultLevel={defaultLevel}
      triggerClassName={triggerClassName}
      popupClassName={popupClassName}
    />
  );
}

export { MobileNavDrawer };
export type { MobileNavDrawerProps };
