// Ours (T36, SETUP.md "Footers and site organisms (T36)"). The tests of CookieConsent, its dialog and
// the reservation of the banner's height at the end of the page (WCAG 2.4.11), in happy-dom with
// Testing Library: what is drawn for each value of D44's choice (unknown, none, made), the three
// buttons, the parity of "accept all" and "reject all" (a "reject all" that is smaller or an
// outline button fails the parity tests), the dialog's categories, switches and answers, where
// focus goes (in, back to "choose" on Escape, on to the next control after a choice), a long German
// and Greek label, the four catalogs and the files' imports. Pixels are not measurable here: the
// heights, the overflow and the 2.4.11 technique itself were measured in headless Chromium (the
// T36 report for worker C has the numbers), and the design-system job's browser checks are the
// lead's. One happy-dom quirk is worked around, and named where it is: a label around a switch
// answers the space bar's click a second time, so the space bar is not pressed on a switch.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { ConsentChoice } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { buttonVariants } from "../atoms/button";
import { CookieConsent, type CookieConsentProps } from "./cookie-consent";
import { capitalised } from "./cookie-consent-parts";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.cookieConsent;
const consent = (locale: Locale) => commerceFixtures[locale].site.cookieConsent;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

/** The banner as the design system draws it: a visitor who has not chosen, the policy alone. */
function element(locale: Locale, props: Partial<CookieConsentProps> = {}) {
  return (
    <CookieConsent
      {...consent(locale).copy}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      choice={null}
      prefetch={false}
      {...props}
    />
  );
}

const setup = (locale: Locale = "en", props?: Partial<CookieConsentProps>) =>
  render(element(locale, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const banner = () => slot("cookie-consent") as HTMLElement;
const accept = () => slot("cookie-consent-accept") as HTMLElement;
const reject = () => slot("cookie-consent-reject") as HTMLElement;
const choose = () => slot("cookie-consent-choose") as HTMLElement;
const dialogOf = () => slot("cookie-consent-dialog");
const messageText = () => plain(slot("cookie-consent-message")?.textContent);

const ACCEPTED: ConsentChoice = { analytics: true, marketing: true };
const REJECTED: ConsentChoice = { analytics: false, marketing: false };

/** The text with its first letter in capitals, as the component writes a link that follows a sentence. */
const capital = (text: string, locale: Locale) =>
  (text[0] ?? "").toLocaleUpperCase(htmlLang[locale]) + text.slice(1);

/** Opens the dialog from "choose" with the keyboard and waits for it. */
async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  choose().focus();
  await user.keyboard("{Enter}");
  return screen.findByRole("dialog");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("style");
});

describe("CookieConsent", () => {
  describe("before the browser knows the visitor (D44)", () => {
    it("draws nothing while the choice is unknown, on the server and in the first render", () => {
      const { container } = setup("en", { choice: undefined });
      expect(container.innerHTML).toBe("");
      expect(renderToString(element("en", { choice: undefined }))).toBe("");
    });

    it("draws nothing for a visitor who has chosen", () => {
      for (const choice of [ACCEPTED, REJECTED, { analytics: true, marketing: false }]) {
        const { container, unmount } = setup("en", { choice });
        expect(container.innerHTML).toBe("");
        unmount();
      }
    });

    it("draws the banner for a visitor who has not chosen", () => {
      setup("en", { choice: null });
      expect(banner()).toBeTruthy();
    });

    it("appears when the choice turns from unknown to none, and goes when it is made", () => {
      const view = setup("en", { choice: undefined });
      expect(banner()).toBeNull();
      view.rerender(element("en", { choice: null }));
      expect(banner()).toBeTruthy();
      view.rerender(element("en", { choice: ACCEPTED }));
      expect(banner()).toBeNull();
    });

    it("hydrates the server's empty markup and then shows the banner, with no mismatch", async () => {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element("en", { choice: undefined }));
      expect(container.innerHTML).toBe("");
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      let root!: ReturnType<typeof hydrateRoot>;
      await act(async () => {
        root = hydrateRoot(container, element("en", { choice: undefined }), { onRecoverableError });
      });
      await act(async () => {
        root.render(element("en", { choice: null }));
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(banner()).toBeTruthy();
      await act(async () => root.unmount());
      container.remove();
    });

    it("renders a banner for a visitor who has not chosen on the server too, as the DS's states are", () => {
      const html = renderToString(element("en", { choice: null }));
      expect(html).toContain('data-slot="cookie-consent"');
      expect(html).toContain('data-slot="cookie-consent-accept"');
      // The dialog is not in the page until it is opened.
      expect(html).not.toContain('data-slot="cookie-consent-dialog"');
    });
  });

  describe("the region", () => {
    it.each(LOCALES)(
      "is a section named by the copy, with the title as a heading, in %s",
      (locale) => {
        setup(locale);
        expect(banner().tagName).toBe("SECTION");
        expect(screen.getByRole("region", { name: copyOf(locale).region })).toBe(banner());
        const heading = within(banner()).getByRole("heading", { name: copyOf(locale).title });
        expect(heading.tagName).toBe("H2");
      },
    );

    it("is not a dialog: it blocks nothing and is not modal", () => {
      setup();
      expect(banner().getAttribute("role")).toBeNull();
      expect(banner().getAttribute("aria-modal")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("alertdialog")).toBeNull();
      // Nothing behind it is hidden or made inert: the page stays usable (GDPR forbids a cookie wall).
      expect(document.body.querySelector("[inert]")).toBeNull();
      expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    it("does not take focus when it appears, and leaves it where the visitor had it", () => {
      const view = render(
        <>
          <button type="button">Page</button>
          {element("en", { choice: undefined })}
        </>,
      );
      screen.getByRole("button", { name: "Page" }).focus();
      view.rerender(
        <>
          <button type="button">Page</button>
          {element("en", { choice: null })}
        </>,
      );
      expect(banner()).toBeTruthy();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Page" }));
    });

    it("takes no focus on its own with nothing focused either", () => {
      setup();
      expect(document.activeElement).toBe(document.body);
    });

    it("is fixed to the bottom of the window across its width, on a layer below the dialog's", () => {
      setup();
      const classes = banner().className.split(/\s+/);
      for (const token of ["fixed", "inset-x-0", "bottom-0", "z-(--z-overlay)"]) {
        expect(classes, token).toContain(token);
      }
      // The layers are tokens: the banner's is below the modal's.
      const tokens = readFileSync(path.join(import.meta.dirname, "../styles/tokens.css"), "utf8");
      const layer = (name: string) =>
        Number(new RegExp(`--z-${name}:\\s*(\\d+)`).exec(tokens)?.[1]);
      expect(layer("overlay")).toBeLessThan(layer("modal"));
    });

    it("keeps its content clear of a phone's home indicator and its words clear of the window's edge", () => {
      setup();
      const inner = banner().firstElementChild as HTMLElement;
      expect(inner.className).toContain("pb-[calc(1rem+env(safe-area-inset-bottom))]");
      expect(inner.className).toContain("px-4");
    });

    it("scrolls inside itself rather than cover a short window", () => {
      setup();
      expect(banner().className).toContain("max-h-[60dvh]");
      expect(banner().className).toContain("overflow-y-auto");
    });

    it("keeps its colours to the tokens", () => {
      setup();
      expect(banner().className).toContain("bg-background");
      expect(banner().className).toContain("text-foreground");
      expect(banner().className).toContain("border-border");
    });

    it("passes className to the region", () => {
      setup("en", { className: "print:hidden" });
      expect(banner().className).toContain("print:hidden");
      expect(banner().className).toContain("fixed");
    });
  });

  describe("the sentence", () => {
    it.each(LOCALES)(
      "is the copy's, with the link to the policy where {policy} is, in %s",
      (locale) => {
        const { policyHref } = consent(locale).copy;
        setup(locale);
        const copy = copyOf(locale);
        expect(messageText()).toBe(
          plain(formatMessage(copy.message, { policy: copy.policyLink }, htmlLang[locale])),
        );
        const link = within(slot("cookie-consent-message") as HTMLElement).getByRole("link", {
          name: copy.policyLink,
        });
        expect(link.getAttribute("href")).toBe(policyHref);
        expect(link.textContent).toBe(copy.policyLink);
      },
    );

    it.each(LOCALES)("is the shop's own message, then the policy link, in %s", (locale) => {
      const own = consent(locale).message;
      expect(own.message).toBeTruthy();
      setup(locale, { ...own });
      const copy = copyOf(locale);
      const paragraph = slot("cookie-consent-message") as HTMLElement;
      const link = within(paragraph).getByRole("link");
      expect(link.getAttribute("href")).toBe(own.policyHref);
      expect(link.textContent).toBe(capital(copy.policyLink, locale));
      // The shop's words come first and the link follows them.
      expect(plain(paragraph.textContent)).toBe(`${plain(own.message)} ${plain(link.textContent)}`);
      expect(paragraph.firstChild?.textContent).toContain(plain(own.message).slice(0, 20));
      expect(
        link.compareDocumentPosition(paragraph.firstChild as Node) &
          Node.DOCUMENT_POSITION_PRECEDING,
      ).toBeTruthy();
      // The copy's sentence is not there as well.
      expect(messageText()).not.toContain(
        plain(formatMessage(copy.message, { policy: copy.policyLink }, htmlLang[locale])).slice(
          0,
          30,
        ),
      );
    });

    it("links to the policy once in the banner, as a plain link in running text", () => {
      setup();
      const links = within(banner()).getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]?.closest("p")).toBe(slot("cookie-consent-message"));
    });

    it("passes prefetch on to the link, and leaves it unset otherwise", () => {
      const view = setup("en", { prefetch: false });
      expect(within(banner()).getByRole("link").getAttribute("data-prefetch")).toBe("false");
      view.unmount();
      setup("en", { prefetch: undefined });
      expect(within(banner()).getByRole("link").getAttribute("data-prefetch")).toBe("undefined");
    });
  });

  describe("the three buttons", () => {
    it.each(LOCALES)(
      "are accept all, reject all and choose, named by the copy, in %s",
      (locale) => {
        setup(locale);
        const copy = copyOf(locale);
        expect(within(banner()).getByRole("button", { name: copy.acceptAll })).toBe(accept());
        expect(within(banner()).getByRole("button", { name: copy.rejectAll })).toBe(reject());
        expect(within(banner()).getByRole("button", { name: copy.choose })).toBe(choose());
        expect(within(banner()).getAllByRole("button")).toHaveLength(3);
      },
    );

    it("sit side by side in one row, accept, reject, then choose, whatever the width", () => {
      setup();
      const actions = slot("cookie-consent-actions") as HTMLElement;
      expect([...actions.children]).toEqual([accept(), reject(), choose()]);
      // A column under 640 px, with every button the row's width; a row from there.
      expect(actions.className).toContain("flex-col");
      expect(actions.className).toContain("sm:flex-row");
      for (const button of [accept(), reject(), choose()]) {
        expect(button.className).toContain("w-full");
        expect(button.className).toContain("sm:w-auto");
      }
    });

    it("keeps every button at least 44 px high", () => {
      setup();
      for (const button of [accept(), reject(), choose()]) {
        expect(button.className, button.textContent ?? "").toContain("min-h-11");
      }
    });

    it("puts no control inside another, in the banner and in the dialog (the design system's rule)", async () => {
      const user = userEvent.setup();
      setup("de");
      const dialog = await openDialog(user);
      // The design system's selectors: nothing that can take a press or a key inside a link or a button.
      const inner =
        'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="slider"]';
      const outers = [
        ...banner().querySelectorAll('a[href], button, [role="button"], [role="link"]'),
        ...dialog.querySelectorAll('a[href], button, [role="button"], [role="link"]'),
      ];
      expect(outers.length).toBeGreaterThan(6);
      for (const outer of outers) {
        const nested = [...outer.querySelectorAll(inner)].filter(
          (each) => each.closest('[aria-hidden="true"], [hidden], [inert]') === null,
        );
        expect(nested, outer.textContent ?? "").toEqual([]);
      }
    });

    it("has no autofocus and no positive tabindex: the controls are in the page's order", () => {
      setup();
      for (const each of banner().querySelectorAll("*")) {
        expect((each as HTMLElement).tabIndex, each.tagName).toBeLessThanOrEqual(0);
        expect(each.hasAttribute("autofocus"), each.tagName).toBe(false);
      }
    });
  });

  describe("reject is as prominent as accept (the plan's words, and the regulators')", () => {
    /** What a button really draws: its classes, in the order they were written. */
    const drawn = (button: Element) => [...button.classList].sort().join(" ");
    /** Whether two buttons differ in variant or size: their class lists differ. */
    const differ = (a: Element, b: Element) => drawn(a) !== drawn(b);

    it("draws the two the same: one variant and one size", () => {
      setup();
      expect(differ(accept(), reject())).toBe(false);
      // And that is Button's default variant and size, not a quieter one.
      const wanted = buttonVariants({ variant: "default", size: "default" }).split(/\s+/);
      for (const token of ["bg-primary", "text-primary-foreground", "min-h-11"]) {
        expect(wanted, token).toContain(token);
        expect(accept().classList.contains(token), token).toBe(true);
        expect(reject().classList.contains(token), token).toBe(true);
      }
    });

    it("tells apart a button of another variant or of another size (the comparison itself)", () => {
      const sample = (variant: "default" | "outline" | "ghost", size: string) => {
        const button = document.createElement("button");
        button.className = buttonVariants({ variant, size: size as "default" });
        return button;
      };
      expect(differ(sample("default", "default"), sample("default", "default"))).toBe(false);
      expect(differ(sample("default", "default"), sample("outline", "default"))).toBe(true);
      expect(differ(sample("default", "default"), sample("ghost", "default"))).toBe(true);
      expect(differ(sample("default", "default"), sample("default", "lg"))).toBe(true);
      // `sm` is not a size Button has (D32), and a button asked for it loses its size classes.
      expect(differ(sample("default", "default"), sample("default", "sm"))).toBe(true);
    });

    it("is stricter than the colours: a different class on either one fails", () => {
      setup();
      reject().classList.add("text-xs");
      expect(differ(accept(), reject())).toBe(true);
    });

    it("draws accept and reject in the dialog as it does in the banner", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      const dialogAccept = slot("cookie-consent-dialog-accept") as HTMLElement;
      const dialogReject = slot("cookie-consent-dialog-reject") as HTMLElement;
      expect(differ(dialogAccept, dialogReject)).toBe(false);
      expect(differ(dialogAccept, accept())).toBe(false);
      expect(differ(dialogReject, reject())).toBe(false);
    });

    it("lets choose be the quieter one", () => {
      setup();
      expect(choose().className).toContain("bg-background");
      expect(choose().className).not.toContain("bg-primary");
    });

    it.each(LOCALES)("keeps the order the same in %s", (locale) => {
      setup(locale);
      expect(
        [...(slot("cookie-consent-actions") as HTMLElement).children].map(
          (each) => each.textContent,
        ),
      ).toEqual([copyOf(locale).acceptAll, copyOf(locale).rejectAll, copyOf(locale).choose]);
    });
  });

  describe("answering from the banner", () => {
    it("accept all tells the page the visitor accepted everything", () => {
      const onChoose = vi.fn();
      setup("en", { onChoose });
      fireEvent.click(accept());
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(ACCEPTED);
    });

    it("reject all tells the page the visitor rejected everything", () => {
      const onChoose = vi.fn();
      setup("en", { onChoose });
      fireEvent.click(reject());
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(REJECTED);
    });

    it("gives each answer a choice of its own, so one cannot change the next", () => {
      const seen: ConsentChoice[] = [];
      setup("en", { onChoose: (choice) => seen.push(choice) });
      fireEvent.click(accept());
      (seen[0] as ConsentChoice).analytics = false;
      fireEvent.click(accept());
      expect(seen[1]).toEqual(ACCEPTED);
    });

    it("does nothing but ask the page: the banner stays until `choice` says the visitor chose", () => {
      const onChoose = vi.fn();
      const view = setup("en", { onChoose });
      fireEvent.click(accept());
      expect(banner()).toBeTruthy();
      view.rerender(element("en", { onChoose, choice: ACCEPTED }));
      expect(banner()).toBeNull();
    });

    it("works without onChoose", () => {
      setup();
      expect(() => fireEvent.click(accept())).not.toThrow();
    });

    it("moves focus to the control that follows the banner, not to the body", () => {
      const view = render(
        <>
          <button type="button">Before</button>
          {element("en", { onChoose: () => {} })}
          <a href="/home">Home</a>
        </>,
      );
      act(() => accept().focus());
      fireEvent.click(accept());
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
      view.unmount();
    });

    it("works from the keyboard: Tab to reject, Enter, and the next Tab carries on", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      function Page() {
        const [choice, setChoice] = useState<ConsentChoice | null>(null);
        return (
          <>
            <button type="button">Before</button>
            {element("en", {
              choice,
              onChoose: (next) => {
                onChoose(next);
                setChoice(next);
              },
            })}
            <a href="/home">Home</a>
            <button type="button">After</button>
          </>
        );
      }
      render(<Page />);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
      await user.tab();
      expect(document.activeElement).toBe(within(banner()).getByRole("link"));
      await user.tab();
      expect(document.activeElement).toBe(accept());
      await user.tab();
      expect(document.activeElement).toBe(reject());
      await user.keyboard("{Enter}");
      expect(onChoose).toHaveBeenCalledWith(REJECTED);
      expect(banner()).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    });

    it("does not throw when the banner is the last thing on the page", () => {
      setup("en", { onChoose: () => {} });
      act(() => accept().focus());
      expect(() => fireEvent.click(accept())).not.toThrow();
    });
  });
});

describe("CookieConsent's dialog", () => {
  const popup = () => screen.findByRole("dialog", { name: copyOf("en").dialogTitle });
  const switchOf = (name: string) => screen.getByRole("switch", { name });

  describe("opening", () => {
    it("is not in the page until choose opens it", () => {
      setup();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(choose().getAttribute("aria-haspopup")).toBe("dialog");
      expect(choose().getAttribute("aria-expanded")).toBe("false");
    });

    it.each(LOCALES)(
      "opens from the keyboard as a dialog named by the copy, in %s",
      async (locale) => {
        const user = userEvent.setup();
        setup(locale);
        const copy = copyOf(locale);
        const dialog = await openDialog(user);
        expect(dialog).toBe(dialogOf());
        expect(screen.getByRole("dialog", { name: copy.dialogTitle, description: /./ })).toBe(
          dialog,
        );
        expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
        expect(
          plain(dialog.querySelector("[data-slot=dialog-description]")?.textContent),
        ).toContain(plain(copy.dialogDescription));
        // A dialog, not an alert dialog: a press outside or Escape may dismiss it.
        expect(screen.queryByRole("alertdialog")).toBeNull();
        expect(choose().getAttribute("aria-expanded")).toBe("true");
      },
    );

    it("opens when pressed", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(choose());
      await popup();
    });

    it("moves focus into the dialog, to the first control that can take it", async () => {
      const user = userEvent.setup();
      setup();
      const dialog = await openDialog(user);
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      // Necessary is on and cannot take focus; analytics is the first switch that can.
      expect(document.activeElement).toBe(switchOf("Analytics"));
    });

    it("keeps Tab and Shift+Tab inside, round the controls and back", async () => {
      const user = userEvent.setup();
      setup();
      const dialog = await openDialog(user);
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      const seen = new Set<Element | null>();
      for (let press = 0; press < 12; press += 1) {
        await user.tab();
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        seen.add(document.activeElement);
      }
      // The two switches, the policy link, the three buttons and the close button.
      expect(seen.size).toBeGreaterThanOrEqual(7);
      for (let press = 0; press < 12; press += 1) {
        await user.tab({ shift: true });
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      }
    });

    it("closes on Escape with focus back on choose", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(choose());
      expect(banner()).toBeTruthy();
    });

    it("closes with the close button, named by the copy, with focus back on choose", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").close }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(choose());
      expect(onChoose).not.toHaveBeenCalled();
    });

    it("closes on a press outside, answering nothing", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      await openDialog(user);
      await user.click(document.querySelector("[data-slot=dialog-overlay]") as Element);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onChoose).not.toHaveBeenCalled();
    });

    it("hides the page behind from assistive technology while it is open, and gives it back", async () => {
      const user = userEvent.setup();
      render(
        <>
          <main>
            <p>Page</p>
          </main>
          {element("en")}
        </>,
      );
      await openDialog(user);
      expect(screen.queryByRole("main")).toBeNull();
      expect(screen.queryByRole("region")).toBeNull();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.getByRole("main")).toBeTruthy();
      expect(screen.getByRole("region", { name: copyOf("en").region })).toBe(banner());
    });
  });

  describe("the three categories", () => {
    it.each(LOCALES)(
      "are necessary, analytics and marketing, each with its description, in %s",
      async (locale) => {
        const user = userEvent.setup();
        setup(locale);
        const copy = copyOf(locale);
        const dialog = await openDialog(user);
        const rows = [...dialog.querySelectorAll("[data-slot=cookie-consent-category]")];
        expect(rows.map((row) => row.getAttribute("data-category"))).toEqual([
          "necessary",
          "analytics",
          "marketing",
        ]);
        const texts = [
          [copy.necessary, copy.necessaryDescription],
          [copy.analytics, copy.analyticsDescription],
          [copy.marketing, copy.marketingDescription],
        ] as const;
        rows.forEach((row, index) => {
          const [name, description] = texts[index] ?? ["", ""];
          expect(row.querySelector("[data-slot=cookie-consent-category-name]")?.textContent).toBe(
            name,
          );
          expect(
            row.querySelector("[data-slot=cookie-consent-category-description]")?.textContent,
          ).toBe(description);
          // The switch is named by the name and described by the sentence.
          expect(
            screen.getByRole("switch", { name, description: new RegExp(description.slice(0, 20)) }),
          ).toBeTruthy();
        });
        expect(screen.getAllByRole("switch")).toHaveLength(3);
      },
    );

    it("keeps necessary on and fixed: a switch that is checked and disabled, with 'Always on' beside it", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      const necessary = switchOf("Necessary");
      expect(necessary.getAttribute("aria-checked")).toBe("true");
      expect(
        necessary.hasAttribute("data-disabled") ||
          necessary.getAttribute("aria-disabled") === "true",
      ).toBe(true);
      // A reader hears that it is on, that it cannot change, and why.
      expect(necessary.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
      expect(screen.getByRole("switch", { name: "Necessary", description: /Always on/ })).toBe(
        necessary,
      );
      expect(
        screen.getByRole("switch", { name: "Necessary", description: /remember your cart/ }),
      ).toBe(necessary);
      const always = slot("cookie-consent-always-on") as HTMLElement;
      expect(always.textContent).toBe(copyOf("en").alwaysOn);
      // The words are not dimmed with the switch.
      expect(always.className).not.toContain("opacity");
      // And no press changes it.
      await user.click(necessary);
      await user.click(screen.getByText("Necessary"));
      expect(necessary.getAttribute("aria-checked")).toBe("true");
      necessary.focus();
      await user.keyboard(" ");
      expect(necessary.getAttribute("aria-checked")).toBe("true");
    });

    it("has no switch on but necessary: nothing is pre-ticked", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      expect(switchOf("Analytics").getAttribute("aria-checked")).toBe("false");
      expect(switchOf("Marketing").getAttribute("aria-checked")).toBe("false");
    });

    it("turns analytics and marketing on and off with a click and a label click", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      const analytics = switchOf("Analytics");
      await user.click(analytics);
      expect(analytics.getAttribute("aria-checked")).toBe("true");
      await user.click(analytics);
      expect(analytics.getAttribute("aria-checked")).toBe("false");
      // The label is a target of its own.
      await user.click(screen.getByText("Marketing"));
      expect(switchOf("Marketing").getAttribute("aria-checked")).toBe("true");
      // The space bar is Base UI's: the switch is a focusable `role="switch"`, reached in the tab
      // order below. It is not pressed here: with the label around the switch (a real browser's
      // single toggle was checked in Chromium), happy-dom's label activation answers the key's
      // click a second time and the switch toggles twice.
      analytics.focus();
      expect(document.activeElement).toBe(analytics);
      expect(analytics.getAttribute("tabindex")).toBe("0");
    });

    it("starts the switches where the visitor left them, when it is reopened by someone who chose before", async () => {
      const user = userEvent.setup();
      setup("en", { defaultSwitches: consent("en").choices.analytics });
      await openDialog(user);
      expect(switchOf("Analytics").getAttribute("aria-checked")).toBe("true");
      expect(switchOf("Marketing").getAttribute("aria-checked")).toBe("false");
    });

    it("keeps the switches as they were set when the dialog is closed and opened again", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      await user.click(switchOf("Marketing"));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await openDialog(user);
      expect(switchOf("Marketing").getAttribute("aria-checked")).toBe("true");
    });

    it("puts a 44 px label around each switch: the row is the switch's target, as the Label atom asks", async () => {
      const user = userEvent.setup();
      setup();
      await openDialog(user);
      const labels = [
        ...document.querySelectorAll<HTMLElement>("[data-slot=cookie-consent-category-label]"),
      ];
      expect(labels).toHaveLength(3);
      for (const label of labels) {
        expect(label.tagName).toBe("LABEL");
        expect(label.className).toContain("min-h-11");
        expect(label.className).toContain("w-full");
        // Around the switch: the design system's check takes the label's box as the switch's target
        // (`closest("label")`), since the switch's own hit area is 42 px wide.
        const control = label.querySelector("[data-slot=cookie-consent-switch]") as HTMLElement;
        expect(control.closest("label")).toBe(label);
        // The track's own hit area is the Switch atom's `::after`, 44 px tall.
        expect(control.className).toContain("after:-inset-y-[13px]");
      }
    });

    it("links to the policy after the switches, as a 44 px link of its own", async () => {
      const user = userEvent.setup();
      setup();
      const dialog = await openDialog(user);
      const link = within(dialog).getByRole("link", {
        name: capital(copyOf("en").policyLink, "en"),
      });
      expect(link).toBe(slot("cookie-consent-policy"));
      expect(link.getAttribute("href")).toBe(consent("en").copy.policyHref);
      expect(link.getAttribute("data-prefetch")).toBe("false");
      expect(link.className).toContain("min-h-11");
      const categories = slot("cookie-consent-categories") as HTMLElement;
      expect(
        categories.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        within(
          dialog.querySelector("[data-slot=dialog-description]") as HTMLElement,
        ).queryAllByRole("link"),
      ).toHaveLength(0);
    });
  });

  describe("answering from the dialog", () => {
    it("accept all closes it and tells the page the visitor accepted everything", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").acceptAll }));
      await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
      expect(onChoose).toHaveBeenCalledWith(ACCEPTED);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("reject all closes it and tells the page the visitor rejected everything", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").rejectAll }));
      await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
      expect(onChoose).toHaveBeenCalledWith(REJECTED);
    });

    it("save sends the switches as they are set", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(switchOf("Analytics"));
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").save }));
      await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
      expect(onChoose).toHaveBeenCalledWith({ analytics: true, marketing: false });
    });

    it("save with nothing switched on is a rejection of the optional cookies", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").save }));
      await waitFor(() => expect(onChoose).toHaveBeenCalledWith(REJECTED));
    });

    it("save sends marketing alone when only that is on", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(switchOf("Marketing"));
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").save }));
      await waitFor(() =>
        expect(onChoose).toHaveBeenCalledWith({ analytics: false, marketing: true }),
      );
    });

    it("sends the answer once, even when the page renders again meanwhile", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      const view = setup("en", { onChoose });
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").acceptAll }));
      await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
      view.rerender(element("en", { onChoose: (choice) => onChoose(choice) }));
      view.rerender(element("en", { onChoose }));
      expect(onChoose).toHaveBeenCalledTimes(1);
    });

    it("removes the banner and moves focus on to the control after it, once the page says so", async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      function Page() {
        const [choice, setChoice] = useState<ConsentChoice | null>(null);
        return (
          <>
            <button type="button">Before</button>
            {element("en", {
              choice,
              onChoose: (next) => {
                onChoose(next);
                setChoice(next);
              },
            })}
            <a href="/home">Home</a>
          </>
        );
      }
      render(<Page />);
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").save }));
      await waitFor(() => expect(banner()).toBeNull());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
    });

    it("leaves focus on choose when the page keeps the banner (the DS's states)", async () => {
      const user = userEvent.setup();
      setup();
      const dialog = await openDialog(user);
      await user.click(within(dialog).getByRole("button", { name: copyOf("en").rejectAll }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(banner()).toBeTruthy();
      await waitFor(() => expect(document.activeElement).toBe(choose()));
    });
  });

  describe("drawn open, for the design system (D45)", () => {
    it("is open at first render with `defaultDialogOpen`, and the rest of the page stays reachable with `modal={false}`", async () => {
      render(
        <>
          <button type="button">Page</button>
          {element("en", { defaultDialogOpen: true, modal: false })}
        </>,
      );
      const dialog = await popup();
      expect(dialog).toBe(dialogOf());
      // Not modal: the page and the banner are in the accessibility tree beside it.
      expect(screen.getByRole("button", { name: "Page" })).toBeTruthy();
      expect(screen.getByRole("region", { name: copyOf("en").region })).toBe(banner());
      for (const reachable of [banner(), screen.getByRole("button", { name: "Page" })]) {
        expect(reachable.closest('[aria-hidden="true"], [inert]')).toBeNull();
      }
    });

    it("takes no focus when it is drawn open at first render", async () => {
      render(element("en", { defaultDialogOpen: true, modal: false }));
      await popup();
      expect(dialogOf()?.contains(document.activeElement)).toBe(false);
    });

    it("draws the switches where `defaultSwitches` puts them", async () => {
      render(
        element("en", {
          defaultDialogOpen: true,
          modal: false,
          defaultSwitches: consent("en").choices.analytics,
        }),
      );
      await popup();
      expect(switchOf("Analytics").getAttribute("aria-checked")).toBe("true");
      expect(switchOf("Marketing").getAttribute("aria-checked")).toBe("false");
    });

    it("passes `popupClassName` to the popup", async () => {
      render(element("en", { defaultDialogOpen: true, modal: false, popupClassName: "max-h-96" }));
      await popup();
      expect(dialogOf()?.className).toContain("max-h-96");
      // The class cap replaces the primitive's own, which follows the window and not the box.
      expect(dialogOf()?.className).not.toContain("max-h-[calc(100dvh-2rem)]");
    });

    it("sits on a layer above the banner's", async () => {
      render(element("en", { defaultDialogOpen: true, modal: false }));
      await popup();
      expect(dialogOf()?.className).toContain("z-(--z-modal)");
      expect(banner().className).toContain("z-(--z-overlay)");
    });

    it("hydrates the server's markup with the dialog open and no mismatch", async () => {
      const container = document.createElement("div");
      document.body.append(container);
      const open = () => element("en", { defaultDialogOpen: true, modal: false });
      container.innerHTML = renderToString(open());
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      let root!: ReturnType<typeof hydrateRoot>;
      await act(async () => {
        root = hydrateRoot(container, open(), { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      await popup();
      await act(async () => root.unmount());
      container.remove();
    });
  });
});

describe("WCAG 2.4.11 Focus Not Obscured: the banner's height is kept clear at the end of the page", () => {
  const root = () => document.documentElement;
  const scrollPadding = () => root().style.getPropertyValue("scroll-padding-block-end");
  const padding = () => root().style.getPropertyValue("padding-block-end");

  /** happy-dom lays nothing out: the banner is as tall as the test says, anything else is nothing. */
  let bannerHeight = 0;
  function measure() {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const height = this.getAttribute("data-slot") === "cookie-consent" ? bannerHeight : 0;
      return {
        height,
        width: 375,
        top: 0,
        left: 0,
        right: 375,
        bottom: height,
        x: 0,
        y: 0,
      } as DOMRect;
    });
  }

  /** A ResizeObserver that lets a test say when something was resized. */
  function observers() {
    const made: { callback: () => void; observed: Element[]; disconnected: boolean }[] = [];
    class Fake {
      record = { callback: () => {}, observed: [] as Element[], disconnected: false };
      constructor(callback: () => void) {
        this.record.callback = callback;
        made.push(this.record);
      }
      observe(target: Element) {
        this.record.observed.push(target);
      }
      unobserve() {}
      disconnect() {
        this.record.disconnected = true;
      }
    }
    vi.stubGlobal("ResizeObserver", Fake);
    return made;
  }

  it("reserves the banner's measured height at the end of the scrollport while it is shown", () => {
    bannerHeight = 180.4;
    measure();
    setup();
    // Rounded up, so the last pixel is never under the banner.
    expect(scrollPadding()).toBe("181px");
    expect(padding()).toBe("181px");
  });

  it("gives the root back as it was when the visitor has chosen", () => {
    bannerHeight = 200;
    measure();
    const view = setup();
    expect(scrollPadding()).toBe("200px");
    view.rerender(element("en", { choice: ACCEPTED }));
    expect(banner()).toBeNull();
    expect(scrollPadding()).toBe("");
    expect(padding()).toBe("");
    expect(root().getAttribute("style") ?? "").not.toContain("padding");
  });

  it("gives the root back when the banner leaves the page", () => {
    bannerHeight = 200;
    measure();
    setup().unmount();
    expect(scrollPadding()).toBe("");
    expect(padding()).toBe("");
  });

  it("restores the values the root had before, not nothing", () => {
    root().style.setProperty("padding-block-end", "8px");
    root().style.setProperty("scroll-padding-block-end", "3rem");
    bannerHeight = 120;
    measure();
    const view = setup();
    expect(padding()).toBe("120px");
    view.unmount();
    expect(padding()).toBe("8px");
    expect(scrollPadding()).toBe("3rem");
  });

  it("reserves nothing while the choice is unknown or made, and nothing for a banner never shown", () => {
    bannerHeight = 200;
    measure();
    const view = setup("en", { choice: undefined });
    expect(scrollPadding()).toBe("");
    view.rerender(element("en", { choice: REJECTED }));
    expect(scrollPadding()).toBe("");
    expect(padding()).toBe("");
  });

  it("reserves it again from the moment the banner appears", () => {
    bannerHeight = 160;
    measure();
    const view = setup("en", { choice: undefined });
    expect(padding()).toBe("");
    view.rerender(element("en", { choice: null }));
    expect(padding()).toBe("160px");
  });

  it("measures again whenever the banner changes size: its words wrap differently at every width", () => {
    const made = observers();
    bannerHeight = 300;
    measure();
    setup();
    expect(padding()).toBe("300px");
    expect(made).toHaveLength(1);
    expect(made[0]?.observed).toEqual([banner()]);
    bannerHeight = 140;
    made[0]?.callback();
    expect(scrollPadding()).toBe("140px");
    expect(padding()).toBe("140px");
  });

  it("stops watching the banner when it goes", () => {
    const made = observers();
    bannerHeight = 100;
    measure();
    setup().unmount();
    expect(made[0]?.disconnected).toBe(true);
    // A late call changes nothing.
    made[0]?.callback();
    expect(padding()).toBe("");
  });

  it("works where there is no ResizeObserver, with the height it measured first", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    bannerHeight = 150;
    measure();
    const view = setup();
    expect(padding()).toBe("150px");
    view.unmount();
    expect(padding()).toBe("");
  });

  it("keeps the tallest of several banners (a design-system page), and lets go one by one", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const height = this.className.includes("tall")
        ? 250
        : this.className.includes("short")
          ? 100
          : 0;
      return {
        height,
        width: 375,
        top: 0,
        left: 0,
        right: 375,
        bottom: height,
        x: 0,
        y: 0,
      } as DOMRect;
    });
    const states = (tall: ConsentChoice | null, short: ConsentChoice | null) => (
      <>
        {element("en", { className: "short", choice: short })}
        {element("en", { className: "tall", choice: tall })}
      </>
    );
    const view = render(states(null, null));
    expect(document.querySelectorAll("[data-slot=cookie-consent]")).toHaveLength(2);
    expect(padding()).toBe("250px");
    // The tall one goes: the short one is still reserved.
    view.rerender(states(ACCEPTED, null));
    expect(padding()).toBe("100px");
    expect(scrollPadding()).toBe("100px");
    view.rerender(states(ACCEPTED, REJECTED));
    expect(padding()).toBe("");
    expect(scrollPadding()).toBe("");
  });

  it("is written with the logical properties, on the root element only", () => {
    bannerHeight = 90;
    measure();
    setup();
    expect(root().getAttribute("style")).toContain("scroll-padding-block-end");
    expect(root().getAttribute("style")).toContain("padding-block-end");
    expect(root().getAttribute("style")).not.toMatch(
      /(?:^|[; ])(?:scroll-)?padding-(?:bottom|top|left|right)/,
    );
    expect(document.body.getAttribute("style")).toBeNull();
  });
});

describe("CookieConsent with long words", () => {
  /** The catalog's words with the longest strings of the locale in every place a visitor reads one. */
  function longCopy(locale: Locale, strings: (typeof longLabels)[number][1]) {
    return {
      ...copyOf(locale),
      region: strings.storeName,
      title: strings.productName,
      message: `${strings.productDescription} {policy}`,
      policyLink: strings.linkLabel,
      acceptAll: strings.action,
      rejectAll: strings.action,
      choose: strings.action,
      dialogTitle: strings.productName,
      dialogDescription: strings.helpText,
      necessary: strings.toggleLabel,
      necessaryDescription: strings.productDescription,
      alwaysOn: strings.badge,
      analytics: strings.fieldLabel,
      analyticsDescription: strings.helpText,
      marketing: strings.optionLabel,
      marketingDescription: strings.productDescription,
      save: strings.action,
      close: strings.hint,
    };
  }

  it.each(longLabels)(
    "wraps a long %s label in the banner and the dialog and cuts nothing",
    async (locale, strings) => {
      const user = userEvent.setup();
      setup(locale, { copy: longCopy(locale, strings) });
      const dialog = await openDialog(user);
      expect(banner().textContent).toContain(strings.productName);
      expect(banner().textContent).toContain(strings.action);
      expect(dialog.textContent).toContain(strings.helpText);
      expect(dialog.textContent).toContain(strings.toggleLabel);
      for (const part of [banner(), dialog]) {
        for (const each of [part, ...part.querySelectorAll("*")]) {
          expect(each.getAttribute("class") ?? "", each.tagName).not.toMatch(CLIPPING_CLASSES);
        }
      }
      // A word that cannot break still wraps inside its box.
      for (const button of [accept(), reject(), choose()]) {
        expect(button.className).toContain("wrap-anywhere");
        expect(button.className).toContain("w-full");
      }
      expect(slot("cookie-consent-title")?.className).toContain("wrap-break-word");
      expect(slot("cookie-consent-message")?.className).toContain("wrap-break-word");
      for (const name of dialog.querySelectorAll("[data-slot=cookie-consent-category-name]")) {
        expect(name.className).toContain("wrap-anywhere");
      }
      for (const description of dialog.querySelectorAll(
        "[data-slot=cookie-consent-category-description]",
      )) {
        expect(description.className).toContain("wrap-break-word");
      }
      for (const save of ["accept", "reject", "save"]) {
        expect(slot(`cookie-consent-dialog-${save}`)?.className, save).toContain("wrap-anywhere");
      }
    },
  );

  it("has no fixed height anywhere: the banner and the dialog grow with their words", async () => {
    const user = userEvent.setup();
    setup("de");
    const dialog = await openDialog(user);
    for (const part of [banner(), dialog]) {
      const classes = [...part.querySelectorAll("*")]
        // The switch is a drawing of a fixed size, as the flag is; its words and rows are not.
        .filter((each) => each.closest("svg, [role=switch]") === null)
        .map((each) => each.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)h-(?:\d|\[)/);
    }
  });

  it("keeps the dialog's controls at 44 px in every locale", async () => {
    for (const locale of LOCALES) {
      const user = userEvent.setup();
      const view = setup(locale);
      await openDialog(user);
      for (const name of ["accept", "reject", "save"]) {
        expect(slot(`cookie-consent-dialog-${name}`)?.className, `${locale} ${name}`).toContain(
          "min-h-11",
        );
      }
      view.unmount();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });
});

describe("CookieConsent in React's strict mode", () => {
  it("answers once, from the banner and from the dialog", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    const view = render(<StrictMode>{element("en", { onChoose })}</StrictMode>);
    fireEvent.click(accept());
    expect(onChoose).toHaveBeenCalledTimes(1);
    onChoose.mockClear();
    view.unmount();

    render(<StrictMode>{element("en", { onChoose })}</StrictMode>);
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: copyOf("en").save }));
    await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});

describe("the helpers", () => {
  it("capitalise a link's text by the locale's rules", () => {
    expect(capitalised("cookie policy", "en-US")).toBe("Cookie policy");
    expect(capitalised("πολιτική cookies", "el-CY")).toBe("Πολιτική cookies");
    expect(capitalised("politique relative aux cookies", "fr-CH")).toBe(
      "Politique relative aux cookies",
    );
    expect(capitalised("Cookie-Richtlinie", "de-DE")).toBe("Cookie-Richtlinie");
    // Turkish has a dotted capital I: the locale decides.
    expect(capitalised("iç", "tr-TR")).toBe("İç");
    expect(capitalised("", "en-US")).toBe("");
  });
});

describe("the files", () => {
  const file = (name: string) => readFileSync(path.join(import.meta.dirname, name), "utf8");
  /** What a file imports, from the module specifiers, and whether each is a type import. */
  const imports = (source: string) =>
    [...source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms)].map((match) => ({
      type: match[1] !== undefined,
      from: match[2] ?? "",
    }));
  const EM_DASH = String.fromCharCode(0x2014);

  it.each(["cookie-consent.tsx", "cookie-consent-dialog.tsx"])(
    "%s is a client component",
    (name) => {
      expect(file(name)).toMatch(/^"use client";?$/m);
    },
  );

  it.each([
    "cookie-consent.tsx",
    "cookie-consent-dialog.tsx",
    "cookie-consent-parts.ts",
    "cookie-consent-reserve.ts",
  ])(
    "%s takes no catalog into the browser: it imports i18n's types, and its formatter from the subpath",
    (name) => {
      for (const each of imports(file(name))) {
        if (each.from === "@shopblok/i18n") expect(each.type, `${name}: ${each.from}`).toBe(true);
        expect(each.from, name).not.toMatch(/@shopblok\/(?:fixtures)|\/messages\//);
      }
    },
  );

  it("formats its sentence with @shopblok/i18n/format", () => {
    expect(imports(file("cookie-consent.tsx")).map((each) => each.from)).toContain(
      "@shopblok/i18n/format",
    );
  });

  it("imports the registry's types only, so no schema reaches a client bundle (D41)", () => {
    for (const name of [
      "cookie-consent.tsx",
      "cookie-consent-dialog.tsx",
      "cookie-consent-parts.ts",
    ]) {
      for (const each of imports(file(name)).filter((one) =>
        one.from.startsWith("@shopblok/registry"),
      )) {
        expect(each.type, `${name}: ${each.from}`).toBe(true);
      }
    }
  });

  it("keeps the class rules: logical properties, token colours, the focus ring at full strength", () => {
    for (const name of ["cookie-consent.tsx", "cookie-consent-dialog.tsx"]) {
      expect(findViolations(file(name)), name).toEqual([]);
    }
  });

  it("uses no em dash and no dark variant", () => {
    for (const name of [
      "cookie-consent.tsx",
      "cookie-consent-dialog.tsx",
      "cookie-consent-parts.ts",
      "cookie-consent-reserve.ts",
    ]) {
      expect(file(name), name).not.toContain(EM_DASH);
      expect(file(name), name).not.toMatch(/\bdark:/);
    }
  });
});
