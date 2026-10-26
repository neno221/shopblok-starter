// D66 (T48): the market suggestion banner as a browser island. A prerendered page holds no banner
// (D44). Once the visitor store has a suggestion (`/next/visitor`), this asks the shell's action to
// render MarketSuggestionBanner on the server and draws what it answers; the store's suggestion is
// only the signal, the action works it out again from the request. "Stay" hides the banner (the
// organism's own) and records the choice (`market-choice-island.tsx`). The layout also draws the
// server organism with no suggestion, which draws nothing: an action's answer can only use a client
// component the page's own server tree imports ("Could not find the module … in the React Client
// Manifest" otherwise), and that puts the banner's client part there.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { renderSuggestionBanner } from "../../lib/actions/shell";
import { useVisitor } from "../../lib/visitor/use-visitor";

export function SuggestionBannerIsland({ market }: { market: string }) {
  const visitor = useVisitor();
  const wanted = visitor !== "unknown" && visitor.suggestion !== null;
  const [banner, setBanner] = useState<ReactNode>(null);
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    renderSuggestionBanner(market, window.location.pathname).then(
      (node) => {
        if (live) setBanner(node);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [market, wanted]);
  return wanted ? banner : null;
}
