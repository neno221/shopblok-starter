// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). MobileNavDrawer's client part: the
// menu button and the sheet it opens from the start side, on the sheet primitive (Base UI's Dialog),
// with the levels inside. A client component because the open sheet, the level and where focus goes
// are state. It takes everything made, as MarketSwitcher's overlay does (D49): the words the server
// formatted ("Back to Menu", "Shop all Women"), the items as plain data, and the market switcher as
// a node the server rendered, so the flags stay out of the client chunk and this file imports no
// formatter, no catalog and no flag (a test reads its imports).
// The first level lists the items: a link goes to its page, a dropdown or a mega menu is a button
// that replaces the list with that item's level. A level is a back button named for the level it
// returns to, the item's label as a heading, "Shop all …" when the label goes somewhere, and the links
// (a mega menu's columns as groups, its featured tiles as links after them). When a level opens, focus
// goes to its heading (a screen reader says where it is); going back puts it on the button that
// opened the level. Both are done in an effect after the render that changed the level, and only
// after a reader moved: a level drawn at first render (`defaultLevel`) takes no focus. The sheet
// reopens at the first level. The foot (the account links and the market switcher) belongs to the
// first level, so a level has the whole height of a short phone for its links. The close button is the
// first control in the sheet, in the flow, not the primitive's corner button, which comes last in the
// order; so focus starts on it and Shift+Tab from the first control goes round to the last. A link
// closes the sheet: the header lives across page changes, so the sheet would stay open over the new
// page. A sheet drawn open at first render (`defaultOpen`, the design system's states) takes no focus
// until a reader opens it again, because several open states on one page would take it from each
// other. Nothing slides under `prefers-reduced-motion`.
"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@shopblok/ui/primitives/sheet";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon, XIcon } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type DrawerLink = { label: string; href: string };

type DrawerGroup = {
  /** A mega menu's column title; a dropdown's links have none. */
  title?: string;
  /** "Shop all Clothing": there when the column goes somewhere. */
  shopAll?: DrawerLink;
  links: DrawerLink[];
};

/** What the server made of a `NavItem`: plain data, with every word formatted. */
type DrawerEntry =
  | ({ kind: "link" } & DrawerLink)
  | {
      kind: "level";
      label: string;
      /** "Shop all Women": there when the label goes somewhere too. */
      shopAll?: DrawerLink;
      groups: DrawerGroup[];
      /** A mega menu's featured tiles, as links. */
      featured: DrawerLink[];
    };

type MobileNavDrawerClientProps = {
  entries: DrawerEntry[];
  account: DrawerLink[];
  /** The market switcher the server rendered (its flags are drawn there); the foot holds it. */
  marketSwitcher?: ReactNode;
  copy: {
    /** The menu button's name. */
    open: string;
    /** The sheet's title, and the first level's name. */
    title: string;
    close: string;
    /** The back button's name, "Back to Menu": the level it returns to is the first one. */
    back: string;
    /** The account links' group name. */
    account: string;
  };
  prefetch?: boolean | null;
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  /** The index in `entries` of the level drawn first. */
  defaultLevel?: number;
  triggerClassName?: string;
  popupClassName?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; the hrefs here are
// strings the app built (the same cast as CartButton's).
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** A row of the sheet: 44 px tall, its text wraps (`wrap-anywhere`) and never leaves the row. */
const rowClass =
  "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-base font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

function Row({
  link,
  prefetch,
  onNavigate,
  className,
}: {
  link: DrawerLink;
  prefetch?: boolean | null;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <NextLink
      href={link.href as LinkHref}
      prefetch={prefetch}
      onClick={onNavigate}
      className={cn(rowClass, className)}
    >
      <span className="min-w-0 wrap-anywhere">{link.label}</span>
    </NextLink>
  );
}

function Links({
  links,
  prefetch,
  onNavigate,
  className,
  rowClassName,
}: {
  links: DrawerLink[];
  prefetch?: boolean | null;
  onNavigate: () => void;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <Row link={link} prefetch={prefetch} onNavigate={onNavigate} className={rowClassName} />
        </li>
      ))}
    </ul>
  );
}

function Group({
  group,
  prefetch,
  onNavigate,
}: {
  group: DrawerGroup;
  prefetch?: boolean | null;
  onNavigate: () => void;
}) {
  const titleId = useId();
  const links = group.shopAll === undefined ? group.links : [group.shopAll, ...group.links];
  if (group.title === undefined) {
    return <Links links={links} prefetch={prefetch} onNavigate={onNavigate} />;
  }
  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col pt-2">
      <p id={titleId} className="px-3 py-1 text-sm font-semibold text-foreground wrap-anywhere">
        {group.title}
      </p>
      <Links links={links} prefetch={prefetch} onNavigate={onNavigate} />
    </div>
  );
}

function MobileNavDrawerClient({
  entries,
  account,
  marketSwitcher,
  copy,
  prefetch,
  defaultOpen,
  modal,
  defaultLevel,
  triggerClassName,
  popupClassName,
}: MobileNavDrawerClientProps) {
  const [open, setOpen] = useState(defaultOpen === true);
  const [level, setLevel] = useState<number | null>(
    defaultLevel !== undefined && entries[defaultLevel]?.kind === "level" ? defaultLevel : null,
  );
  const accountId = useId();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const openers = useRef(new Map<number, HTMLButtonElement>());
  // Where focus goes after the next change of level; empty at first render and after a reopening.
  const moved = useRef<{ to: "heading" } | { to: "opener"; index: number } | null>(null);

  useEffect(() => {
    const target = moved.current;
    moved.current = null;
    if (target === null) return;
    if (bodyRef.current !== null) bodyRef.current.scrollTop = 0;
    if (target.to === "heading") headingRef.current?.focus();
    else openers.current.get(target.index)?.focus();
  }, [level]);

  const close = () => setOpen(false);
  const entry = level === null ? undefined : entries[level];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // A reader who opens the sheet again starts at the first level.
        if (next) setLevel(null);
      }}
      modal={modal ?? true}
    >
      <SheetTrigger
        data-slot="mobile-nav-trigger"
        render={<Button variant="ghost" size="icon" className={triggerClassName} />}
      >
        <Icon icon={MenuIcon} size="md" />
        <span className="sr-only">{copy.open}</span>
      </SheetTrigger>
      <SheetContent
        side="inline-start"
        showCloseButton={false}
        data-slot="mobile-nav-drawer"
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        className={cn("gap-0 motion-reduce:transition-none", popupClassName)}
      >
        <div
          data-slot="mobile-nav-header"
          className="flex shrink-0 items-center justify-between gap-2 border-b py-2 ps-4 pe-2"
        >
          <SheetTitle className="min-w-0 text-base wrap-anywhere">{copy.title}</SheetTitle>
          <SheetClose
            data-slot="mobile-nav-close"
            render={<Button variant="ghost" size="icon" className="shrink-0" />}
          >
            <Icon icon={XIcon} />
            <span className="sr-only">{copy.close}</span>
          </SheetClose>
        </div>
        <div
          ref={bodyRef}
          data-slot="mobile-nav-body"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          {entry === undefined || entry.kind !== "level" ? (
            <>
              <nav aria-label={copy.title} className="p-2">
                <ul className="flex flex-col">
                  {entries.map((each, index) => (
                    <li key={`${each.kind}-${each.label}-${index}`}>
                      {each.kind === "link" ? (
                        <Row link={each} prefetch={prefetch} onNavigate={close} />
                      ) : (
                        <button
                          type="button"
                          ref={(element) => {
                            if (element === null) openers.current.delete(index);
                            else openers.current.set(index, element);
                          }}
                          onClick={() => {
                            moved.current = { to: "heading" };
                            setLevel(index);
                          }}
                          className={rowClass}
                        >
                          <span className="min-w-0 wrap-anywhere">{each.label}</span>
                          <Icon icon={ChevronRightIcon} className="rtl:rotate-180" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
              <div data-slot="mobile-nav-foot" className="mt-auto flex flex-col gap-4 border-t p-4">
                {account.length === 0 ? null : (
                  <nav aria-labelledby={accountId} className="flex flex-col gap-1">
                    <p
                      id={accountId}
                      className="text-sm font-semibold text-foreground wrap-anywhere"
                    >
                      {copy.account}
                    </p>
                    <Links
                      links={account}
                      prefetch={prefetch}
                      onNavigate={close}
                      className="-mx-3"
                    />
                  </nav>
                )}
                {marketSwitcher}
              </div>
            </>
          ) : (
            <div data-slot="mobile-nav-level" className="flex flex-col gap-1 p-2">
              <Button
                type="button"
                variant="ghost"
                data-slot="mobile-nav-back"
                onClick={() => {
                  if (level !== null) moved.current = { to: "opener", index: level };
                  setLevel(null);
                }}
                className="h-auto justify-start gap-2 py-2 text-start"
              >
                <Icon icon={ChevronLeftIcon} className="rtl:rotate-180" />
                <span className="min-w-0 wrap-anywhere">{copy.back}</span>
              </Button>
              <h3
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                className="rounded-sm px-3 py-2 text-lg font-semibold text-foreground outline-none wrap-anywhere focus-visible:ring-3 focus-visible:ring-ring"
              >
                {entry.label}
              </h3>
              <nav aria-labelledby={headingId} className="flex flex-col">
                {entry.shopAll === undefined ? null : (
                  <Links
                    links={[entry.shopAll]}
                    prefetch={prefetch}
                    onNavigate={close}
                    rowClassName="font-semibold"
                  />
                )}
                {entry.groups.map((group, index) => (
                  <Group
                    key={`${group.title ?? "links"}-${index}`}
                    group={group}
                    prefetch={prefetch}
                    onNavigate={close}
                  />
                ))}
                {entry.featured.length === 0 ? null : (
                  <Links
                    links={entry.featured}
                    prefetch={prefetch}
                    onNavigate={close}
                    className="mt-2 border-t pt-2"
                  />
                )}
              </nav>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { MobileNavDrawerClient };
export type { DrawerEntry, DrawerGroup, DrawerLink, MobileNavDrawerClientProps };
