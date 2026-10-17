import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { FreeShipping } from "@shopblok/registry/contracts";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FreeShippingProgress,
  shareReached,
  type FreeShippingProgressProps,
} from "./free-shipping-progress";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const samples = (locale: Locale) => commerceFixtures[locale].cartSamples.freeShipping;
const own = (locale: Locale): FreeShipping => {
  const found = commerceFixtures[locale].cart.freeShipping;
  if (found === undefined) throw new Error("the cart has no free shipping");
  return found;
};
/** An amount of dollars (the DS's en market), however many. */
const usd = (amount: number) => ({ amount, currencyCode: "USD" });
const progressOf = (threshold: number, remaining: number): FreeShipping => ({
  threshold: usd(threshold),
  remaining: usd(remaining),
});

function setup(
  locale: Locale = "en",
  freeShipping: FreeShipping = own(locale),
  props: Partial<FreeShippingProgressProps> = {},
) {
  return render(
    <FreeShippingProgress
      freeShipping={freeShipping}
      copy={catalogs[locale].molecules.freeShippingProgress}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

const bar = () => screen.getByRole("progressbar");
const region = () => screen.getByRole("status");

describe("shareReached", () => {
  it("is the share of the threshold already reached, in whole numbers", () => {
    expect(shareReached(progressOf(165, 39))).toBe(76);
    expect(shareReached(progressOf(100, 50))).toBe(50);
    expect(shareReached(progressOf(100, 100))).toBe(0);
    expect(shareReached(progressOf(150, 36))).toBe(76);
  });

  it("rounds down: a bar is never further than the cart is", () => {
    expect(shareReached(progressOf(300, 200))).toBe(33);
    expect(shareReached(progressOf(300, 100))).toBe(66);
    expect(shareReached(progressOf(1000, 4))).toBe(99);
  });

  it("is 100 only when nothing is left", () => {
    expect(shareReached(progressOf(165, 0))).toBe(100);
    expect(shareReached(progressOf(165, -5))).toBe(100);
    // A cent left is not full: the bar would say 100 beside “Add $0.01 more”.
    expect(shareReached(progressOf(165, 0.01))).toBe(99);
    expect(shareReached(progressOf(1_000_000, 0.01))).toBe(99);
  });

  it("is 0 for an empty cart, and never below it", () => {
    expect(shareReached(progressOf(165, 165))).toBe(0);
    expect(shareReached(progressOf(165, 200))).toBe(0);
  });
});

describe("FreeShippingProgress", () => {
  describe("the sentence", () => {
    it.each(LOCALES)("says how much is left, in the market's money, in %s", (locale) => {
      setup(locale);
      const free = own(locale);
      const copy = catalogs[locale].molecules.freeShippingProgress;
      const amount = formatMoney(
        free.remaining.amount,
        free.remaining.currencyCode,
        htmlLang[locale],
      );
      expect(plain(region().textContent)).toBe(
        plain(formatMessage(copy.remaining, { amount }, htmlLang[locale])),
      );
      expect(region().textContent).toContain(amount);
    });

    it("reads 'Add $39.00 more for free shipping' in English", () => {
      setup("en");
      expect(region().textContent).toBe("Add $39.00 more for free shipping");
    });

    it("puts the amount where the language's sentence needs it", () => {
      const copy = catalogs.en.molecules.freeShippingProgress;
      render(
        <FreeShippingProgress
          freeShipping={own("en")}
          copy={{ ...copy, remaining: "{amount} to go until shipping is free" }}
          locale="en-US"
        />,
      );
      expect(region().textContent).toBe("$39.00 to go until shipping is free");
    });

    it.each(LOCALES)("says it is reached, and no amount, in %s", (locale) => {
      setup(locale, samples(locale).reached);
      const copy = catalogs[locale].molecules.freeShippingProgress;
      expect(region().textContent).toBe(copy.reached);
      expect(region().textContent).not.toMatch(/\d/);
    });

    it("writes an amount of seven digits whole, and lets the sentence wrap", () => {
      setup("en", samples("en").large);
      expect(region().textContent).toBe("Add $987,654.32 more for free shipping");
      expect(region().querySelector("span")?.className).toContain("wrap-break-word");
      expect(region().innerHTML).not.toMatch(/truncate|whitespace-nowrap|line-clamp/);
    });

    it("writes the amount of a market with another currency", () => {
      setup("fr");
      expect(region().textContent).toContain("37.00");
      expect(region().textContent).toContain("CHF");
    });
  });

  describe("the bar", () => {
    it("is a progress bar named by the sentence, holding the share reached", () => {
      setup();
      const found = screen.getByRole("progressbar", { name: "Add $39.00 more for free shipping" });
      expect(found).toBe(bar());
      expect(bar().getAttribute("aria-valuenow")).toBe("76");
      expect(bar().getAttribute("aria-valuemin")).toBe("0");
      expect(bar().getAttribute("aria-valuemax")).toBe("100");
    });

    it("is named by the paragraph in the status region, not by a copy of it", () => {
      setup();
      const labelledBy = bar().getAttribute("aria-labelledby");
      expect(labelledBy).toBeTruthy();
      const target = document.getElementById(labelledBy ?? "");
      expect(target?.tagName).toBe("P");
      expect(region().contains(target)).toBe(true);
    });

    it.each(LOCALES)("holds the share reached by the cart's own numbers, in %s", (locale) => {
      setup(locale);
      expect(bar().getAttribute("aria-valuenow")).toBe(String(shareReached(own(locale))));
    });

    it("is empty for an empty cart, and under full for the last cent", () => {
      const { unmount } = setup("en", samples("en").empty);
      expect(bar().getAttribute("aria-valuenow")).toBe("0");
      unmount();
      setup("en", samples("en").almost);
      expect(bar().getAttribute("aria-valuenow")).toBe("99");
    });

    it("is full once the threshold is reached", () => {
      setup("en", samples("en").reached);
      expect(bar().getAttribute("aria-valuenow")).toBe("100");
      expect(screen.getByRole("progressbar", { name: "You get free shipping" })).toBe(bar());
    });

    it("is not a control: no button, no link, no field", () => {
      const { container } = setup();
      expect(container.querySelectorAll("a, button, input, select, textarea")).toHaveLength(0);
    });

    it("has a bar of the success colour once reached, and of the primary colour before", () => {
      // The indicator is the atom's: the success colour reaches it through the root's class.
      const { container, unmount } = setup("en", samples("en").reached);
      const root = () => container.querySelector("[data-slot=progress]");
      expect(root()?.className).toContain("[&_[data-slot=progress-indicator]]:bg-success");
      unmount();
      const before = setup();
      expect(before.container.querySelector("[data-slot=progress]")?.className).not.toContain(
        "bg-success",
      );
      expect(before.container.querySelector("[data-slot=progress-indicator]")?.className).toContain(
        "bg-primary",
      );
    });
  });

  describe("the icon", () => {
    it("is a truck on the way and a check once reached, never read out", () => {
      const { container, unmount } = setup();
      const icon = () => region().querySelector("svg");
      expect(icon()?.getAttribute("class")).toContain("lucide-truck");
      expect(icon()?.getAttribute("aria-hidden")).toBe("true");
      expect(container.firstElementChild?.hasAttribute("data-reached")).toBe(false);
      unmount();
      const reached = setup("en", samples("en").reached);
      expect(region().querySelector("svg")?.getAttribute("class")).toContain("lucide-circle-check");
      expect(region().querySelector("svg")?.getAttribute("class")).toContain("text-success");
      expect(reached.container.firstElementChild?.hasAttribute("data-reached")).toBe(true);
    });

    it("sits with the words: colour is not the only sign (WCAG 1.4.1)", () => {
      setup("en", samples("en").reached);
      expect(region().textContent).toBe("You get free shipping");
    });
  });

  describe("the status region", () => {
    it("is polite and in the page whatever the state", () => {
      for (const free of [samples("en").empty, own("en"), samples("en").reached]) {
        const { unmount } = setup("en", free);
        expect(region().getAttribute("aria-live")).toBe("polite");
        expect(screen.getAllByRole("status")).toHaveLength(1);
        unmount();
      }
    });

    it("changes its text in place when the cart changes, so it is announced once", () => {
      const copy = catalogs.en.molecules.freeShippingProgress;
      const { rerender } = setup();
      const before = region();
      rerender(
        <FreeShippingProgress freeShipping={samples("en").reached} copy={copy} locale="en-US" />,
      );
      expect(region()).toBe(before);
      expect(region().textContent).toBe("You get free shipping");
      expect(bar().getAttribute("aria-valuenow")).toBe("100");
    });
  });

  describe("structure", () => {
    it("passes the div's own props on, and merges the class", () => {
      const { container } = setup("en", own("en"), { id: "bar", className: "max-w-md" });
      expect(container.firstElementChild?.id).toBe("bar");
      expect(container.firstElementChild?.className).toContain("max-w-md");
      expect(container.firstElementChild?.getAttribute("data-slot")).toBe("free-shipping-progress");
    });

    it("gives two on one page ids of their own, each bar named by its own sentence", () => {
      const copy = catalogs.en.molecules.freeShippingProgress;
      render(
        <>
          <FreeShippingProgress freeShipping={own("en")} copy={copy} locale="en-US" />
          <FreeShippingProgress freeShipping={samples("en").reached} copy={copy} locale="en-US" />
        </>,
      );
      const bars = screen.getAllByRole("progressbar");
      const ids = bars.map((each) => each.getAttribute("aria-labelledby"));
      expect(new Set(ids).size).toBe(2);
      expect(screen.getByRole("progressbar", { name: "You get free shipping" })).toBe(bars[1]);
      expect(screen.getByRole("progressbar", { name: "Add $39.00 more for free shipping" })).toBe(
        bars[0],
      );
    });

    it("renders on the server with its bar and its sentence", () => {
      const markup = renderToStaticMarkup(
        <FreeShippingProgress
          freeShipping={own("de")}
          copy={catalogs.de.molecules.freeShippingProgress}
          locale="de-DE"
        />,
      );
      expect(markup).toContain('role="progressbar"');
      expect(markup).toContain('aria-valuenow="76"');
      expect(markup).toContain("Noch 36,00");
      expect(markup).toContain('role="status"');
    });

    it("is a plain block that can shrink: nothing in it has a width of its own", () => {
      const { container } = setup();
      expect(container.firstElementChild?.className).toContain("min-w-0");
      expect(container.firstElementChild?.className).toContain("flex-col");
    });
  });
});
