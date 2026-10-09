"use client";

import { catalogs, DEFAULT_LOCALE, isLocale } from "@shopblok/i18n";
import { useParams } from "next/navigation";

// Shown inside the market's layout when a page throws while it renders: M0's case is the Medusa
// backend or Payload's database being down. In production a server error's message never reaches the
// browser (this one would read "Minified React error #441"), only a digest that is also in the
// server log, which has the real message (`MedusaRequestError: Medusa at … did not answer`). So the
// text is the catalog's: what is down and what to do. `next dev` has its own overlay.
export default function MarketError({ error }: { error: Error & { digest?: string } }) {
  // The route's `[market]` param is the internal key, `{language}-{country}` (SPEC §8.1).
  const { market } = useParams<{ market?: string }>();
  const language = market?.split("-")[0] ?? "";
  const { wiring } = catalogs[isLocale(language) ? language : DEFAULT_LOCALE];
  return (
    <main className="p-8" role="alert" data-testid="error-state">
      <h1 className="text-2xl font-semibold">{wiring.backendUnavailable}</h1>
      <p className="mt-2">{wiring.backendHint}</p>
      {error.digest === undefined ? null : (
        <p className="mt-2 font-mono text-sm">digest {error.digest}</p>
      )}
    </main>
  );
}
