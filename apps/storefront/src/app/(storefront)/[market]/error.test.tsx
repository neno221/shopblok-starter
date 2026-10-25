import { catalogs, LOCALES } from "@shopblok/i18n";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { pick, SHELL_MESSAGES } from "../../../i18n/messages";
import MarketError from "./error";

/** The error state as the layout's provider gives it its text: the shell's messages only. */
function render(locale: (typeof LOCALES)[number], error: Error & { digest?: string }) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={pick(catalogs[locale], SHELL_MESSAGES)}>
      <MarketError error={error} />
    </NextIntlClientProvider>,
  );
}

describe("the market's error state (D62)", () => {
  it.each(LOCALES)("says what is down in %s, from the shell's messages alone", (locale) => {
    const html = render(locale, new Error("x"));
    expect(html).toContain('data-testid="error-state"');
    expect(html).toContain(catalogs[locale].wiring.backendUnavailable);
    expect(html).toContain(catalogs[locale].wiring.backendHint);
  });

  it("prints the server log's digest when there is one, and nothing when there is not", () => {
    expect(render("en", Object.assign(new Error("x"), { digest: "123abc" }))).toContain(
      "digest 123abc",
    );
    expect(render("en", new Error("x"))).not.toContain("digest");
  });
});
