// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, WCAG 2.4.11). The
// popup's card: the offer (the popup member's body) in a card with a close button at its top end.
// A region named by the offer's heading, not a dialog: it takes no focus when it appears and leaves
// the page usable, as the cookie banner does. `corner` fixes it to the window's end corner on the
// overlay layer, scrolling inside itself past 70 % of the window's height, clear of a phone's home
// indicator; `inline` draws the same card in place (the design system's cells). A plain component
// with no directive: the server draws it inline, and the shop's popup island, a client module,
// draws it in the corner with `onClose`, so its code is in that island's chunk alone (D102).
import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

type PromoPopupFrameProps = {
  /** The id of the offer's heading, which names the region. */
  labelledBy: string;
  /** "Close", from `sections.promoBanner`. */
  closeLabel: string;
  /** What the close button does; the design system's inline card has none. */
  onClose?: () => void;
  placement: "corner" | "inline";
  ref?: React.Ref<HTMLElement>;
  children: React.ReactNode;
};

function PromoPopupFrame({
  labelledBy,
  closeLabel,
  onClose,
  placement,
  ref,
  children,
}: PromoPopupFrameProps) {
  return (
    <section
      ref={ref}
      aria-labelledby={labelledBy}
      data-slot="promo-popup"
      data-placement={placement}
      className={cn(
        "relative flex w-full max-w-sm min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 pe-14 text-card-foreground shadow-lg",
        placement === "corner" &&
          "fixed end-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-(--z-overlay) max-h-[70dvh] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain",
      )}
    >
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={closeLabel}
        data-slot="promo-popup-close"
        onClick={onClose}
        className="absolute end-1.5 top-1.5"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </section>
  );
}

export { PromoPopupFrame };
export type { PromoPopupFrameProps };
