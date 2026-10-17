import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { CopyCodeChip, type CopyCodeChipProps } from "./copy-code-chip";
import { COPIED_MS } from "./copy-code-control";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

function setup(locale: Locale = "en", props: Partial<CopyCodeChipProps> = {}) {
  return render(
    <CopyCodeChip
      discount={commerceFixtures[locale].marketing.discountCode}
      copy={catalogs[locale].molecules.copyCodeChip}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

const button = (name = "Copy code WELCOME10") => screen.getByRole("button", { name });
const status = () => screen.getByRole("status");

// The clipboard is the browser's: a test puts its own in `navigator`, and puts the old one back.
const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
function useClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
}

/** Lets the click's promise settle inside React's act. */
const settle = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  window.getSelection()?.removeAllRanges();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

describe("CopyCodeChip", () => {
  describe("structure", () => {
    it("shows the code in monospace, selectable in one go, and a button that names it", () => {
      const { container } = setup();
      const code = container.querySelector("code");
      expect(code?.textContent).toBe("WELCOME10");
      expect(code?.className).toContain("font-mono");
      expect(code?.className).toContain("select-all");
      expect(button().textContent).toBe("Copy");
      expect((button() as HTMLButtonElement).type).toBe("button");
    });

    it("names the button for what it copies, with its visible word in the name (WCAG 2.5.3)", () => {
      setup();
      const name = button().getAttribute("aria-label") ?? "";
      expect(name).toBe("Copy code WELCOME10");
      expect(name.toLowerCase()).toContain((button().textContent ?? "").toLowerCase());
    });

    it.each(LOCALES)("keeps the visible word in the button's name in %s", (locale) => {
      setup(locale);
      const copy = catalogs[locale].molecules.copyCodeChip;
      const name = formatMessage(copy.label, { code: "WELCOME10" }, htmlLang[locale]);
      const found = screen.getByRole("button", { name });
      expect(found.textContent).toBe(copy.copy);
      expect(name.toLowerCase()).toContain(copy.copy.toLowerCase());
    });

    it("has a status region in the page from the start, empty and polite", () => {
      setup();
      expect(status().getAttribute("aria-live")).toBe("polite");
      expect(status().textContent).toBe("");
      // It keeps its height, so "Copied" appearing moves nothing.
      expect(status().className).toContain("min-h-5");
    });

    it("renders on the server with the code and the button's name in the markup", () => {
      const markup = renderToStaticMarkup(
        <CopyCodeChip
          discount={{ code: "SUMMER20" }}
          copy={catalogs.en.molecules.copyCodeChip}
          locale="en-US"
        />,
      );
      expect(markup).toContain(">SUMMER20</code>");
      expect(markup).toContain('aria-label="Copy code SUMMER20"');
    });

    it("passes the container's own props on, and merges the class", () => {
      const { container } = setup("en", { id: "banner-code", className: "w-full" });
      const root = container.firstElementChild as HTMLElement;
      expect(root.id).toBe("banner-code");
      expect(root.className).toContain("w-full");
    });

    it("draws the states a press leads to when it is told to start there", () => {
      const first = setup("en", { initialStatus: "copied" });
      expect(status().textContent).toBe("Copied");
      first.unmount();
      setup("en", { initialStatus: "failed" });
      expect(status().textContent).toBe("Select the code and copy it");
    });
  });

  describe("copying", () => {
    it("writes the code to the clipboard and says Copied, in the region", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      useClipboard({ writeText });
      setup();
      fireEvent.click(button());
      await settle();
      expect(writeText).toHaveBeenCalledExactlyOnceWith("WELCOME10");
      expect(status().textContent).toBe("Copied");
      expect(screen.getAllByRole("status")).toHaveLength(1);
    });

    it("shows Copied for two seconds, then clears the line", async () => {
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      setup();
      fireEvent.click(button());
      await settle();
      expect(status().textContent).toBe("Copied");
      act(() => void vi.advanceTimersByTime(COPIED_MS - 1));
      expect(status().textContent).toBe("Copied");
      act(() => void vi.advanceTimersByTime(1));
      expect(status().textContent).toBe("");
      expect(COPIED_MS).toBe(2000);
    });

    it("keeps the button's name when it works, and turns its icon into a check for as long", async () => {
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      setup();
      const icon = () => button().querySelector("svg")?.getAttribute("class") ?? "";
      expect(icon()).toContain("lucide-copy");
      fireEvent.click(button());
      await settle();
      expect(button().getAttribute("aria-label")).toBe("Copy code WELCOME10");
      expect(icon()).toContain("lucide-check");
      act(() => void vi.advanceTimersByTime(COPIED_MS));
      expect(icon()).toContain("lucide-copy");
      // Neither icon is read out.
      expect(button().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("writes the line again on a second press with the same outcome, so it is said again", async () => {
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      setup();
      fireEvent.click(button());
      await settle();
      const first = status().firstElementChild;
      fireEvent.click(button());
      await settle();
      expect(status().textContent).toBe("Copied");
      // A new node in the live region: the same text, announced again.
      expect(status().firstElementChild).not.toBe(first);
    });

    it("restarts the two seconds when pressed again", async () => {
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      setup();
      fireEvent.click(button());
      await settle();
      act(() => void vi.advanceTimersByTime(1500));
      fireEvent.click(button());
      await settle();
      act(() => void vi.advanceTimersByTime(1500));
      expect(status().textContent).toBe("Copied");
      act(() => void vi.advanceTimersByTime(500));
      expect(status().textContent).toBe("");
    });

    it("copies the code it shows, whatever it is", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      useClipboard({ writeText });
      setup("en", { discount: commerceFixtures.en.marketing.longDiscountCode });
      fireEvent.click(screen.getByRole("button"));
      await settle();
      expect(writeText).toHaveBeenCalledWith(commerceFixtures.en.marketing.longDiscountCode.code);
    });

    it.each(LOCALES)("says Copied in %s", async (locale) => {
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      setup(locale);
      fireEvent.click(screen.getByRole("button"));
      await settle();
      expect(status().textContent).toBe(catalogs[locale].molecules.copyCodeChip.copied);
    });

    it("stops its timer with the component: nothing is set after it is gone", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      const { unmount } = setup();
      fireEvent.click(button());
      await settle();
      unmount();
      expect(vi.getTimerCount()).toBe(0);
      act(() => void vi.advanceTimersByTime(COPIED_MS * 2));
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe("when the clipboard is refused or missing", () => {
    const selected = () => window.getSelection()?.toString() ?? "";

    it("selects the code and says to copy it, when the promise is rejected", async () => {
      useClipboard({
        writeText: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")),
      });
      setup();
      fireEvent.click(button());
      await settle();
      expect(selected()).toBe("WELCOME10");
      expect(status().textContent).toBe("Select the code and copy it");
      // Not Copied: nothing was.
      expect(screen.queryByText("Copied")).toBeNull();
    });

    it("does the same when there is no clipboard at all (a page that is not secure)", async () => {
      useClipboard(undefined);
      expect(navigator.clipboard).toBeUndefined();
      setup();
      fireEvent.click(button());
      await settle();
      expect(selected()).toBe("WELCOME10");
      expect(status().textContent).toBe("Select the code and copy it");
    });

    it("does the same when the call throws before it returns a promise", async () => {
      useClipboard({
        writeText: () => {
          throw new TypeError("not allowed");
        },
      });
      setup();
      fireEvent.click(button());
      await settle();
      expect(selected()).toBe("WELCOME10");
      expect(status().textContent).toBe("Select the code and copy it");
    });

    it("keeps the instruction up: it does not clear itself", async () => {
      useClipboard(undefined);
      setup();
      fireEvent.click(button());
      await settle();
      act(() => void vi.advanceTimersByTime(60_000));
      expect(status().textContent).toBe("Select the code and copy it");
    });

    it("recovers: a press that works replaces the instruction with Copied", async () => {
      useClipboard(undefined);
      setup();
      fireEvent.click(button());
      await settle();
      useClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
      fireEvent.click(button());
      await settle();
      expect(status().textContent).toBe("Copied");
    });

    it("selects only the code, not the page around it", async () => {
      useClipboard(undefined);
      render(
        <p>
          Use{" "}
          <CopyCodeChip
            discount={{ code: "SUMMER20" }}
            copy={catalogs.en.molecules.copyCodeChip}
            locale="en-US"
          />{" "}
          at checkout
        </p>,
      );
      fireEvent.click(screen.getByRole("button"));
      await settle();
      expect(selected()).toBe("SUMMER20");
    });

    it.each(LOCALES)("says to select the code in %s", async (locale) => {
      useClipboard(undefined);
      setup(locale);
      fireEvent.click(screen.getByRole("button"));
      await settle();
      expect(status().textContent).toBe(catalogs[locale].molecules.copyCodeChip.fallback);
    });
  });

  describe("keyboard use", () => {
    it("is reached with Tab, copies with Enter and with Space, and keeps focus", async () => {
      vi.useRealTimers();
      const writeText = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      // After `setup`: user-event puts a clipboard of its own in `navigator`.
      useClipboard({ writeText });
      setup();
      await user.tab();
      expect(document.activeElement).toBe(button());
      await user.keyboard("{Enter}");
      expect(writeText).toHaveBeenCalledTimes(1);
      await user.keyboard(" ");
      expect(writeText).toHaveBeenCalledTimes(2);
      expect(document.activeElement).toBe(button());
      expect(status().textContent).toBe("Copied");
    });

    it("has nothing else to tab to: the code is text", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      setup();
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe("sizes and long labels", () => {
    it("makes the button at least 44 px high and 44 wide (D32)", () => {
      setup();
      expect(button().className).toContain("min-h-11");
      // Padding and a label: wider than 44 px by construction (px-4 on "Copy").
      expect(button().className).toContain("px-4");
    });

    it("draws the focus ring at full strength", () => {
      setup();
      expect(button().className).toContain("focus-visible:ring-ring");
      expect(button().className).not.toMatch(/ring-ring\/\d/);
    });

    it("wraps a code that is as long as the contract allows and has nowhere to break", () => {
      const long = commerceFixtures.en.marketing.longDiscountCode;
      const { container } = setup("en", { discount: long });
      const code = container.querySelector("code");
      expect(code?.textContent).toBe(long.code);
      expect(long.code).toHaveLength(40);
      expect(code?.className).toContain("wrap-anywhere");
      expect(code?.className).toContain("min-w-0");
      // The chip may shrink to its container, so the code can take lines instead of width.
      expect(container.firstElementChild?.className).toContain("max-w-full");
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
    });

    it.each(["de", "el"] as const)("lets the longest copy, in %s, wrap", async (locale) => {
      useClipboard(undefined);
      const { container } = setup(locale, {
        discount: commerceFixtures[locale].marketing.longDiscountCode,
        initialStatus: "failed",
      });
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      expect(status().textContent).toBe(catalogs[locale].molecules.copyCodeChip.fallback);
      expect(status().querySelector("span")?.className).toContain("wrap-break-word");
    });
  });
});
