// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). The header's navigation
// for wide screens: one navigation landmark named by the catalog's `organisms.header.navigation`,
// whose items are links, dropdowns (a trigger and a narrow panel of links) and mega menus (a trigger
// and a panel as wide as the root: "Shop all Women", the columns as groups, and up to two featured
// tiles). It opens on hover and on Enter, Space and ArrowDown, stays open over the trigger or the
// panel, closes on Escape with focus back on the trigger, lets Tab go from the trigger into the panel,
// and closes when Tab leaves it. Base UI does all of these but one: it leaves a panel open when
// Tab lands on the next item of the bar, so the client part closes it when keyboard focus reaches
// another item (the roving arrow keys, Tab and Shift+Tab alike).
// A server component on purpose: it makes every word (the "Shop all" links, with `formatMessage`) and
// turns the contract's items into plain data for `MegaMenuNav` (`mega-menu-client.tsx`), the client
// part that draws the landmark and the panels, so the client chunk holds no formatter and no catalog.
// The root takes the width of its row from the header; the panel is as wide as the root, which is
// what SPEC §13 asks of "full width" (the page's edge to edge is the header's choice of row). The
// centered header's split navigation is `splitAt` and `center`: two lists inside the one landmark,
// the logo between them. A `Link`'s `external` flag is not used: the navigation's copy has no
// new-tab note to read out, and a link that left the tab without saying so would fail a reader.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { Navigation } from "@shopblok/registry/contracts";
import type * as React from "react";
import { MegaMenuNav, type MegaMenuEntry, type MegaMenuLink } from "./mega-menu-client";

type MegaMenuProps = Navigation & {
  /** The wording, from the catalog's `organisms.megaMenu`. */
  copy: Messages["organisms"]["megaMenu"];
  /** The navigation landmark's name, from the catalog's `organisms.header.navigation`. */
  label: string;
  /** The market's `<html lang>`, for `formatMessage`. */
  locale: string;
  /** next/link's `prefetch` for every link; the design system passes `false` (the pages 404 until M3). */
  prefetch?: boolean | null;
  /** The centered header's split navigation: the items from this index go after `center`. */
  splitAt?: number;
  /** What sits between the two halves when `splitAt` is given (the centered header's logo). */
  center?: React.ReactNode;
  /**
   * The index in `items` of a dropdown or mega menu drawn open at first render (the design system's
   * states). It takes no focus: a reader's own opening does.
   */
  defaultOpenItem?: number;
  /**
   * Classes for each panel's content, after its own. The design system caps the panel's height with
   * it: in a box below the fold, the room the window leaves under the bar means nothing.
   */
  panelClassName?: string;
  className?: string;
};

function MegaMenu({
  items,
  copy,
  label,
  locale,
  prefetch,
  splitAt,
  center,
  defaultOpenItem,
  panelClassName,
  className,
}: MegaMenuProps) {
  const shopAll = (what: string, href: string): MegaMenuLink => ({
    label: formatMessage(copy.shopAll, { label: what }, locale),
    href,
  });
  const entries = items.map((item): MegaMenuEntry => {
    switch (item.kind) {
      case "link":
        return { kind: "link", label: item.label, href: item.href };
      case "dropdown":
        return {
          kind: "dropdown",
          label: item.label,
          links: item.items.map(({ label: text, href }) => ({ label: text, href })),
        };
      case "megaMenu":
        return {
          kind: "megaMenu",
          label: item.label,
          shopAll: item.href === undefined ? undefined : shopAll(item.label, item.href),
          columns: item.columns.map((column) => ({
            title: column.title,
            shopAll: column.href === undefined ? undefined : shopAll(column.title, column.href),
            links: column.links.map(({ label: text, href }) => ({ label: text, href })),
          })),
          featured: item.featured.map((feature) => ({
            title: feature.title,
            href: feature.href,
            image: { src: feature.image.src, alt: feature.image.alt },
          })),
        };
    }
  });
  return (
    <MegaMenuNav
      label={label}
      entries={entries}
      featuredLabel={copy.featured}
      prefetch={prefetch}
      splitAt={splitAt}
      center={center}
      defaultOpenItem={defaultOpenItem}
      panelClassName={panelClassName}
      className={className}
    />
  );
}

export { MegaMenu };
export type { MegaMenuProps };
