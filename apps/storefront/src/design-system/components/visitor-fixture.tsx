"use client";

import { useEffect } from "react";
import { setVisitor, type Visitor } from "../../lib/visitor/store";

/**
 * D44 (T35): the design system's source for the visitor store, in place of M3's request. A header's
 * live render draws it beside the header, and it hands the fixtures' visitor to the store once the
 * page has hydrated, as M3's answer will arrive; until then the island draws the placeholder, as it
 * does on a prerendered page. It draws nothing. An effect, never the render: a render also runs on
 * the server, where the store is the process's. A visitor with an empty cart who has not chosen
 * about cookies unless told otherwise (T36): a header's page names the count, cookie consent's the
 * choice. The effect depends on the choice's two values, not on the object, so a parent's new
 * render with the same choice does not hand it to the store again and undo what the visitor chose.
 */
export function VisitorFixture({ cartCount = 0, consent = null }: Partial<Visitor>) {
  const analytics = consent?.analytics;
  const marketing = consent?.marketing;
  useEffect(() => {
    setVisitor({
      cartCount,
      consent: analytics === undefined || marketing === undefined ? null : { analytics, marketing },
    });
  }, [cartCount, analytics, marketing]);
  return null;
}
