// M6 D124 (T97): a shop event sent when a page is seen (`cart_viewed`, `checkout_started`,
// `search_performed`), from a page the server draws. It draws nothing; `track()` decides whether
// anything is sent (a key in the build, the visitor's consent). `once` sends it once per tab for
// that key (`sessionStorage`), so a checkout started is one event however often its first step is
// shown again (marked only once it is sent, with consent). Sent once per mount: the cart page's
// edits come back to the same page (a soft navigation) with new properties, which are no new view
// (PR 138 review); a page whose view changes with its content (a new search) gives it a `key`.
"use client";

import { useEffect, useState } from "react";
import { readConsentCookie } from "../visitor/consent-cookie";
import { track, type EventProperties, type ShopEvent } from "./track";

export type TrackOnViewProps = {
  event: ShopEvent;
  properties?: EventProperties;
  /** Sent once per tab for this key. */
  once?: string;
};

const ONCE_PREFIX = "shopblok:tracked:";

/** Whether `key` was sent in this tab already; marks it sent. Storage that fails counts as not. */
function sentBefore(key: string): boolean {
  try {
    if (window.sessionStorage.getItem(ONCE_PREFIX + key) !== null) return true;
    window.sessionStorage.setItem(ONCE_PREFIX + key, "1");
  } catch {
    // No storage (a private window that refuses it): sent each time.
  }
  return false;
}

export function TrackOnView({ event, properties = {}, once }: TrackOnViewProps) {
  // The view's properties as the page was first drawn: later ones are the same view's.
  const [shown] = useState(properties);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    // Marked sent only when it is: a view before consent does not use up the once.
    if (readConsentCookie()?.analytics !== true) return;
    if (once !== undefined && sentBefore(`${event}:${once}`)) return;
    track(event, { ...shown });
  }, [event, once, shown]);
  return null;
}
