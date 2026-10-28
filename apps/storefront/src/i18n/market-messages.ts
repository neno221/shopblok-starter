import "server-only";
import { catalogs, type Messages } from "@shopblok/i18n";
import { unstable_rethrow } from "next/navigation";
import { readUiStrings } from "../lib/cms/ui-strings";
import type { CurrentMarket } from "../lib/market-locale";
import { withOverrides, type UiStringOverrides } from "./messages";

/**
 * A market's messages (D77): the catalog of `market.locale` (`withLocale`'s one rule, English for a
 * language `@shopblok/i18n` has no catalog for) with the language's edited `ui-strings` over it.
 * next-intl's request config and every server action or route handler that draws copy outside it
 * (the cart drawer, the quick cart, the market banner, the listing's answers) read this, never
 * `catalogs[…]` itself, so an edit shows everywhere a page shows it (PR 93 review, item 1).
 */
export async function messagesFor(market: CurrentMarket): Promise<Messages> {
  return withOverrides(catalogs[market.locale], await editedStrings(market));
}

let failing = false;

/**
 * The market language's edited strings, or none. A read that fails (Payload's database down, with
 * nothing cached yet) must not take every page with it, so the code catalog stands in, with one
 * warning per outage. Next's own control-flow errors are rethrown.
 */
async function editedStrings(market: CurrentMarket): Promise<UiStringOverrides> {
  try {
    const overrides = (await readUiStrings({ market, draft: false })) ?? {};
    failing = false;
    return overrides;
  } catch (error) {
    unstable_rethrow(error);
    if (!failing) console.warn("ui-strings: the read failed, so pages show the code's copy", error);
    failing = true;
    return {};
  }
}
