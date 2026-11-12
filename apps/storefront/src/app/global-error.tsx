"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/sentry/report";

// Shown when a market's root layout itself throws, in place of every layout (M6 T96): the app has a
// root layout per route group (each market, Payload, the design system), so this draws its own
// `<html>` and `<body>` and has no market, catalog or shell to read; the words are English, as the
// global 404's are. A server error was reported where it happened (`onRequestError`); an error of
// the browser's own goes to Sentry from here, since React keeps it from `window.onerror`.
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
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <main>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "0.5rem" }}>Please try again in a moment.</p>
          <p style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
            <button type="button" onClick={() => reset()} style={{ minHeight: 44 }}>
              Try again
            </button>
            {/* A full load: the app's own router is what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              Home
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
