// D66 (T48): the market suggestion banner as a browser island. A prerendered page holds no banner
// (D44). Once the visitor store has a suggestion (`/next/visitor`), this asks the shell's action to
// render MarketSuggestionBanner on the server and draws what it answers; the island hands it the
// suggested market's key, which the action checks and draws from the market map. "Stay" hides the banner (the
// organism's own) and records the choice (`market-choice-island.tsx`). The layout also draws the
// server organism with no suggestion, which draws nothing: an action's answer can only use a client
// component the page's own server tree imports ("Could not find the module … in the React Client
// Manifest" otherwise), and that puts the banner's client part there.
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { renderSuggestionBanner } from "../../lib/actions/shell";
import { useVisitor } from "../../lib/visitor/use-visitor";

export function SuggestionBannerIsland({ market }: { market: string }) {
  const visitor = useVisitor();
  const suggested = visitor === "unknown" ? undefined : visitor.suggestion?.market;
  // The page's path, which changes on a soft navigation while the layout stays (PR 75 review, item
  // 2): the banner's "go" leads to the same page in the other market.
  const path = usePathname();
  const [banner, setBanner] = useState<ReactNode>(null);
  useEffect(() => {
    if (suggested === undefined) return;
    let live = true;
    renderSuggestionBanner(market, suggested, path).then(
      (node) => {
        if (live) setBanner(node);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [market, path, suggested]);
  return suggested === undefined ? null : banner;
}
