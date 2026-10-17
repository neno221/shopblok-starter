// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"): the part of CopyCodeChip that
// acts, split out so that only this reaches the browser (CopyCodeChip formats the button's name on
// the server and passes every string in, so no message formatter ships here). A client component,
// because it writes to the clipboard and keeps what happened. The code is drawn in monospace, can
// be selected with one tap or click (`select-all`) and wraps, never truncated, so a long code is
// all there. The button says "Copy" and is named "Copy code SUMMER20" (its visible word is in its
// name, WCAG 2.5.3) and does not change its name when it works: a name that changes under a focused
// button is read out again. What happened is a `role="status"` line that is always in the page and
// keeps its height, so "Copied" is announced politely (WCAG 4.1.3) and nothing moves when it
// appears or goes: it shows for two seconds, and the icon on the button turns into a check for the
// same time. When the clipboard is missing (`navigator.clipboard` is undefined, as on a page that is
// not secure) or refuses (a rejected promise, a permission policy), the code's text is selected for
// the reader to copy, and the line says so and stays until the next press.
"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";

type CopyStatus = "idle" | "copied" | "failed";

/** How long "Copied" stays, in milliseconds. */
const COPIED_MS = 2000;

type CopyCodeControlProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The code: what is copied and what is shown. */
  code: string;
  /** The button's accessible name ("Copy code SUMMER20"). */
  label: string;
  /** The button's visible word ("Copy"). */
  copyText: string;
  /** Said when the code is on the clipboard ("Copied"). */
  copiedText: string;
  /** Said when the clipboard is not available and the code is selected instead. */
  fallbackText: string;
  /** Where it starts: the design system draws the states a press leads to. */
  initialStatus?: CopyStatus;
};

function CopyCodeControl({
  code,
  label,
  copyText,
  copiedText,
  fallbackText,
  initialStatus = "idle",
  className,
  ...props
}: CopyCodeControlProps) {
  const [status, setStatus] = useState<CopyStatus>(initialStatus);
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  /** Selects the code's text, for a reader whose clipboard we cannot reach. */
  function selectCode() {
    const element = codeRef.current;
    const selection = window.getSelection();
    if (element === null || selection === null) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function copy() {
    clearTimeout(timer.current);
    try {
      // `navigator.clipboard` is undefined outside a secure context: the call then throws here.
      await navigator.clipboard.writeText(code);
    } catch {
      selectCode();
      setStatus("failed");
      return;
    }
    setStatus("copied");
    timer.current = setTimeout(() => setStatus("idle"), COPIED_MS);
  }

  return (
    <div
      data-slot="copy-code-chip"
      data-status={status}
      className={cn("flex w-fit max-w-full min-w-0 flex-col", className)}
      {...props}
    >
      <div className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-lg border border-dashed border-input bg-background p-1 ps-3">
        <code
          ref={codeRef}
          data-slot="copy-code-chip-code"
          className="min-w-0 py-2 font-mono text-sm leading-snug font-semibold tracking-wide wrap-anywhere select-all"
        >
          {code}
        </code>
        <Button
          type="button"
          variant="secondary"
          aria-label={label}
          onClick={copy}
          className="shrink-0"
        >
          {status === "copied" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          {copyText}
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-slot="copy-code-chip-status"
        className="mt-1.5 flex min-h-5 items-start gap-1.5 text-sm leading-5"
      >
        {status === "copied" ? (
          <>
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="min-w-0 wrap-break-word">{copiedText}</span>
          </>
        ) : null}
        {status === "failed" ? (
          <span className="min-w-0 wrap-break-word">{fallbackText}</span>
        ) : null}
      </p>
    </div>
  );
}

export { CopyCodeControl, COPIED_MS };
export type { CopyCodeControlProps, CopyStatus };
