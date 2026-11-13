// D60 (T47): the island that runs `loadVisitor` once after hydration. The `[market]` layout draws
// it (T48) beside the header; it draws nothing. An effect, never the render, which also runs on the
// server, where the store is the process's (D44).
//
// M6 D124 (T97, PR 138 review): the sign-in, registration and sign-out forms end in a redirect, a
// soft navigation inside this layout, so this island stays and would not ask again. With a PostHog
// key, those actions leave a mark (`VISITOR_CHANGED_COOKIE`): on the next page the island removes it
// and asks again, so the store learns the customer (PostHog identifies them, or starts a new visitor
// after a sign-out), and sends `signed_up` after a registration.
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { takeMark, trackSignedUp } from "../analytics/events";
import { VISITOR_CHANGED_COOKIE } from "../cookie-names";
import { loadVisitor } from "./source";

export function VisitorSource({ market }: { market: string }) {
  const pathname = usePathname();
  const asked = useRef<string | null>(null);
  useEffect(() => {
    const changed = process.env.NEXT_PUBLIC_POSTHOG_KEY ? takeMark(VISITOR_CHANGED_COOKIE) : false;
    if (asked.current === market && !changed) return;
    asked.current = market;
    const asking = loadVisitor(market, window.location.pathname);
    // After the store has the customer, so PostHog has identified them first.
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) void asking.then(trackSignedUp);
  }, [market, pathname]);
  return null;
}
