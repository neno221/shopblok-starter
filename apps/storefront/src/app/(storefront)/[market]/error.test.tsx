import { catalogs, LOCALES } from "@shopblok/i18n";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { pick, SHELL_MESSAGES } from "../../../i18n/messages";
import MarketError from "./error";

/**
 * The error state as the layout's provider gives it its text: the shell's messages only, and an
 * `onError` that throws, so a key the component reads from outside `SHELL_MESSAGES` fails the
 * render (`MISSING_MESSAGE: Could not resolve …`) instead of showing the key and logging in
 * production (PR 70 review, item 3). `useTranslations` is typed against the whole catalog, so the
 * compiler cannot tell. The time zone is the real provider's: without one, next-intl calls
 * `onError` with ENVIRONMENT_FALLBACK, which this one would throw.
 */
function inShell(locale: (typeof LOCALES)[number], children: ReactNode) {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      messages={pick(catalogs[locale], SHELL_MESSAGES)}
      onError={(error) => {
        throw error;
      }}
    >
      {children}
    </NextIntlClientProvider>,
  );
}

function render(locale: (typeof LOCALES)[number], error: Error & { digest?: string }) {
  return inShell(locale, <MarketError error={error} />);
}

describe("the market's error state (D62)", () => {
  it.each(LOCALES)("says what is down in %s, from the shell's messages alone", (locale) => {
    // `inShell`'s `onError` throws: a key outside SHELL_MESSAGES fails this render too.
    const html = render(locale, new Error("x"));
    expect(html).toContain('data-testid="error-state"');
    expect(html).toContain(catalogs[locale].wiring.backendUnavailable);
    expect(html).toContain(catalogs[locale].wiring.backendHint);
  });

  it("is a guard: a key outside SHELL_MESSAGES fails the render", () => {
    function Outside() {
      return <p>{useTranslations("wiring")("title")}</p>;
    }
    expect(() => inShell("en", <Outside />)).toThrow(/MISSING_MESSAGE/);
  });

  it("prints the server log's digest when there is one, and nothing when there is not", () => {
    expect(render("en", Object.assign(new Error("x"), { digest: "123abc" }))).toContain(
      "digest 123abc",
    );
    expect(render("en", new Error("x"))).not.toContain("digest");
  });
});
