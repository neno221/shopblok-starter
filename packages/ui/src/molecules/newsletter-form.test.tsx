import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { NewsletterForm, type NewsletterFormProps } from "./newsletter-form";

// `next/link` becomes the anchor it renders, so a test can read the `prefetch` it was given.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...props
  }: { prefetch?: boolean | null; children?: React.ReactNode } & Record<string, unknown>) => (
    <a data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

function setup(locale: Locale = "en", props: Partial<NewsletterFormProps> = {}) {
  const { marketing } = commerceFixtures[locale];
  return render(
    <NewsletterForm
      newsletter={marketing.newsletter.empty}
      copy={catalogs[locale].molecules.newsletterForm}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

const field = () => screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: "Subscribe" });
const statusRegion = () => screen.getByRole("status");

describe("NewsletterForm", () => {
  describe("structure", () => {
    it("is a form named by its heading, which is an h3 unless asked otherwise", () => {
      setup();
      const form = screen.getByRole("form", { name: "Join our newsletter" });
      expect(form.tagName).toBe("FORM");
      expect(screen.getByRole("heading", { level: 3, name: "Join our newsletter" })).toBeTruthy();
    });

    it("takes the heading's level from the page's outline", () => {
      setup("en", { headingLevel: 2 });
      expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
      expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    });

    it("has one labelled, required email field that the browser can fill in", () => {
      setup();
      const input = field();
      expect(input.type).toBe("email");
      expect(input.name).toBe("email");
      expect(input.required).toBe(true);
      expect(input.getAttribute("autocomplete")).toBe("email");
      expect(input.getAttribute("inputmode")).toBe("email");
      // A long address scrolls inside the field: the design system's clipping check is told.
      expect(input.hasAttribute("data-truncate")).toBe(true);
      // The label is a real <label for>, not a placeholder.
      expect(input.labels).toHaveLength(1);
      expect(input.labels?.[0]?.textContent).toBe("Email address");
      expect(input.getAttribute("placeholder")).toBeNull();
    });

    it("has one submit button that submits", () => {
      setup();
      expect((submit() as HTMLButtonElement).type).toBe("submit");
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("shows the address it is given, empty at first", () => {
      setup("en");
      expect(field().value).toBe("");
      setup("en", { newsletter: commerceFixtures.en.marketing.newsletter.typed });
      expect(screen.getAllByRole("textbox")[1]).toHaveProperty("value", "alex.morgan@example.com");
    });

    it("is a plain form: a URL action posts, a function leaves the method to React", () => {
      const { container, rerender } = setup("en", { action: "/api/newsletter" });
      const form = container.querySelector("form");
      expect(form?.getAttribute("action")).toBe("/api/newsletter");
      expect(form?.getAttribute("method")).toBe("post");
      rerender(
        <NewsletterForm
          newsletter={commerceFixtures.en.marketing.newsletter.empty}
          copy={catalogs.en.molecules.newsletterForm}
          locale="en-US"
          action={() => {}}
        />,
      );
      expect(container.querySelector("form")?.getAttribute("method")).toBeNull();
    });

    it("renders on the server, as markup a browser can submit without JavaScript", () => {
      const markup = renderToStaticMarkup(
        <NewsletterForm
          newsletter={commerceFixtures.en.marketing.newsletter.typed}
          copy={catalogs.en.molecules.newsletterForm}
          locale="en-US"
          action="/api/newsletter"
        />,
      );
      expect(markup).toContain("<form ");
      expect(markup).toContain('method="post"');
      expect(markup).toContain('type="email"');
      expect(markup).toContain('value="alex.morgan@example.com"');
      expect(markup).toContain('type="submit"');
    });

    it("passes the form's own props on, and merges the class", () => {
      const { container } = setup("en", { id: "footer-signup", className: "max-w-md" });
      const form = container.querySelector("form");
      expect(form?.id).toBe("footer-signup");
      expect(form?.className).toContain("max-w-md");
      expect(form?.className).toContain("w-full");
    });

    it("gives two forms on one page ids of their own, each label pointing at its field", () => {
      const { container } = render(
        <>
          {[0, 1].map((key) => (
            <NewsletterForm
              key={key}
              newsletter={commerceFixtures.en.marketing.newsletter.empty}
              copy={catalogs.en.molecules.newsletterForm}
              locale="en-US"
            />
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const input of container.querySelectorAll("input")) {
        expect(input.labels).toHaveLength(1);
      }
      expect(screen.getAllByRole("form")).toHaveLength(2);
    });
  });

  describe("the consent sentence", () => {
    it.each(LOCALES)("has the privacy page's link inside the sentence, in %s", (locale) => {
      setup(locale);
      const copy = catalogs[locale].molecules.newsletterForm;
      const link = screen.getByRole("link", { name: copy.privacyLink });
      expect(link.getAttribute("href")).toBe(
        commerceFixtures[locale].marketing.newsletter.empty.privacyHref,
      );
      // The link is in the paragraph with the words around it, and the paragraph reads as the
      // message does with the link's text where the message puts it.
      const sentence = link.parentElement;
      expect(sentence?.tagName).toBe("P");
      expect(plain(sentence?.textContent)).toBe(
        plain(formatMessage(copy.consent, { privacy: copy.privacyLink }, htmlLang[locale])),
      );
      expect(sentence?.textContent).not.toContain("");
    });

    it("points at the privacy page under the market's prefix", () => {
      setup("de");
      expect(screen.getByRole("link", { name: "Datenschutzerklärung" }).getAttribute("href")).toBe(
        "/de/pages/privacy",
      );
    });

    it("puts the link wherever the language's sentence needs it", () => {
      // A message that begins with the link, and one that ends with it.
      const base = catalogs.en.molecules.newsletterForm;
      for (const consent of ["{privacy} applies.", "Read our {privacy}"]) {
        const { unmount } = render(
          <NewsletterForm
            newsletter={commerceFixtures.en.marketing.newsletter.empty}
            copy={{ ...base, consent }}
            locale="en-US"
          />,
        );
        const sentence = screen.getByRole("link", { name: "privacy policy" }).parentElement;
        expect(plain(sentence?.textContent)).toBe(consent.replace("{privacy}", "privacy policy"));
        unmount();
      }
    });

    it("passes prefetch on to the link, and leaves it unset otherwise", () => {
      const { unmount } = setup("en", { prefetch: false });
      expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("false");
      unmount();
      setup("en");
      expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("undefined");
    });
  });

  describe("the states", () => {
    it("keeps a status region in the page in every state, so a change is announced", () => {
      for (const status of ["idle", "sending", "done", "error"] as const) {
        const { unmount } = setup("en", { status });
        const region = statusRegion();
        expect(region.getAttribute("aria-live")).toBe("polite");
        expect(screen.getAllByRole("status")).toHaveLength(1);
        unmount();
      }
    });

    it("is quiet when idle: nothing in the region, no error on the field", () => {
      setup();
      expect(statusRegion().textContent).toBe("");
      expect(field().getAttribute("aria-invalid")).toBeNull();
      expect(field().getAttribute("aria-describedby")).toBeNull();
      expect(field().readOnly).toBe(false);
    });

    it("announces a change of the region from empty to the message", () => {
      const props = {
        newsletter: commerceFixtures.en.marketing.newsletter.typed,
        copy: catalogs.en.molecules.newsletterForm,
        locale: "en-US",
      };
      const { rerender } = render(<NewsletterForm {...props} status="idle" />);
      const region = statusRegion();
      rerender(<NewsletterForm {...props} status="done" />);
      // The same element, so a screen reader sees its text change rather than a new region.
      expect(statusRegion()).toBe(region);
      expect(region.textContent).toBe("Thank you, you are subscribed.");
    });

    it("says it is done in the region, in words", () => {
      setup("en", { status: "done" });
      expect(within(statusRegion()).getByText("Thank you, you are subscribed.")).toBeTruthy();
      expect(field().getAttribute("aria-invalid")).toBeNull();
      // Still a form that can be used again.
      expect((submit() as HTMLButtonElement).type).toBe("submit");
    });

    it("says what went wrong in the region and ties it to the field, keeping the address", () => {
      setup("en", {
        status: "error",
        newsletter: commerceFixtures.en.marketing.newsletter.typed,
      });
      const message = within(statusRegion()).getByText(
        "We could not subscribe this address. Check it and try again.",
      );
      expect(field().getAttribute("aria-invalid")).toBe("true");
      const described = field().getAttribute("aria-describedby");
      expect(described).toBeTruthy();
      expect(message.parentElement?.id).toBe(described);
      expect(field().value).toBe("alex.morgan@example.com");
      expect(field().getAttribute("aria-describedby")).toBe(message.parentElement?.id);
      // Not by colour alone: an icon and words.
      expect(message.parentElement?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
    });

    it("sets its error apart from the field's other text: it is not in the label or the consent", () => {
      setup("en", { status: "error" });
      expect(field().labels?.[0]?.textContent).toBe("Email address");
    });

    describe("sending", () => {
      it("keeps the button, named for what is happening, and stops it submitting twice", () => {
        setup("en", { status: "sending" });
        const button = screen.getByRole("button", { name: "Subscribing…" }) as HTMLButtonElement;
        expect(button.type).toBe("button");
        // Base UI's focusableWhenDisabled: aria-disabled, so it stays in the tab order.
        expect(button.getAttribute("aria-disabled")).toBe("true");
        expect(button.disabled).toBe(false);
        expect(button.getAttribute("aria-busy")).toBe("true");
        expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
        expect(within(statusRegion()).getByText("Subscribing…")).toBeTruthy();
      });

      it("keeps the address in a field that is read-only, not disabled", () => {
        setup("en", {
          status: "sending",
          newsletter: commerceFixtures.en.marketing.newsletter.typed,
        });
        expect(field().readOnly).toBe(true);
        expect(field().disabled).toBe(false);
        expect(field().value).toBe("alex.morgan@example.com");
      });

      it("has no submit button that works: a click and Enter both do nothing", async () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        const user = userEvent.setup();
        const { container } = setup("en", {
          status: "sending",
          onSubmit,
          newsletter: commerceFixtures.en.marketing.newsletter.typed,
        });
        await user.click(screen.getByRole("button", { name: "Subscribing…" }));
        await user.click(field());
        await user.keyboard("{Enter}");
        expect(onSubmit).not.toHaveBeenCalled();
        // The first submit button is a disabled one, which is what stops Enter in a browser.
        const first = container.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(first?.disabled).toBe(true);
        expect(first?.hidden).toBe(true);
        expect(container.querySelectorAll('button[type="submit"]:not([disabled])')).toHaveLength(0);
      });

      it("has no hidden submit button in any other state", () => {
        for (const status of ["idle", "done", "error"] as const) {
          const { container, unmount } = setup("en", { status });
          expect(container.querySelectorAll("button[hidden]")).toHaveLength(0);
          unmount();
        }
      });

      it("keeps the button where it was, with the spinner hidden from assistive technology", () => {
        setup("en", { status: "sending" });
        const button = screen.getByRole("button", { name: "Subscribing…" });
        const spinner = button.querySelector("[data-slot=spinner]");
        expect(spinner?.closest("[aria-hidden=true]")).toBeTruthy();
      });
    });
  });

  describe("keyboard use", () => {
    it("tabs from the field to the button to the privacy link", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      expect(document.activeElement).toBe(field());
      await user.tab();
      expect(document.activeElement).toBe(submit());
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "privacy policy" }));
    });

    it("submits with the button, and with Enter in the field", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      setup("en", { onSubmit });
      await user.type(field(), "ada@example.com");
      await user.click(submit());
      expect(onSubmit).toHaveBeenCalledTimes(1);
      await user.click(field());
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("leaves focus on the button while it is sending", async () => {
      const user = userEvent.setup();
      const props = {
        newsletter: commerceFixtures.en.marketing.newsletter.typed,
        copy: catalogs.en.molecules.newsletterForm,
        locale: "en-US",
      };
      const { rerender } = render(<NewsletterForm {...props} />);
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(submit());
      rerender(<NewsletterForm {...props} status="sending" />);
      // Still the same button, not removed: a keyboard user is not thrown out of the form.
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Subscribing…" }));
    });
  });

  describe("the copy", () => {
    it.each(LOCALES)("reads in %s: heading, field, button and sentence", (locale) => {
      setup(locale);
      const copy = catalogs[locale].molecules.newsletterForm;
      expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
      expect(screen.getByRole("textbox", { name: copy.emailLabel })).toBeTruthy();
      expect(screen.getByRole("button", { name: copy.submit })).toBeTruthy();
      expect(screen.getByText(copy.description)).toBeTruthy();
    });

    it.each(LOCALES)("says done and error in %s", (locale) => {
      const copy = catalogs[locale].molecules.newsletterForm;
      const { unmount } = setup(locale, { status: "done" });
      expect(screen.getByText(copy.done)).toBeTruthy();
      unmount();
      setup(locale, { status: "error" });
      expect(screen.getByText(copy.error)).toBeTruthy();
    });
  });

  describe("sizes and long labels", () => {
    it("makes the field and the button at least 44 px high (D32)", () => {
      setup();
      expect(field().className).toContain("h-11");
      expect(submit().className).toContain("min-h-11");
    });

    it("gives the privacy link, a link in running text, no box of its own to size", () => {
      setup();
      const link = screen.getByRole("link", { name: "privacy policy" });
      // An inline link in a sentence is exempt (WCAG 2.5.8): it must not be a block or a flex item.
      expect(link.className).not.toMatch(/\b(?:block|flex|inline-flex)\b/);
    });

    it.each(["de", "el"] as const)("lets the longest copy, in %s, wrap", (locale) => {
      const { container } = setup(locale, {
        status: "error",
        newsletter: commerceFixtures[locale].marketing.newsletter.long,
      });
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      // The whole address is in the field, however long.
      const input = screen.getByRole("textbox", {
        name: catalogs[locale].molecules.newsletterForm.emailLabel,
      }) as HTMLInputElement;
      expect(input.value).toBe(commerceFixtures[locale].marketing.newsletter.long.email);
      expect(input.className).toContain("min-w-0");
    });

    it("sits on one row from a container's width, and stacks below it", () => {
      const { container } = setup();
      const row = container.querySelector("input")?.parentElement;
      expect(row?.className).toContain("flex-col");
      expect(row?.className).toContain("@md:flex-row");
      expect(container.querySelector("form")?.className).toContain("@container");
    });

    it("uses the focus ring at full strength on the field and the button", () => {
      setup();
      expect(field().className).toContain("focus-visible:ring-ring");
      expect(submit().className).toContain("focus-visible:ring-ring");
      expect(`${field().className} ${submit().className}`).not.toMatch(/ring-ring\/\d/);
    });
  });

  it("never fires a submit by itself (fireEvent.submit is the caller's)", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = setup("en", { onSubmit });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
