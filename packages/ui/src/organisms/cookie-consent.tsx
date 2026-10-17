// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §8.4 consent; D44, D45). The cookie
// banner: a strip fixed to the bottom of the window with the shop's sentence, a link to the cookie
// policy and three buttons, "accept all", "reject all" and "choose", which opens a dialog with the
// three categories (necessary, analytics, marketing; `cookie-consent-dialog.tsx`).
// - A client component, whole: it takes functions (`onChoose`), keeps state and formats a sentence
//   with a link in it at run time, with `@shopblok/i18n/format` (the package's index carries the four
//   catalogs, which the browser has no use for). The storefront's island, `VisitorCookieConsent`,
//   is a client module that imports it, so a server part that handed strings down, as
//   MarketSuggestionBanner does, would have nobody to hand them to.
// - Per visitor (D44). The server cannot know whether this visitor has chosen, so `choice` is
//   `undefined` there and in the browser's first render, and nothing is drawn: a prerendered page
//   is the same for everyone. `null` is a visitor who has not chosen (the banner is drawn, after
//   hydration, as the island's store answers), and a choice draws nothing. With no JavaScript the
//   banner is never drawn at all, so nothing but necessary cookies is ever set: no consent, no
//   tracking, which is the right default.
// - A region, not a dialog. It is a `<section>` named by the catalog's `region`, it does not block
//   the page and does not take focus when it appears (it appears after hydration, under the
//   visitor's hands), and everything behind it stays usable: a cookie wall is not consent (GDPR).
//   It sits on the `--z-overlay` layer, below the dialog's `--z-modal`, and its padding keeps
//   clear of a phone's home indicator (`env(safe-area-inset-bottom)`).
// - Refusing is as easy as agreeing. "Accept all" and "reject all" are the same Button variant and
//   size, next to each other and in the same order at every width (they stack, both full width,
//   under 640 px). "Choose" is the quieter outline button.
// - After a choice the banner goes and keyboard focus goes where the next Tab would have gone
//   (`focusAfter`), not to `<body>`. A choice made in the dialog waits until the dialog has left
//   the page (see the dialog's header).
// - WCAG 2.4.11 Focus Not Obscured: while the banner is shown its height is reserved at the end of
//   the page's scrollport, on the root element (`cookie-consent-reserve.ts`), so a control the
//   visitor tabs to is scrolled clear of the banner and the page's last links can scroll above it.
// - The sentence is the shop's own `message` when it has one, and then the policy link follows it,
//   or the copy's, whose `{policy}` is the link. The words wrap at every width and in every
//   language and are never cut; the banner grows with them, and scrolls inside itself (to 60 % of
//   the window's height) rather than cover a short window, such as a phone on its side or a page
//   zoomed to 400 %.
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type {
  ConsentChoice,
  CookieConsent as CookieConsentContent,
} from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Link } from "@shopblok/ui/atoms/link";
import { cn } from "@shopblok/ui/lib/utils";
import { useEffect, useRef } from "react";
import type * as React from "react";
import { CookieConsentDialog } from "./cookie-consent-dialog";
import { acceptAll, ANSWER, capitalised, LINK_SLOT, rejectAll } from "./cookie-consent-parts";
import { reserveSpaceFor } from "./cookie-consent-reserve";
import { focusAfter } from "./focus-after";

type CookieConsentProps = CookieConsentContent & {
  /** The wording, from the catalog's `organisms.cookieConsent`. */
  copy: Messages["organisms"]["cookieConsent"];
  /** The market's `<html lang>`. */
  locale: string;
  /**
   * D44: the visitor's choice so far. `undefined` while the browser does not know it (the server
   * and the first render in the browser): nothing is drawn, so a prerendered page is the same for
   * everyone. `null`: they have not chosen, and the banner is shown. A choice: nothing is drawn.
   */
  choice?: ConsentChoice | null;
  /** Called with what the visitor chose: accept all, reject all, or the dialog's save. */
  onChoose?: (choice: ConsentChoice) => void;
  /** The DS's states: the dialog drawn open, and not modal (D45). */
  defaultDialogOpen?: boolean;
  modal?: boolean;
  /** Where the dialog's switches start: off, unless the visitor chose otherwise before and reopens it. */
  defaultSwitches?: ConsentChoice;
  /** next/link's prefetch for the policy link; the DS passes false. */
  prefetch?: boolean | null;
  /** The class of the dialog's popup: the design system's states cap it to their box. */
  popupClassName?: string;
  className?: string;
};

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The policy's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

function CookieConsent({
  policyHref,
  message,
  copy,
  locale,
  choice,
  onChoose,
  defaultDialogOpen,
  modal,
  defaultSwitches,
  prefetch,
  popupClassName,
  className,
}: CookieConsentProps) {
  const bannerRef = useRef<HTMLElement>(null);
  const shown = choice === null;

  // WCAG 2.4.11: the banner's height is reserved at the end of the page while it is there.
  useEffect(() => {
    const banner = bannerRef.current;
    if (!shown || banner === null) return;
    return reserveSpaceFor(banner);
  }, [shown]);

  if (!shown) return null;

  /** Moves focus on to where the next Tab would have gone, then tells the page what was chosen. */
  function choose(next: ConsentChoice) {
    if (bannerRef.current !== null) focusAfter(bannerRef.current);
    onChoose?.(next);
  }

  const policy = (text: string) => (
    <Link href={policyHref as LinkHref} prefetch={prefetch}>
      {text}
    </Link>
  );
  // The shop's own sentence, then the link to the policy; or the copy's, whose `{policy}` is the link.
  const [before = "", after = ""] =
    message === undefined
      ? formatMessage(copy.message, { policy: LINK_SLOT }, locale).split(LINK_SLOT)
      : [];

  return (
    <section
      ref={bannerRef}
      aria-label={copy.region}
      data-slot="cookie-consent"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-overlay) max-h-[60dvh] overflow-y-auto overscroll-contain border-t border-border bg-background text-foreground",
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-page min-w-0 gap-4 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            data-slot="cookie-consent-title"
            className="text-base leading-snug font-semibold wrap-break-word"
          >
            {copy.title}
          </h2>
          <p data-slot="cookie-consent-message" className="text-sm leading-snug wrap-break-word">
            {message === undefined ? (
              <>
                {before}
                {policy(copy.policyLink)}
                {after}
              </>
            ) : (
              <>
                {message} {policy(capitalised(copy.policyLink, locale))}
              </>
            )}
          </p>
        </div>
        <div
          data-slot="cookie-consent-actions"
          className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-lg lg:justify-end"
        >
          <Button
            {...ANSWER}
            data-slot="cookie-consent-accept"
            className="w-full wrap-anywhere sm:w-auto"
            onClick={() => choose(acceptAll())}
          >
            {copy.acceptAll}
          </Button>
          <Button
            {...ANSWER}
            data-slot="cookie-consent-reject"
            className="w-full wrap-anywhere sm:w-auto"
            onClick={() => choose(rejectAll())}
          >
            {copy.rejectAll}
          </Button>
          <CookieConsentDialog
            copy={copy}
            locale={locale}
            policyHref={policyHref}
            prefetch={prefetch}
            defaultOpen={defaultDialogOpen}
            modal={modal}
            defaultSwitches={defaultSwitches}
            popupClassName={popupClassName}
            onAnswer={choose}
          />
        </div>
      </div>
    </section>
  );
}

export { CookieConsent };
export type { CookieConsentProps };
