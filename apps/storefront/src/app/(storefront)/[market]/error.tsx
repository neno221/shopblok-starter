"use client";

import { useTranslations } from "next-intl";

// Shown inside the market's layout when a page throws while it renders: M0's case is the Medusa
// backend or Payload's database being down. In production a server error's message never reaches the
// browser (this one would read "Minified React error #441"), only a digest that is also in the
// server log, which has the real message (`MedusaRequestError: Medusa at … did not answer`). So the
// text is the catalog's: what is down and what to do. `next dev` has its own overlay.
//
// D62: the two lines come from the layout's provider (`SHELL_MESSAGES`), in the market's language.
// A client component that imports `catalogs` instead would put all four catalogs in every page's
// JavaScript, which is what this file did before T46.
export default function MarketError({ error }: { error: Error & { digest?: string } }) {
  const t = useTranslations("wiring");
  return (
    <main className="p-8" role="alert" data-testid="error-state">
      <h1 className="text-2xl font-semibold">{t("backendUnavailable")}</h1>
      <p className="mt-2">{t("backendHint")}</p>
      {error.digest === undefined ? null : (
        <p className="mt-2 font-mono text-sm">digest {error.digest}</p>
      )}
    </main>
  );
}
