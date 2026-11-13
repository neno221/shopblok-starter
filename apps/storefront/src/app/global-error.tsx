"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/sentry/report";

// Shown when a market's root layout itself throws, in place of every layout (M6 T96). The app has a
// root layout per route group (each market, Payload, the design system), so this draws its own
// `<html>` and `<body>` and has no market, catalog or style sheet to read: plain English words, as
// the global 404's are, and as few bytes as can be, since it is in every page's first load (D129).
// A server error was reported where it happened (`onRequestError`); an error of the browser's own
// goes to Sentry from here, since React keeps it from `window.onerror`.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <html lang="en">
      <body>
        <h1>Something went wrong</h1>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
