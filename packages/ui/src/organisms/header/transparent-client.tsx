// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). The transparent header's client
// part: the `<header>` element and the one thing it knows that a server cannot, whether it should
// look solid. It is solid once the page has scrolled (a header over a hero is transparent only at
// the top, where the picture is), and while a menu, a switcher or the drawer is open (a panel under
// a see-through bar would show the picture through its edge). `data-solid` says which, and the
// surface inside (`transparent.tsx`, drawn on the server) styles itself from it with
// `group-data-[solid=...]/header`. `solid` pins the look: `true` for a page with no hero under the
// header (and the design system's solid state), `false` for the picture of the transparent state.
// Both facts are read with `useSyncExternalStore`, as AnnouncementBar reads reduced motion: the
// server snapshot is "not scrolled, nothing open", so the server render and the first client render
// are the same markup (no hydration mismatch) and no state is set in an effect. The browser then
// reads the scroll position (a page reloaded halfway down is solid at once) and a MutationObserver
// on `aria-expanded` finds the open menus: the triggers of MegaMenu, the market switcher and the
// drawer all carry it, so this file needs no callback from any of them. The header has no height:
// the surface is laid over what follows it (the hero), so it takes no room in the page.
"use client";

import { cn } from "@shopblok/ui/lib/utils";
import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";

/** How far the page scrolls before the header turns solid, in CSS px: more than a bounce at the top. */
const SCROLL_THRESHOLD = 8;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const readScrolled = () => window.scrollY > SCROLL_THRESHOLD;
/** The server cannot know; the first client render agrees with it and React reads the position next. */
const notScrolled = () => false;
const nothingOpen = () => false;

/** Whether a control inside `header` has opened something (a panel, a popup, the sheet). */
function useAnythingOpen(header: HTMLElement | null): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (header === null) return () => {};
      const observer = new MutationObserver(onChange);
      observer.observe(header, {
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-expanded"],
      });
      return () => observer.disconnect();
    },
    [header],
  );
  const read = useCallback(
    () => header !== null && header.querySelector('[aria-expanded="true"]') !== null,
    [header],
  );
  return useSyncExternalStore(subscribe, read, nothingOpen);
}

type HeaderTransparentFrameProps = {
  /** `true`: solid whatever the page does. `false`: transparent whatever it does. Unset: follows the page. */
  solid?: boolean;
  sticky: boolean;
  className?: string;
  children: ReactNode;
};

function HeaderTransparentFrame({
  solid: pinned,
  sticky,
  className,
  children,
}: HeaderTransparentFrameProps) {
  // In state, not a ref: the observer needs the element once it exists, and a ref never re-renders.
  const [element, setElement] = useState<HTMLElement | null>(null);
  const scrolled = useSyncExternalStore(subscribeToScroll, readScrolled, notScrolled);
  const open = useAnythingOpen(element);
  const solid = pinned ?? (scrolled || open);
  return (
    <header
      ref={setElement}
      data-slot="header"
      data-variant="transparent"
      data-solid={solid ? "true" : "false"}
      className={cn(
        "group/header h-0 w-full z-(--z-header)",
        sticky ? "sticky top-0" : "relative",
        className,
      )}
    >
      {children}
    </header>
  );
}

export { HeaderTransparentFrame, SCROLL_THRESHOLD };
export type { HeaderTransparentFrameProps };
