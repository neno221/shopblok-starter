"use client";

import { useEffect } from "react";
import { setVisitor, type Visitor } from "../../lib/visitor/store";

/**
 * D44 (T35): the design system's source for the visitor store, in place of M3's request. A header's
 * live render draws it beside the header, and it hands the fixtures' visitor to the store once the
 * page has hydrated, as M3's answer will arrive; until then the island draws the placeholder, as it
 * does on a prerendered page. It draws nothing. An effect, never the render: a render also runs on
 * the server, where the store is the process's.
 */
export function VisitorFixture({ cartCount }: Visitor) {
  useEffect(() => {
    setVisitor({ cartCount });
  }, [cartCount]);
  return null;
}
