// D66 (T48): the visitor's explicit choice of market. MarketSwitcher's options are links (they work
// without scripts and are hreflang's targets) and the suggestion banner's "go" is one too; neither
// organism takes a handler, and they are server components (D49). So this island listens to the
// page's clicks (one listener on the document, which also sees the switcher's popup, a portal) and,
// for a plain click on one of those links, calls `rememberMarket`, which writes `_shopblok_market`,
// before it follows the link. "Stay" on the banner records the market the visitor is on.
//
// The layout draws the switcher once for every page under it and knows no page's path, so an option
// links to its market's home; a click goes to the same page there instead: the path inside a market
// is the same in every market (SPEC §8.5), so it is the current path without this market's prefix,
// after the other market's. Without scripts the link goes to that market's home.
"use client";

import { useEffect } from "react";
import { rememberMarket } from "../../lib/actions/market";
import { getSnapshot } from "../../lib/visitor/store";

export type MarketChoiceIslandProps = {
  /** The market the page is in: its key and its home's URL. */
  current: { key: string; home: string };
  /** Every switcher option: its market's key and its home's URL, as the option links to it. */
  markets: readonly { key: string; home: string }[];
  /** Follows a link; `window.location.assign` unless a test gives another. */
  navigate?: (url: string) => void;
};

/** The same page in another market: the current path inside its market, after `home`. */
export function samePageIn(home: string, current: string, location: Location | URL): string {
  const base = location.origin;
  const prefix = new URL(current, base).pathname.replace(/\/$/, "");
  const { pathname } = location;
  const inside =
    pathname === prefix || pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : "";
  const target = new URL(home, base);
  const root = target.pathname.replace(/\/$/, "");
  const path = inside === "" || inside === "/" ? "" : inside;
  target.pathname = `${root}${path}` === "" ? "/" : `${root}${path}`;
  target.search = location.search;
  return target.origin === base ? `${target.pathname}${target.search}` : target.href;
}

const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function MarketChoiceIsland({ current, markets, navigate }: MarketChoiceIslandProps) {
  useEffect(() => {
    const go = navigate ?? ((url: string) => window.location.assign(url));
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>(
        '[data-slot="market-switcher-link"], [data-slot="market-suggestion-go"], [data-slot="market-suggestion-stay"]',
      );
      if (control === null) return;
      const slot = control.dataset["slot"];
      if (slot === "market-suggestion-stay") {
        void rememberMarket({ market: current.key }).catch(() => undefined);
        return;
      }
      if (!plainClick(event) || !(control instanceof HTMLAnchorElement)) return;
      const href = control.getAttribute("href") ?? "";
      let key: string | undefined;
      let destination = href;
      if (slot === "market-switcher-link") {
        key = markets.find((market) => market.home === href)?.key;
        if (key !== undefined) destination = samePageIn(href, current.home, window.location);
      } else {
        const visitor = getSnapshot();
        key = visitor === "unknown" ? undefined : visitor.suggestion?.market;
      }
      if (key === undefined) return;
      event.preventDefault();
      const chosen = key;
      void rememberMarket({ market: chosen })
        .catch(() => undefined)
        .then(() => go(destination));
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [current, markets, navigate]);
  return null;
}
