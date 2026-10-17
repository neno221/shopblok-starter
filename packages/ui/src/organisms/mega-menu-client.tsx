// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §13). MegaMenu's client part: the
// navigation landmark, its triggers and links, and the panels, on the navigation-menu primitive. A
// client component for two reasons. Base UI's NavigationMenu keeps the open item, the hover and the
// focus handling. And the open item is held here, so that one rule can be added to Base UI's: the
// panel closes when the keyboard moves focus to another item of the bar. Base UI hands focus from the
// panel's last link to the next stop after the trigger, and closes the panel only when that stop is
// outside the navigation, so on a bar with items after it the panel would stay open over the next
// trigger. Pressing a pointer on another trigger is left to Base UI (it opens that one), so the rule
// reads `:focus-visible`, which a keyboard's focus has and a click's does not. It takes everything
// made: the words the server formatted ("Shop all Women") and the items as plain data, so it imports
// no formatter and no catalog.
// A mega menu's panel is as wide as the header's row (`fullWidthAnchor`; the menu's own width outside
// a header) and a dropdown's is narrow under its trigger, so `fullWidth` follows the open item. The panel's parts
// are laid out by the room they have, with no breakpoint: the columns are a grid of tracks at least
// 11rem wide, and the featured tiles wrap under the columns when the row is too narrow. That is what
// keeps a panel inside a 375 px screen, where it is one column. Each panel link is 44 px tall and
// wraps a long German or Greek label (`wrap-anywhere`). A featured tile is the picture with its
// title as the link, and the link's `::after` covers the tile, so the whole tile is the target and
// its name is the title alone. The panel carries `data-slot="mega-menu-panel"` in place of the
// primitive's slot, which the interaction check waits for.
// A mega menu's panel is as tall as the room below the bar in the window (`--available-height`) and
// scrolls inside it. A dropdown never flips above its row, as the wide panel never does: above, it
// would cover the triggers it hangs from. `panelClassName` reaches every panel's content; the design
// system caps the height with it, because a box below the fold has no room in the window, and an
// available height below zero is no cap at all.
"use client";

import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@shopblok/ui/primitives/navigation-menu";
import NextLink from "next/link";
import { useId, useState, type FocusEvent, type ReactNode } from "react";

type MegaMenuLink = { label: string; href: string };

type MegaMenuColumnData = {
  title: string;
  /** "Shop all Clothing": there when the column goes somewhere. */
  shopAll?: MegaMenuLink;
  links: MegaMenuLink[];
};

type MegaMenuFeatureData = { title: string; href: string; image: { src: string; alt: string } };

/** What the server made of a `NavItem`: plain data, with every word formatted. */
type MegaMenuEntry =
  | ({ kind: "link" } & MegaMenuLink)
  | { kind: "dropdown"; label: string; links: MegaMenuLink[] }
  | {
      kind: "megaMenu";
      label: string;
      /** "Shop all Women": there when the label goes somewhere too. */
      shopAll?: MegaMenuLink;
      columns: MegaMenuColumnData[];
      featured: MegaMenuFeatureData[];
    };

type MegaMenuNavProps = {
  /** The navigation landmark's name. */
  label: string;
  entries: MegaMenuEntry[];
  /** The featured tiles' group name. */
  featuredLabel: string;
  prefetch?: boolean | null;
  splitAt?: number;
  center?: ReactNode;
  /** The index in `entries` of a dropdown or mega menu that is open at first render. */
  defaultOpenItem?: number;
  /** Classes for each panel's content, after the panel's own. */
  panelClassName?: string;
  className?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; the hrefs here are
// strings the app built (the same cast as CartButton's).
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** How long the pointer may be away from the trigger and the panel before the panel closes. */
const CLOSE_DELAY_MS = 200;

/** A dropdown stays below its row (see the header); it still shifts sideways to stay on the screen. */
const DROPDOWN_COLLISION_AVOIDANCE = { side: "none", fallbackAxisSide: "none" } as const;

/** Whether the element has focus the way a keyboard gives it. Without `:focus-visible`, it does. */
function focusedByKeyboard(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

function PanelLink({
  link,
  prefetch,
  className,
}: {
  link: MegaMenuLink;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <NavigationMenuLink
      closeOnClick
      render={<NextLink href={link.href as LinkHref} prefetch={prefetch} />}
      className={cn("wrap-anywhere", className)}
    >
      {link.label}
    </NavigationMenuLink>
  );
}

function LinkList({
  links,
  shopAll,
  prefetch,
}: {
  links: MegaMenuLink[];
  shopAll?: MegaMenuLink;
  prefetch?: boolean | null;
}) {
  return (
    <ul className="flex flex-col">
      {shopAll === undefined ? null : (
        <li>
          <PanelLink link={shopAll} prefetch={prefetch} className="font-medium" />
        </li>
      )}
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <PanelLink link={link} prefetch={prefetch} />
        </li>
      ))}
    </ul>
  );
}

function Column({ column, prefetch }: { column: MegaMenuColumnData; prefetch?: boolean | null }) {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-slot="mega-menu-column"
      className="flex min-w-0 flex-col gap-1"
    >
      <p id={titleId} className="px-2 text-sm font-semibold text-foreground wrap-anywhere">
        {column.title}
      </p>
      <LinkList links={column.links} shopAll={column.shopAll} prefetch={prefetch} />
    </div>
  );
}

function Feature({
  feature,
  prefetch,
}: {
  feature: MegaMenuFeatureData;
  prefetch?: boolean | null;
}) {
  return (
    <div
      data-slot="mega-menu-feature"
      // The whole tile shows the ring, because the link's `::after` covers it.
      className="relative flex min-w-0 flex-col gap-1 rounded-lg has-focus-visible:ring-3 has-focus-visible:ring-ring"
    >
      <Image
        src={feature.image.src}
        alt={feature.image.alt}
        sizes="(min-width: 1024px) 320px, 90vw"
        ratio="landscape"
        radius="lg"
      />
      <NavigationMenuLink
        closeOnClick
        render={<NextLink href={feature.href as LinkHref} prefetch={prefetch} />}
        className="font-medium wrap-anywhere after:absolute after:inset-0 after:rounded-lg"
      >
        {feature.title}
      </NavigationMenuLink>
    </div>
  );
}

function MegaPanel({
  entry,
  featuredLabel,
  prefetch,
  className,
}: {
  entry: Extract<MegaMenuEntry, { kind: "megaMenu" }>;
  featuredLabel: string;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <NavigationMenuContent
      data-slot="mega-menu-panel"
      className={cn("max-h-(--available-height) overflow-y-auto p-4 md:p-6", className)}
    >
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        <div
          data-slot="mega-menu-columns"
          className="grid min-w-0 flex-[3_1_24rem] grid-cols-[repeat(auto-fill,minmax(min(11rem,100%),1fr))] content-start gap-x-6 gap-y-6"
        >
          {entry.shopAll === undefined ? null : (
            // The item's own link, first: a reader who tabs in finds where the label goes.
            <div className="col-span-full">
              <PanelLink link={entry.shopAll} prefetch={prefetch} className="font-semibold" />
            </div>
          )}
          {entry.columns.map((column) => (
            <Column
              key={`${column.title}-${column.shopAll?.href ?? ""}`}
              column={column}
              prefetch={prefetch}
            />
          ))}
        </div>
        {entry.featured.length === 0 ? null : (
          <div
            role="group"
            aria-label={featuredLabel}
            data-slot="mega-menu-features"
            className="grid min-w-0 flex-[1_1_16rem] grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))] content-start gap-4"
          >
            {entry.featured.map((feature) => (
              <Feature key={feature.href} feature={feature} prefetch={prefetch} />
            ))}
          </div>
        )}
      </div>
    </NavigationMenuContent>
  );
}

function DropdownPanel({
  entry,
  prefetch,
  className,
}: {
  entry: Extract<MegaMenuEntry, { kind: "dropdown" }>;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <NavigationMenuContent data-slot="mega-menu-panel" className={cn("p-2", className)}>
      <ul className="grid w-max max-w-72 min-w-44 gap-0.5">
        {entry.links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <PanelLink link={link} prefetch={prefetch} />
          </li>
        ))}
      </ul>
    </NavigationMenuContent>
  );
}

function Entry({
  entry,
  index,
  featuredLabel,
  prefetch,
  panelClassName,
}: {
  entry: MegaMenuEntry;
  index: number;
  featuredLabel: string;
  prefetch?: boolean | null;
  panelClassName?: string;
}) {
  const value = String(index);
  if (entry.kind === "link") {
    return (
      <NavigationMenuItem value={value} data-item={value} className="max-w-full">
        <NavigationMenuLink
          closeOnClick
          render={<NextLink href={entry.href as LinkHref} prefetch={prefetch} />}
          className={cn(navigationMenuTriggerStyle(), "max-w-full wrap-anywhere")}
        >
          {entry.label}
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }
  return (
    <NavigationMenuItem value={value} data-item={value} className="max-w-full">
      <NavigationMenuTrigger className="max-w-full wrap-anywhere">
        {entry.label}
      </NavigationMenuTrigger>
      {entry.kind === "dropdown" ? (
        <DropdownPanel entry={entry} prefetch={prefetch} className={panelClassName} />
      ) : (
        <MegaPanel
          entry={entry}
          featuredLabel={featuredLabel}
          prefetch={prefetch}
          className={panelClassName}
        />
      )}
    </NavigationMenuItem>
  );
}

function MegaMenuNav({
  label,
  entries,
  featuredLabel,
  prefetch,
  splitAt,
  center,
  defaultOpenItem,
  panelClassName,
  className,
}: MegaMenuNavProps) {
  const [value, setValue] = useState<string | null>(
    defaultOpenItem === undefined ? null : String(defaultOpenItem),
  );
  // Whether the panel is a mega menu's. It is set when an item opens and kept while the panel
  // closes, so the panel does not jump from the bar's width to its trigger's during its exit.
  const [wide, setWide] = useState(
    defaultOpenItem !== undefined && entries[defaultOpenItem]?.kind === "megaMenu",
  );
  const split = splitAt === undefined ? undefined : Math.min(Math.max(splitAt, 0), entries.length);

  // The rule Base UI lacks (see the header): the keyboard reaches another item of the bar.
  function closeWhenFocusMovesToAnotherItem(event: FocusEvent<HTMLElement>) {
    if (value === null) return;
    const target = event.target;
    // The panel is in a portal: React sends its events here, but it is not in the bar.
    if (!event.currentTarget.contains(target)) return;
    // Base UI's guards hand focus on within the same press.
    if (target.hasAttribute("data-base-ui-focus-guard")) return;
    // `data-item` says which item of the bar an element belongs to.
    if (target.closest("[data-item]")?.getAttribute("data-item") === value) return;
    if (!focusedByKeyboard(target)) return;
    setValue(null);
  }

  function items(from: number, to: number) {
    return entries.slice(from, to).map((entry, offset) => (
      <Entry
        key={`${entry.kind}-${entry.label}-${from + offset}`}
        entry={entry}
        index={from + offset}
        featuredLabel={featuredLabel}
        prefetch={prefetch}
        panelClassName={panelClassName}
      />
    ));
  }

  return (
    <NavigationMenu
      aria-label={label}
      data-slot="mega-menu"
      value={value}
      onValueChange={(next: string | null) => {
        setValue(next);
        if (next !== null) setWide(entries[Number(next)]?.kind === "megaMenu");
      }}
      onFocus={closeWhenFocusMovesToAnotherItem}
      closeDelay={CLOSE_DELAY_MS}
      fullWidth={wide}
      // A mega menu spans the header's row, not only the navigation's column in it (SPEC §13, SBP
      // megamenu.md; PR 57 review). Outside a header, the menu's own width.
      fullWidthAnchor='[data-slot="header-row"]'
      // The wide panel has its own (it never flips or shifts); this one is the dropdown's.
      collisionAvoidance={DROPDOWN_COLLISION_AVOIDANCE}
      // The panel sits against the bar; a dropdown hangs a little below its trigger.
      sideOffset={wide ? 0 : 8}
      popupClassName={wide ? "rounded-t-none" : undefined}
      className={cn("max-w-none flex-wrap justify-start", className)}
    >
      {/* One list, so the arrow keys run across both halves of a split bar (PR 57 review). The
          centre is a list item but not a menu item: the arrows skip it, Tab stops on its
          link, and its auto margins push the halves to the two ends. */}
      <NavigationMenuList className="flex-wrap justify-start gap-x-1">
        {split === undefined ? (
          items(0, entries.length)
        ) : (
          <>
            {items(0, split)}
            {center === undefined ? null : (
              <li data-slot="mega-menu-center" className="mx-auto shrink-0">
                {center}
              </li>
            )}
            {items(split, entries.length)}
          </>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export { MegaMenuNav };
export type {
  MegaMenuColumnData,
  MegaMenuEntry,
  MegaMenuFeatureData,
  MegaMenuLink,
  MegaMenuNavProps,
};
