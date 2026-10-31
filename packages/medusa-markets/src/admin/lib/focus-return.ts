import { useEffect, useRef } from "react";

/**
 * Gives focus back to the button that opened a drawer once the drawer is closed (WCAG 2.4.3). The
 * panels mount their drawer only while it is open, so Radix has no trigger to return focus to and
 * focus would fall to the page. `remember(button)` is called when the button is pressed; the focus
 * moves back when `open` turns false and `busy` is false (a save reads the markets again, and the
 * edit buttons are disabled meanwhile, so the focus waits for them).
 */
export function useFocusReturn(open: boolean, busy: boolean): (opener: HTMLElement) => void {
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open || busy || opener.current === null) return;
    opener.current.focus();
    opener.current = null;
  }, [open, busy]);
  return (button) => {
    opener.current = button;
  };
}
