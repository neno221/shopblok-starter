"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useRef, useState } from "react";

/** How long the form may take to draw the field a link names (its blocks open after hydration). */
const WAIT_MS = 3_000;

/**
 * The status's links open the language's form at `#field-<path>` (D107). The form draws after the
 * page loads, so the browser's own jump to the anchor finds nothing: this looks for the field until
 * it is there, then scrolls it into view and focuses it.
 */
export function FocusLinkedField() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("field-")) return;
    const started = performance.now();
    let frame = 0;
    const look = () => {
      const target = document.getElementById(id);
      if (target !== null) {
        target.scrollIntoView({ block: "center" });
        target.focus({ preventScroll: true });
        return;
      }
      if (performance.now() - started < WAIT_MS) frame = requestAnimationFrame(look);
    };
    frame = requestAnimationFrame(look);
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}

/**
 * The count is the one the form opened with (D107: computed when it opens). After a save or an
 * autosave this says so, with a link that opens the form again with a new count.
 */
export function CountedWhenOpened() {
  const { lastUpdateTime } = useDocumentInfo();
  const opened = useRef(lastUpdateTime);
  // The form's own address, without a link's `#field-…`: set once the document has been saved.
  const [again, setAgain] = useState<string | null>(null);
  useEffect(() => {
    if (lastUpdateTime !== opened.current)
      setAgain(window.location.pathname + window.location.search);
  }, [lastUpdateTime]);
  // The live region is there from the start, so the line is announced when it appears.
  return (
    <div role="status">
      {again === null ? null : (
        <p className="translation-status__note">
          Saved since this count. <a href={again}>Count again</a>
        </p>
      )}
    </div>
  );
}
