"use client";

import { useEffect, useState, type ReactNode } from "react";

// A promo banner's end in the browser (T64): the server leaves out a banner whose offer had ended
// when the page was rendered, but a cached page can be served for minutes after that (`renderTime`),
// so the browser takes the banner away at its end by its own clock, as the hero's countdown counts
// by it. Until hydration, and without JavaScript, the server's answer stands.

/** setTimeout's longest delay; an end further off is checked at the next visit. */
const LONGEST = 2 ** 31 - 1;

export function OfferEnd({ endsAt, children }: { endsAt: string; children: ReactNode }) {
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const left = Date.parse(endsAt) - Date.now();
    if (Number.isNaN(left) || left > LONGEST) return;
    const timer = setTimeout(() => setEnded(true), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [endsAt]);
  return ended ? null : children;
}
