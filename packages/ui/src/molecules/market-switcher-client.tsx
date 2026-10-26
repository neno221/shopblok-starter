// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). MarketSwitcher's overlay, its one
// client part: a client component because Base UI's Popover and Drawer keep the open state, trap
// focus and give it back. It takes everything made: strings the server formatted (the names, the
// trigger's label, the catalog's words) and each flag as a node the server rendered, so this file
// imports neither the i18n formatters nor `atoms/flag.tsx` nor `country-flag-icons`, and no flag's
// drawing reaches a client chunk (D49; a test reads this file's imports). From `md` up the overlay
// is a popover, below it a bottom sheet (SPEC §9.4): both triggers are in the markup and CSS hides
// one per breakpoint (`max-md:hidden`, `md:hidden`), so the server and the browser agree on first
// render, with no `matchMedia`. `form` draws one alone, which the design system uses to show each
// form open at any width. Both forms trap focus (the sheet is modal; the popover is `trap-focus`,
// which keeps the page behind it scrollable and clickable), close on Escape with focus back on the
// trigger, and have a visible close button: Base UI's popover only traps focus when a `Close` part
// is inside it, and a sheet's only other way out is a swipe. Each language is a plain link: a new
// market reloads the page anyway. A popup drawn open at first render (`defaultOpen`, the design
// system's states) takes no focus until a reader opens it again: the page has only loaded, and
// several drawn open on one page would take focus from each other and close (Base UI closes a
// popup that focus leaves).
"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@shopblok/ui/primitives/drawer";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@shopblok/ui/primitives/popover";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

type MarketSwitcherLanguage = {
  /** ISO 639-1, as the contract has it. */
  language: string;
  /** The market's `<html lang>`: the language of `name`, and the link's `hreflang`. */
  htmlLang: string;
  /** The language in its own words ("Ελληνικά"). */
  name: string;
  /** The link's accessible name: the language, then its country. */
  label: string;
  href: string;
  current: boolean;
};

type MarketSwitcherCountry = {
  /** ISO 3166-1 alpha-2: the key. */
  country: string;
  /** In the page's language. */
  name: string;
  currency: string;
  /** The server-rendered flag, named by `name`. */
  flag: ReactNode;
  languages: MarketSwitcherLanguage[];
};

type MarketSwitcherClientProps = {
  /** What the trigger shows: the market the page is in. */
  current: {
    flag: ReactNode;
    country: string;
    language: string;
    htmlLang: string;
    currency: string;
  };
  /** The trigger's accessible name ("Country and language: Cyprus, Ελληνικά, EUR"). */
  triggerLabel: string;
  title: string;
  description: string;
  closeLabel: string;
  /** The list of countries' name. */
  listLabel: string;
  countries: MarketSwitcherCountry[];
  /** `auto`: both triggers, one shown per breakpoint. `popover` or `drawer`: that form alone. */
  form?: "auto" | "popover" | "drawer";
  /** Opens at first render; only with a `form`, because `auto` would open two popups. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  /** Classes for the popup (the popover's content, the sheet). */
  popupClassName?: string;
};

const triggerClass = "h-auto min-w-0 max-w-full justify-between gap-2 py-2 text-start";
const listMaxHeight = "max-h-[min(26rem,calc(100dvh-16rem))]";

function TriggerFace({ current }: { current: MarketSwitcherClientProps["current"] }) {
  return (
    <>
      <span aria-hidden="true" className="shrink-0">
        {current.flag}
      </span>
      <span className="min-w-0 text-start wrap-anywhere">
        <span className="font-medium">{current.country}</span>
        <span aria-hidden="true"> · </span>
        <span lang={current.htmlLang}>{current.language}</span>
        <span aria-hidden="true"> · </span>
        <span>{current.currency}</span>
      </span>
      <Icon icon={ChevronDownIcon} className="shrink-0" />
    </>
  );
}

/** Every country with its flag and its languages, each language a link; the current one is marked. */
function Countries({
  countries,
  listLabel,
}: Pick<MarketSwitcherClientProps, "countries" | "listLabel">) {
  const id = useId();
  return (
    <ul
      aria-label={listLabel}
      data-slot="market-switcher-list"
      className={cn(
        "m-0 flex min-h-0 list-none flex-col gap-4 overflow-y-auto overscroll-contain p-1",
        listMaxHeight,
      )}
    >
      {countries.map((country) => {
        const nameId = `${id}-${country.country}`;
        return (
          <li key={country.country} data-country={country.country} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="shrink-0">
                {country.flag}
              </span>
              <span id={nameId} className="min-w-0 flex-1 font-medium wrap-anywhere">
                {country.name}
              </span>
              <span className="shrink-0 text-muted-foreground">{country.currency}</span>
            </div>
            <ul aria-labelledby={nameId} className="m-0 flex list-none flex-wrap gap-2 p-0">
              {country.languages.map((language) => (
                <li key={language.language} className="max-w-full">
                  <a
                    href={language.href}
                    hrefLang={language.htmlLang}
                    aria-label={language.label}
                    aria-current={language.current ? "true" : undefined}
                    data-slot="market-switcher-link"
                    className={cn(
                      buttonVariants({ variant: language.current ? "default" : "outline" }),
                      "max-w-full wrap-anywhere",
                    )}
                  >
                    {language.current ? <Icon icon={CheckIcon} data-icon="inline-start" /> : null}
                    <span lang={language.htmlLang}>{language.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function MarketPopover({
  triggerClassName,
  ...props
}: MarketSwitcherClientProps & { triggerClassName?: string }) {
  return (
    <Popover defaultOpen={props.defaultOpen} modal={props.modal === false ? false : "trap-focus"}>
      <PopoverTrigger
        data-slot="market-switcher-trigger"
        aria-label={props.triggerLabel}
        render={<Button variant="outline" className={cn(triggerClass, triggerClassName)} />}
      >
        <TriggerFace current={props.current} />
      </PopoverTrigger>
      <PopoverContent
        data-slot="market-switcher-popup"
        initialFocus={props.defaultOpen ? takesFocusWhenOpenedByAReader : undefined}
        align="start"
        className={cn(
          "w-[min(26rem,calc(100vw-2rem))] max-w-(--available-width)",
          props.popupClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <PopoverTitle>{props.title}</PopoverTitle>
            <PopoverDescription>{props.description}</PopoverDescription>
          </div>
          <PopoverPrimitive.Close
            aria-label={props.closeLabel}
            render={<Button variant="ghost" size="icon" className="shrink-0" />}
          >
            <XIcon aria-hidden="true" />
          </PopoverPrimitive.Close>
        </div>
        <Countries countries={props.countries} listLabel={props.listLabel} />
      </PopoverContent>
    </Popover>
  );
}

function MarketSheet({
  triggerClassName,
  ...props
}: MarketSwitcherClientProps & { triggerClassName?: string }) {
  return (
    <Drawer defaultOpen={props.defaultOpen} modal={props.modal ?? true} showSwipeHandle>
      <DrawerTrigger
        data-slot="market-switcher-trigger"
        aria-label={props.triggerLabel}
        render={<Button variant="outline" className={cn(triggerClass, triggerClassName)} />}
      >
        <TriggerFace current={props.current} />
      </DrawerTrigger>
      <DrawerContent
        data-slot="market-switcher-popup"
        initialFocus={props.defaultOpen ? takesFocusWhenOpenedByAReader : undefined}
        className={props.popupClassName}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <DrawerTitle>{props.title}</DrawerTitle>
              <DrawerDescription className="text-start">{props.description}</DrawerDescription>
            </div>
            <DrawerClose
              aria-label={props.closeLabel}
              render={<Button variant="ghost" size="icon" className="shrink-0" />}
            >
              <XIcon aria-hidden="true" />
            </DrawerClose>
          </div>
          <Countries countries={props.countries} listLabel={props.listLabel} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MarketSwitcherOverlay({ form = "auto", ...props }: MarketSwitcherClientProps) {
  // `auto` draws both, so it never opens either at first render: two popups would open at once.
  const shared = { ...props, defaultOpen: form === "auto" ? undefined : props.defaultOpen };
  return (
    <>
      {form === "drawer" ? null : (
        <MarketPopover
          {...shared}
          triggerClassName={form === "auto" ? "max-md:hidden" : undefined}
        />
      )}
      {form === "popover" ? null : (
        <MarketSheet {...shared} triggerClassName={form === "auto" ? "md:hidden" : undefined} />
      )}
    </>
  );
}

export { MarketSwitcherOverlay };
export type { MarketSwitcherClientProps, MarketSwitcherCountry, MarketSwitcherLanguage };
