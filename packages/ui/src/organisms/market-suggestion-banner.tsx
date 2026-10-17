// Ours (T35, SETUP.md "Navigation and headers (T35)"; D44, D49). "Go to the X store, or stay": a
// strip that tells a visitor whose country has a store of its own (SPEC §7.3, the `markets`
// global's suggestion banner) and offers the link. It is per visitor (M3 decides it from the
// request's country), so a page passes it in a slot, as `suggestion`, and without one the banner
// draws nothing, not an empty strip, so a prerendered page that has no suggestion is the page every
// visitor gets (D44). A server component on purpose, as MarketSwitcher is: it writes the country
// names with `Intl` in the page's language (`countryName`), makes the sentence (the shop's own
// `suggestion.message`, or the copy's with the country and its currency) and renders the suggested
// country's flag with the Flag atom, then hands strings and the flag node to
// `MarketSuggestionBannerClient` (`market-suggestion-banner-client.tsx`), which only hides the
// strip. No flag's drawing is in a client chunk (D49). A suggestion that points at the country the
// page is already in draws nothing either: there is no other store to go to, and the contract
// refuses it, so this is a guard for a page that skipped the parse.
import type { Messages } from "@shopblok/i18n";
import { countryName, formatMessage } from "@shopblok/i18n/format";
import type { MarketSuggestion } from "@shopblok/registry/contracts";
import { Flag } from "@shopblok/ui/atoms/flag";
import { isFlagCode } from "@shopblok/ui/atoms/flag-code";
import { MarketSuggestionBannerClient } from "./market-suggestion-banner-client";

type MarketSuggestionBannerProps = {
  /** The visitor's suggestion (D44): without it the banner draws nothing. */
  suggestion?: MarketSuggestion;
  /** The wording, from the catalog's `organisms.marketSuggestionBanner`. */
  copy: Messages["organisms"]["marketSuggestionBanner"];
  /** The page's `<html lang>`: country names come from `Intl` in it. */
  locale: string;
  className?: string;
};

function MarketSuggestionBanner({
  suggestion,
  copy,
  locale,
  className,
}: MarketSuggestionBannerProps) {
  if (suggestion === undefined) return null;
  const { current, suggested } = suggestion;
  if (current.country === suggested.country) return null;
  const country = countryName(suggested.country, locale);
  const here = countryName(current.country, locale);
  return (
    <MarketSuggestionBannerClient
      region={copy.region}
      // A country the flag set lacks draws no flag: the sentence names it anyway.
      flag={
        isFlagCode(suggested.country) ? (
          <Flag code={suggested.country} label={country} />
        ) : undefined
      }
      message={
        suggestion.message ??
        formatMessage(copy.message, { country, currency: suggested.currencyCode }, locale)
      }
      go={{
        label: formatMessage(copy.go, { country }, locale),
        href: suggested.href,
        hrefLang: suggested.htmlLang,
      }}
      stay={formatMessage(copy.stay, { current: here }, locale)}
      className={className}
    />
  );
}

export { MarketSuggestionBanner };
export type { MarketSuggestionBannerProps };
