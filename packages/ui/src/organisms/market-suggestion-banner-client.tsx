// Ours (T35, SETUP.md "Navigation and headers (T35)"; D44, D49). MarketSuggestionBanner's client
// part: the strip itself and its "stay" button, which hides it. A client component only because
// hiding is state. It takes everything made: the words, and the suggested country's flag as a node
// the server rendered, so this file imports neither the i18n formatters nor `atoms/flag.tsx` nor
// `country-flag-icons`, and no flag's drawing reaches a client chunk (D49; a test reads this file's
// imports). "Go to the X store" is a plain link, an `<a>` and not next/link: the whole page changes
// market (its language, its currency, its provider), so the browser loads it anew, and `hreflang`
// says which language it is in. "Stay" is a button, because it changes the page it is on and goes
// nowhere. Without JavaScript the button would do nothing, so `noscript:` hides it
// (`@media (scripting: none)`) and the strip offers the link alone. After "stay" focus goes to the
// control that follows the strip in the page (`focusAfter`), where the next Tab would have gone,
// not to `<body>`, where a keyboard reader would start again from the top. The words wrap: a long
// country name ("South Georgia and the South Sandwich Islands") or a long German or Greek sentence
// makes a taller strip, never a cut one.
"use client";

import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { focusAfter } from "./focus-after";

type MarketSuggestionBannerClientProps = {
  /** The landmark's name. */
  region: string;
  /** The suggested country's flag, rendered on the server; drawn for the eye and hidden from assistive technology. */
  flag?: ReactNode;
  /** The sentence: the copy's, or the shop's own. */
  message: string;
  /** The link to the suggested store: its words, where it goes, and the language it is in. */
  go: { label: string; href: string; hrefLang: string };
  /** The stay button's words. */
  stay: string;
  className?: string;
};

function MarketSuggestionBannerClient({
  region,
  flag,
  message,
  go,
  stay,
  className,
}: MarketSuggestionBannerClientProps) {
  const [hidden, setHidden] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);
  if (hidden) return null;
  return (
    <section
      ref={bannerRef}
      aria-label={region}
      data-slot="market-suggestion-banner"
      className={cn(
        "w-full border-b border-border bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <p className="flex min-w-0 flex-1 basis-64 items-start gap-3 text-sm">
          {flag === undefined ? null : (
            <span aria-hidden="true" className="shrink-0">
              {flag}
            </span>
          )}
          <span data-slot="market-suggestion-message" className="min-w-0 wrap-break-word">
            {message}
          </span>
        </p>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <a
            href={go.href}
            hrefLang={go.hrefLang}
            data-slot="market-suggestion-go"
            className={cn(buttonVariants({ variant: "default" }), "max-w-full wrap-anywhere")}
          >
            {go.label}
          </a>
          <Button
            variant="outline"
            data-slot="market-suggestion-stay"
            className="max-w-full wrap-anywhere noscript:hidden"
            onClick={() => {
              if (bannerRef.current !== null) focusAfter(bannerRef.current);
              setHidden(true);
            }}
          >
            {stay}
          </Button>
        </div>
      </div>
    </section>
  );
}

export { MarketSuggestionBannerClient };
export type { MarketSuggestionBannerClientProps };
