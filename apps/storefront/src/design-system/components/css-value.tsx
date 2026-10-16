"use client";

import { useCallback, useState } from "react";

/**
 * The resolved value of a CSS custom property, read in the browser. The server renders nothing
 * (it has no styles to read), and the client reads the value once, after it has hydrated. For the
 * tokens that `@shopblok/ui/tokens` does not list (motion, container widths, weights): the page
 * shows the value the stylesheet really applies instead of a copy of it. One read per mount, so
 * a render never forces a style recalculation; a stylesheet that hot-reloads in `next dev` shows
 * its new value on the next page load.
 */
export function CssValue({ name }: { name: `--${string}` }) {
  const [value, setValue] = useState("");
  // A ref callback runs once when the span mounts (and again only if `name` changes): the read
  // happens there, not in a render and not in an effect body.
  const read = useCallback(
    (element: HTMLSpanElement | null) => {
      if (element === null) return;
      setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    },
    [name],
  );
  return <span ref={read}>{value === "" ? "…" : value}</span>;
}
