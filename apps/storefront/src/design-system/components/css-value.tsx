"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The resolved value of a CSS custom property, read in the browser. The server renders nothing
 * (it has no styles to read), and the client fills it in once it has hydrated. For the tokens that
 * `@shopblok/ui/tokens` does not list (motion, container widths, weights): the page shows the value
 * the stylesheet really applies instead of a copy of it.
 */
export function CssValue({ name }: { name: `--${string}` }) {
  const value = useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => "",
  );
  return <span>{value === "" ? "…" : value}</span>;
}
