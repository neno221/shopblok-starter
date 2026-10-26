// @vitest-environment happy-dom
import { catalogs, LOCALES } from "@shopblok/i18n";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { pick, SHELL_MESSAGES } from "../../../i18n/messages";
import { ShellLinksProvider } from "../../../components/shell/shell-context";
import MarketError from "./error";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  return inShell(locale, <MarketError error={error} retry={() => undefined} />);
}

describe("the market's error state (D62, D66)", () => {
  it.each(LOCALES)("is the error template in %s, from the shell's messages alone", (locale) => {
    // `inShell`'s `onError` throws: a key outside SHELL_MESSAGES fails this render too.
    const html = render(locale, new Error("x"));
    const copy = catalogs[locale].templates.error;
    expect(html).toContain('data-slot="error-template"');
    expect(html).toContain('id="main"');
    for (const text of [copy.title, copy.body, copy.retry, copy.home]) {
      expect(html).toContain(text.replaceAll("'", "&#x27;"));
    }
  });

  it("is a guard: a key outside SHELL_MESSAGES fails the render", () => {
    function Outside() {
      return <p>{useTranslations("templates.home")("shopAll")}</p>;
    }
    expect(() => inShell("en", <Outside />)).toThrow(/MISSING_MESSAGE/);
  });

  it("says nothing about the error: neither its message nor its digest", () => {
    const html = render(
      "en",
      Object.assign(new Error("Medusa did not answer"), { digest: "123abc" }),
    );
    expect(html).not.toContain("123abc");
    expect(html).not.toContain("Medusa");
  });

  it("links to the market's home from the layout, and to the site's root without it", () => {
    const home = (html: string) =>
      /data-slot="error-home"[^>]*href="([^"]*)"|href="([^"]*)"[^>]*data-slot="error-home"/.exec(
        html,
      );
    const inMarket = inShell(
      "fr",
      <ShellLinksProvider value={{ home: "/ch/fr" }}>
        <MarketError error={new Error("x")} retry={() => undefined} />
      </ShellLinksProvider>,
    );
    const found = home(inMarket);
    expect(found?.[1] ?? found?.[2]).toBe("/ch/fr");
    const bare = home(render("en", new Error("x")));
    expect(bare?.[1] ?? bare?.[2]).toBe("/");
  });

  it("tries again through the boundary's retry", () => {
    const retry = vi.fn();
    const root = document.createElement("div");
    document.body.append(root);
    const reactRoot = createRoot(root);
    act(() => {
      reactRoot.render(
        <NextIntlClientProvider
          locale="en"
          timeZone="UTC"
          messages={pick(catalogs.en, SHELL_MESSAGES)}
        >
          <MarketError error={new Error("x")} retry={retry} />
        </NextIntlClientProvider>,
      );
    });
    act(() => {
      root.querySelector<HTMLButtonElement>('[data-slot="error-retry"]')?.click();
    });
    expect(retry).toHaveBeenCalledTimes(1);
    act(() => reactRoot.unmount());
    root.remove();
  });

  it("hands Next's own errors back to Next", () => {
    const notFound = Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(() => render("en", notFound)).toThrow(notFound);
  });
});
