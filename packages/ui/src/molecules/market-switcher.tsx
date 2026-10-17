// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"; D49). Country and language in one
// control (SPEC §8.4): a button that shows the market the page is in (its flag, country, language
// and currency code) and opens the list of the enabled markets, each country with its languages as
// links. A server component on purpose: it makes every word and every flag on the server (names with
// `Intl` in the page's language, each language in its own, and one `<Flag>` per country) and hands
// plain strings and the rendered flags to `MarketSwitcherOverlay`, the client part that opens, traps
// focus and closes. No flag's drawing is in a client chunk. The trigger's name says what the control
// is and what it holds ("Country and language: Cyprus, Ελληνικά, EUR"), so the visible words are in
// it (WCAG 2.5.3); each link is named by its language and its country, which the heading of its
// group would not say to a reader who tabs from link to link. The current language is marked by a
// check and inverted colours as well as `aria-current`. A popover from `md` up, a bottom sheet below
// it (SPEC §9.4); `form` draws one of them alone, for the design system's open states.
import { countryName, formatMessage, languageName } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { MarketChoice } from "@shopblok/registry/contracts";
import { Flag } from "@shopblok/ui/atoms/flag";
import type { FlagCode } from "@shopblok/ui/atoms/flag-code";
import { cn } from "@shopblok/ui/lib/utils";
import type * as React from "react";
import { MarketSwitcherOverlay } from "./market-switcher-client";

type MarketSwitcherForm =
  | {
      /** Both forms are drawn and CSS shows one per breakpoint: a popover from `md` up. */
      form?: "auto";
      defaultOpen?: never;
    }
  | {
      /** One form alone, whatever the width. */
      form: "popover" | "drawer";
      /** Drawn open at first render (the design system's states). */
      defaultOpen?: boolean;
    };

type MarketSwitcherProps = Omit<React.ComponentProps<"div">, "children"> &
  MarketChoice &
  MarketSwitcherForm & {
    /** The wording, from the catalog's `molecules.marketSwitcher`. */
    copy: Messages["molecules"]["marketSwitcher"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** `false` leaves the page behind reachable; the design system draws open states with it. */
    modal?: boolean;
    /** Classes for the popup (the popover's content, the sheet). */
    popupClassName?: string;
  };

/** `Intl` writes some languages' names in lower case ("français"); a name on its own starts in a capital. */
function capitalised(name: string, locale: string): string {
  const [first = "", ...rest] = name;
  return first.toLocaleUpperCase(locale) + rest.join("");
}

function MarketSwitcher({
  markets,
  copy,
  locale,
  form,
  defaultOpen,
  modal,
  popupClassName,
  className,
  ...props
}: MarketSwitcherProps) {
  const countries = markets.map((market) => {
    const name = countryName(market.country, locale);
    return {
      country: market.country,
      name,
      currency: market.currencyCode,
      // A code the flag set lacks draws an empty frame with the same name, so the row keeps its shape.
      flag: <Flag code={market.flagCode as FlagCode} label={name} />,
      languages: market.languages.map((language) => {
        const own = capitalised(
          languageName(language.language, language.htmlLang),
          language.htmlLang,
        );
        return {
          language: language.language,
          htmlLang: language.htmlLang,
          name: own,
          label: formatMessage(copy.option, { language: own, country: name }, locale),
          href: language.href,
          current: language.current,
        };
      }),
    };
  });
  const here =
    countries.find((country) => country.languages.some((language) => language.current)) ??
    countries[0];
  const language = here?.languages.find((each) => each.current) ?? here?.languages[0];
  if (here === undefined || language === undefined) return null;
  return (
    <div data-slot="market-switcher" className={cn("inline-flex max-w-full", className)} {...props}>
      <MarketSwitcherOverlay
        current={{
          flag: here.flag,
          country: here.name,
          language: language.name,
          htmlLang: language.htmlLang,
          currency: here.currency,
        }}
        triggerLabel={formatMessage(
          copy.trigger,
          { country: here.name, language: language.name, currency: here.currency },
          locale,
        )}
        title={copy.title}
        description={copy.description}
        closeLabel={copy.close}
        listLabel={copy.list}
        countries={countries}
        form={form}
        defaultOpen={defaultOpen}
        modal={modal}
        popupClassName={popupClassName}
      />
    </div>
  );
}

export { MarketSwitcher };
export type { MarketSwitcherProps };
