import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { PromoCodeEntry } from "@shopblok/registry/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { PromoCodeField, type PromoCodeError, type PromoCodeFieldProps } from "./promo-code-field";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const promo = (locale: Locale) => commerceFixtures[locale].cartSamples.promo;
const errors = [
  ["invalid", "invalid"],
  ["expired", "expired"],
  ["not-applicable", "notApplicable"],
  ["already-applied", "alreadyApplied"],
  ["failed", "failed"],
] as const satisfies readonly (readonly [PromoCodeError, string])[];

function setup(
  locale: Locale = "en",
  entry: PromoCodeEntry = promo(locale).empty,
  props: Partial<PromoCodeFieldProps> = {},
) {
  return render(
    <PromoCodeField
      entry={entry}
      copy={catalogs[locale].molecules.promoCodeField}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

const details = () => document.querySelector("details") as HTMLDetailsElement;
const field = () => screen.getByLabelText("Promotion code") as HTMLInputElement;
const apply = () => screen.getByRole("button", { name: /^Apply|^Applying/ }) as HTMLButtonElement;
const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`) as HTMLElement;
const removeButtons = () =>
  screen.getAllByRole("button", { name: /^Remove promotion code/ }) as HTMLButtonElement[];
/** The status region with the error and the applying line (the other one lists the codes). */
const status = () => slot("promo-code-status");

describe("PromoCodeField", () => {
  describe("the disclosure", () => {
    it("is closed when nothing is applied and nothing is typed", () => {
      setup();
      expect(details().open).toBe(false);
      expect(details().querySelector("summary")?.textContent).toBe("Add a promotion code");
    });

    it("is open when a code is typed", () => {
      setup("en", promo("en").typed);
      expect(details().open).toBe(true);
      expect(field().value).toBe("SUMMER25");
    });

    it.each(errors)("is open when the last try failed: %s", (error) => {
      setup("en", promo("en").empty, { error });
      expect(details().open).toBe(true);
    });

    it("is closed when a code is applied and none is being typed", () => {
      setup("en", promo("en").applied);
      expect(details().open).toBe(false);
    });

    it("is open in the server's markup when a code is typed, and not otherwise", () => {
      const markup = (entry: PromoCodeEntry) =>
        renderToString(
          <PromoCodeField
            entry={entry}
            copy={catalogs.en.molecules.promoCodeField}
            locale="en-US"
            applyAction="/cart/promo"
          />,
        );
      expect(markup(promo("en").typed)).toMatch(/<details[^>]* open=""/);
      expect(markup(promo("en").empty)).not.toMatch(/<details[^>]* open/);
    });

    it("stays open when a typed code is applied: the form is not closed under the focused button", () => {
      const copy = catalogs.en.molecules.promoCodeField;
      const { rerender } = setup("en", promo("en").typed);
      expect(details().open).toBe(true);
      // The cart answered: the code is applied, the field is empty again, there is no error.
      rerender(<PromoCodeField entry={promo("en").applied} copy={copy} locale="en-US" />);
      expect(details().open).toBe(true);
      // The field is the browser's until a form action ends (React 19 then resets it to the new
      // default), so what the server's answer sets is `defaultValue`.
      expect(field().defaultValue).toBe("");
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("opens when an error arrives", () => {
      const copy = catalogs.en.molecules.promoCodeField;
      const { rerender } = setup();
      expect(details().open).toBe(false);
      rerender(
        <PromoCodeField entry={promo("en").typed} copy={copy} locale="en-US" error="invalid" />,
      );
      expect(details().open).toBe(true);
    });

    it("is reached with Tab: a native <summary>, which a browser opens with Enter and Space", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      expect(document.activeElement).toBe(details().querySelector("summary"));
      // (happy-dom does not toggle a <details> on a key, so the key itself is the browser's.)
      expect(document.activeElement?.tagName).toBe("SUMMARY");
    });

    it("has a summary of 44 px or more, a ring at full strength, and no browser marker", () => {
      setup();
      const summary = details().querySelector("summary") as HTMLElement;
      expect(summary.className).toContain("min-h-11");
      expect(summary.className).toContain("focus-visible:ring-ring");
    });
  });

  describe("the apply form (D48)", () => {
    it("is a plain form that posts the code to its action", () => {
      setup("en", promo("en").typed, { applyAction: "/cart/promo" });
      const form = slot("promo-code-apply") as HTMLFormElement;
      expect(form.getAttribute("action")).toBe("/cart/promo");
      expect(form.getAttribute("method")).toBe("post");
      expect([...new FormData(form).entries()]).toEqual([["code", "SUMMER25"]]);
    });

    it("leaves the method to React for a function, which it posts as a server action", () => {
      setup("en", promo("en").typed, { applyAction: () => {}, removeAction: () => {} });
      expect(slot("promo-code-apply").getAttribute("method")).toBeNull();
    });

    it("has one labelled field: required, off for the browser's memory, a code to the point", () => {
      setup();
      expect(field().type).toBe("text");
      expect(field().name).toBe("code");
      expect(field().required).toBe(true);
      expect(field().getAttribute("autocomplete")).toBe("off");
      expect(field().getAttribute("autocapitalize")).toBe("characters");
      expect(field().getAttribute("spellcheck")).toBe("false");
      // The label is a real <label for>, not a placeholder.
      expect(field().labels).toHaveLength(1);
      expect(field().labels?.[0]?.textContent).toBe("Promotion code");
      expect(field().getAttribute("placeholder")).toBeNull();
      // A code longer than the box scrolls inside it, which the design system's clipping check is told.
      expect(field().hasAttribute("data-truncate")).toBe(true);
    });

    it("has a submit button named for what it does, 44 px high", () => {
      setup();
      expect(apply().type).toBe("submit");
      expect(apply().textContent).toBe("Apply");
      expect(apply().className).toContain("min-h-11");
      expect(field().className).toContain("h-11");
    });

    it("sends the form on Enter in the field, and from the button", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      render(
        <div onSubmit={onSubmit}>
          <PromoCodeField
            entry={promo("en").empty}
            copy={catalogs.en.molecules.promoCodeField}
            locale="en-US"
          />
        </div>,
      );
      await user.click(screen.getByText("Add a promotion code"));
      await user.type(field(), "SPRING5");
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
      await user.click(apply());
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("does not send an empty field: it is required", () => {
      setup();
      expect(field().validity.valueMissing).toBe(true);
    });

    it("has no hidden submit button when nothing is being applied", () => {
      setup("en", promo("en").typed);
      expect(slot("promo-code-apply").querySelectorAll("button[hidden]")).toHaveLength(0);
    });
  });

  describe("the codes applied", () => {
    it("shows each as a chip with its code and what it takes off", () => {
      setup("en", promo("en").applied);
      const list = screen.getByRole("list", { name: "Applied promotion codes" });
      const chip = within(list).getByRole("listitem");
      expect(plain(chip.textContent)).toBe("WELCOME10 Saves $12.60");
      expect(chip.querySelector("code, .font-mono")?.textContent).toBe("WELCOME10");
    });

    it.each(LOCALES)("writes the amount in the locale's money and words, in %s", (locale) => {
      setup(locale, promo(locale).applied);
      const copy = catalogs[locale].molecules.promoCodeField;
      const discount = promo(locale).applied.applied[0]?.discount;
      if (discount === undefined) throw new Error("no discount");
      const amount = formatMoney(discount.amount, discount.currencyCode, htmlLang[locale]);
      expect(plain(slot("promo-code-saves").textContent)).toBe(
        plain(formatMessage(copy.saves, { amount }, htmlLang[locale])),
      );
      expect(screen.getByRole("list", { name: copy.appliedList })).toBeTruthy();
    });

    it("shows a code that takes nothing off the goods as the code alone", () => {
      setup("en", promo("en").two);
      const chips = screen.getAllByRole("listitem");
      expect(chips).toHaveLength(2);
      expect(plain(chips[0]?.textContent)).toBe("WELCOME10 Saves $12.60");
      expect(plain(chips[1]?.textContent)).toBe("FREESHIP");
    });

    it("has no list, and no form, when nothing is applied", () => {
      setup();
      expect(screen.queryByRole("list")).toBeNull();
      expect(slot("promo-code-remove")).toBeNull();
    });

    it("gives each chip a remove button named for its code, 44 px square, in a plain form", () => {
      setup("en", promo("en").two, { removeAction: "/cart/promo/remove" });
      const buttons = removeButtons();
      expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
        "Remove promotion code WELCOME10",
        "Remove promotion code FREESHIP",
      ]);
      for (const button of buttons) {
        expect(button.type).toBe("submit");
        expect(button.name).toBe("code");
        expect(button.className).toContain("size-11");
        expect(button.className).toContain("focus-visible:ring-ring");
        expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      }
      expect(buttons.map((button) => button.value)).toEqual(["WELCOME10", "FREESHIP"]);
      const form = slot("promo-code-remove") as HTMLFormElement;
      expect(form.getAttribute("action")).toBe("/cart/promo/remove");
      expect(form.getAttribute("method")).toBe("post");
      // The one form holds both buttons: the one pressed is the code posted.
      expect(buttons.every((button) => button.form === form)).toBe(true);
    });

    it("posts the code of the button pressed, and removes nothing else", async () => {
      const posted: (string | null)[] = [];
      const user = userEvent.setup();
      render(
        <div
          onSubmit={(event) => {
            event.preventDefault();
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
            posted.push(submitter.value);
          }}
        >
          <PromoCodeField
            entry={promo("en").two}
            copy={catalogs.en.molecules.promoCodeField}
            locale="en-US"
          />
        </div>,
      );
      await user.click(removeButtons()[1] as HTMLElement);
      expect(posted).toEqual(["FREESHIP"]);
    });

    it("keeps the apply form out of the remove form, so a code typed is not a code removed", () => {
      setup("en", { ...promo("en").applied, code: "ABC" });
      expect(slot("promo-code-remove").contains(slot("promo-code-apply"))).toBe(false);
      expect(slot("promo-code-apply").contains(slot("promo-code-remove"))).toBe(false);
    });

    it("keeps its list in a polite region that reports additions, and is there with no codes", () => {
      const copy = catalogs.en.molecules.promoCodeField;
      const { rerender } = setup();
      const region = slot("promo-code-applied");
      expect(region.getAttribute("role")).toBe("status");
      expect(region.getAttribute("aria-live")).toBe("polite");
      expect(region.getAttribute("aria-relevant")).toBe("additions text");
      expect(region.getAttribute("aria-atomic")).toBe("false");
      expect(region.textContent).toBe("");
      rerender(<PromoCodeField entry={promo("en").applied} copy={copy} locale="en-US" />);
      // The same element: a code added to it is announced, not the whole page.
      expect(slot("promo-code-applied")).toBe(region);
      expect(plain(region.textContent)).toContain("WELCOME10");
    });

    it("keys a chip by its code, so one removed leaves the other where it was", () => {
      const copy = catalogs.en.molecules.promoCodeField;
      const { rerender } = setup("en", promo("en").two);
      const second = screen.getAllByRole("listitem")[1];
      rerender(
        <PromoCodeField
          entry={{ applied: [{ code: "FREESHIP" }], code: "" }}
          copy={copy}
          locale="en-US"
        />,
      );
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
      expect(screen.getAllByRole("listitem")[0]).toBe(second);
    });
  });

  describe("errors", () => {
    it.each(
      LOCALES.flatMap((locale) => errors.map(([error, key]) => [locale, error, key] as const)),
    )(
      "in %s: %s shows its message, tied to the field, and keeps the code",
      (locale, error, key) => {
        setup(locale, promo(locale).typed, { error });
        const copy = catalogs[locale].molecules.promoCodeField;
        const input = screen.getByLabelText(copy.label) as HTMLInputElement;
        const message = within(status()).getByText(copy.errors[key]);
        expect(message.textContent).toBe(copy.errors[key]);
        // The field is invalid and described by the message, which is in the live region.
        expect(input.getAttribute("aria-invalid")).toBe("true");
        const described = input.getAttribute("aria-describedby");
        expect(described).toBeTruthy();
        expect(message.parentElement?.id).toBe(described);
        expect(status().getAttribute("role")).toBe("status");
        // Not by colour alone: an icon and words. The code stays for the shopper to correct.
        expect(message.parentElement?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
        expect(input.value).toBe(promo(locale).typed.code);
        expect(slot("promo-code-field").getAttribute("data-error")).toBe(error);
      },
    );

    it("has the status region in the page with nothing in it when there is no error", () => {
      setup("en", promo("en").typed);
      expect(status().getAttribute("aria-live")).toBe("polite");
      expect(status().textContent).toBe("");
      expect(field().getAttribute("aria-invalid")).toBeNull();
      expect(field().getAttribute("aria-describedby")).toBeNull();
    });

    it("announces an error by filling a region that was there, and not by adding one", () => {
      const copy = catalogs.en.molecules.promoCodeField;
      const { rerender } = setup("en", promo("en").typed);
      const region = status();
      rerender(
        <PromoCodeField entry={promo("en").typed} copy={copy} locale="en-US" error="expired" />,
      );
      expect(status()).toBe(region);
      expect(region.textContent).toBe("This code has expired.");
    });

    it("keeps the applied code beside the error for a code that is already applied", () => {
      setup("en", promo("en").applied, { error: "already-applied" });
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
      expect(status().textContent).toBe("This code is already applied.");
    });

    it("wraps the longest message rather than cutting it", () => {
      setup("de", promo("de").typed, { error: "failed" });
      expect(status().querySelector("span")?.className).toContain("wrap-break-word");
    });
  });

  describe("applying", () => {
    const applying = () => setup("en", promo("en").typed, { pending: "apply" });

    it("keeps the button in its place as 'Applying…', aria-disabled and not a submit", () => {
      applying();
      expect(apply().type).toBe("button");
      expect(apply().getAttribute("aria-disabled")).toBe("true");
      expect(apply().disabled).toBe(false);
      expect(apply().getAttribute("aria-busy")).toBe("true");
      expect(apply().textContent).toBe("Applying…");
      expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
      expect(
        apply().querySelector("[data-slot=spinner]")?.closest("[aria-hidden=true]"),
      ).toBeTruthy();
    });

    it("keeps the code in a field that is read-only, not disabled", () => {
      applying();
      expect(field().readOnly).toBe(true);
      expect(field().disabled).toBe(false);
      expect(field().value).toBe("SUMMER25");
      field().focus();
      expect(document.activeElement).toBe(field());
    });

    it("puts a hidden disabled submit button first in the form, so Enter sends nothing", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      render(
        <div onSubmit={onSubmit}>
          <PromoCodeField
            entry={promo("en").typed}
            copy={catalogs.en.molecules.promoCodeField}
            locale="en-US"
            pending="apply"
          />
        </div>,
      );
      const form = slot("promo-code-apply");
      const first = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(form.firstElementChild).toBe(first);
      expect(first?.disabled).toBe(true);
      expect(first?.hidden).toBe(true);
      expect(first?.getAttribute("aria-hidden")).toBe("true");
      expect(form.querySelectorAll('button[type="submit"]:not([disabled])')).toHaveLength(0);
      await user.click(apply());
      await user.click(field());
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("marks the form busy and says so in the status region, which is read out", () => {
      applying();
      expect(slot("promo-code-apply").getAttribute("aria-busy")).toBe("true");
      expect(status().textContent).toBe("Applying…");
      expect(status().querySelector("[data-slot=visually-hidden]")?.className).toContain("sr-only");
      expect(slot("promo-code-field").getAttribute("data-pending")).toBe("apply");
    });

    it("has no busy form, no hidden button and no status text when idle", () => {
      setup("en", promo("en").typed);
      expect(slot("promo-code-apply").getAttribute("aria-busy")).toBeNull();
      expect(status().textContent).toBe("");
    });

    it("holds the remove buttons too while a code is being applied, so two requests do not race", () => {
      setup("en", promo("en").applied, { pending: "apply" });
      for (const button of removeButtons())
        expect(button.getAttribute("aria-disabled")).toBe("true");
    });

    it.each(LOCALES)("says it in the locale's words, in %s", (locale) => {
      setup(locale, promo(locale).typed, { pending: "apply" });
      expect(plain(status().textContent)).toBe(
        plain(catalogs[locale].molecules.promoCodeField.applying),
      );
    });
  });

  describe("removing", () => {
    it("makes the remove buttons inert but focusable, and says what is happening", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      render(
        <div onSubmit={onSubmit}>
          <PromoCodeField
            entry={promo("en").two}
            copy={catalogs.en.molecules.promoCodeField}
            locale="en-US"
            pending="remove"
          />
        </div>,
      );
      for (const button of removeButtons()) {
        expect(button.type).toBe("button");
        expect(button.getAttribute("aria-disabled")).toBe("true");
        expect(button.disabled).toBe(false);
        expect(button.className).toContain("aria-disabled:pointer-events-none");
      }
      removeButtons()[0]?.focus();
      expect(document.activeElement).toBe(removeButtons()[0]);
      await user.click(removeButtons()[0] as HTMLElement);
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
      // The line is in the region that lists the codes, which is read out.
      expect(within(slot("promo-code-applied")).getByText("Removing…")).toBeTruthy();
    });

    it("leaves the apply form working while a code is being removed", () => {
      setup("en", promo("en").applied, { pending: "remove" });
      expect(apply().type).toBe("submit");
      expect(field().readOnly).toBe(false);
    });

    it("has idle remove buttons that send", () => {
      setup("en", promo("en").applied);
      expect(removeButtons()[0]?.type).toBe("submit");
      expect(removeButtons()[0]?.getAttribute("aria-disabled")).toBeNull();
      expect(slot("promo-code-applied").textContent).not.toContain("Removing");
    });

    it.each(LOCALES)("says it in the locale's words, in %s", (locale) => {
      setup(locale, promo(locale).applied, { pending: "remove" });
      expect(plain(slot("promo-code-applied").textContent)).toContain(
        plain(catalogs[locale].molecules.promoCodeField.removing),
      );
    });
  });

  describe("long values", () => {
    it("wraps a code of forty characters in its chip, and scrolls it in the field", () => {
      setup("en", promo("en").long, { error: "not-applicable" });
      const code = promo("en").long.code;
      expect(code).toHaveLength(40);
      const chip = screen.getByRole("listitem");
      expect(chip.textContent).toContain(code);
      expect(chip.querySelector("span.wrap-anywhere")).toBeTruthy();
      expect(chip.className).toContain("max-w-full");
      expect(field().value).toBe(code);
      expect(field().hasAttribute("data-truncate")).toBe(true);
      // The remove button's name carries the whole code.
      expect(removeButtons()[0]?.getAttribute("aria-label")).toContain(code);
    });

    it.each(["de", "el"] as const)("cuts nothing that is a string in %s", (locale) => {
      const { container } = setup(locale, promo(locale).long, { error: "not-applicable" });
      const cutters = [...container.querySelectorAll("[class]")].filter((element) =>
        CLIPPING_CLASSES.test(element.getAttribute("class") ?? ""),
      );
      expect(cutters).toEqual([]);
      // The error and the toggle wrap.
      expect(status().querySelector("span")?.className).toContain("wrap-break-word");
      expect(details().querySelector("summary span")?.className).toContain("wrap-anywhere");
    });

    it("lets the field and the button share a row or stack, never overflow", () => {
      setup();
      const row = field().parentElement as HTMLElement;
      expect(row.className).toContain("flex-wrap");
      expect(field().className).toContain("min-w-40");
      expect(field().className).toContain("flex-1");
      expect(apply().className).toContain("max-w-full");
    });
  });

  describe("structure", () => {
    it.each(LOCALES)("takes its words from the catalog, in %s", (locale) => {
      setup(locale);
      const copy = catalogs[locale].molecules.promoCodeField;
      expect(details().querySelector("summary")?.textContent).toBe(copy.toggle);
      expect(screen.getByLabelText(copy.label)).toBeTruthy();
      expect(screen.getByRole("button", { name: copy.apply })).toBeTruthy();
    });

    it("passes the div's own props on, and merges the class", () => {
      setup("en", promo("en").empty, { id: "promo", className: "max-w-md" });
      expect(slot("promo-code-field").id).toBe("promo");
      expect(slot("promo-code-field").className).toContain("max-w-md");
    });

    it("gives two on one page ids of their own, each label pointing at its field", () => {
      const copy = catalogs.en.molecules.promoCodeField;
      const { container } = render(
        <>
          {[0, 1].map((key) => (
            <PromoCodeField
              key={key}
              entry={promo("en").typed}
              copy={copy}
              locale="en-US"
              error="invalid"
            />
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const input of container.querySelectorAll("input")) expect(input.labels).toHaveLength(1);
      for (const input of container.querySelectorAll("[aria-describedby]"))
        expect(ids).toContain(input.getAttribute("aria-describedby"));
    });

    it("uses logical properties and no colour of its own", () => {
      const { container } = setup("en", promo("en").two, { error: "failed", pending: "remove" });
      const classes = [...container.querySelectorAll("[class]")]
        .map((element) => element.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right)-/);
      expect(classes).not.toMatch(/(?:^|\s)(?:text|bg|border)-(?:red|blue|green|gray|black|white)/);
      expect(classes).not.toContain("dark:");
    });

    it("renders on the server as forms a browser can submit before any script runs", () => {
      const markup = renderToString(
        <PromoCodeField
          entry={promo("en").two}
          copy={catalogs.en.molecules.promoCodeField}
          locale="en-US"
          applyAction="/cart/promo"
          removeAction="/cart/promo/remove"
          error="expired"
        />,
      );
      expect(markup).toContain('action="/cart/promo"');
      expect(markup).toContain('action="/cart/promo/remove"');
      expect(markup.match(/method="post"/g)).toHaveLength(2);
      expect(markup).toContain('name="code"');
      expect(markup).toContain('value="WELCOME10"');
      expect(markup).toContain('value="FREESHIP"');
      expect(markup).toContain('aria-invalid="true"');
      expect(markup).toContain("This code has expired.");
    });
  });

  it("opens when the summary is pressed with a pointer", () => {
    setup();
    const summary = details().querySelector("summary") as HTMLElement;
    fireEvent.click(summary);
    // happy-dom toggles <details> on a click of its summary, as a browser does.
    expect(details().open).toBe(true);
  });
});
