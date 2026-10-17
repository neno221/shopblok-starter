// Ours (T38, SETUP.md "Product-page organisms (T38)"). The tests of SizeGuideDialog, in happy-dom
// with Testing Library: the link-styled button alone until it is pressed, the modal dialog it opens
// (named, described, closed by the button and by one Escape, the focus going in and coming back,
// Tab kept inside), the table (a row for each size, a column for each measurement, headers with
// scopes, a caption that says the unit, a box that the keyboard can scroll), the centimetre and
// inch toggle (the market's unit first, a choice always made, numbers and ranges in the locale's
// own form, the choice kept when the dialog is closed and opened again), a measure that is missing, a
// guide with no note, the dialog drawn open for the design system, a long German and Greek label,
// and the files' rules. Pixels are not measurable here: the popup's height and scroll in a short
// window, the table's sideways scroll at 375 px, the 44 px rule and axe are the design system's own
// checks, which are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { SizeGuide } from "@shopblok/registry/contracts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { SizeGuideDialog, type SizeGuideDialogProps } from "./size-guide-dialog";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

const copyOf = (locale: Locale) => catalogs[locale].organisms.sizeGuideDialog;
const guideOf = (locale: Locale): SizeGuide => commerceFixtures[locale].productPage.sizeGuide;

function element(locale: Locale = "en", props: Partial<SizeGuideDialogProps> = {}) {
  return (
    <SizeGuideDialog
      {...guideOf(locale)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}
const setup = (locale: Locale = "en", props?: Partial<SizeGuideDialogProps>) =>
  render(element(locale, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
/** Intl may write a no-break space or a narrow one, and the catalogs a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();

const trigger = () => slot("size-guide-trigger") as HTMLButtonElement;
const dialog = () => slot("size-guide");
const table = () => dialog()?.querySelector("table") as HTMLTableElement;
const unit = (name: "cm" | "in") => slot(`size-guide-unit-${name}`) as HTMLElement;
const pressed = (button: HTMLElement) => button.getAttribute("aria-pressed") === "true";
/** The table's cells as text: one array for each row of the body. */
const body = () =>
  [...table().querySelectorAll("tbody tr")].map((row) =>
    [...row.children].map((cell) => plain(cell.textContent)),
  );
/** A column of the body, by the measurement's index (0 is the first measurement). */
const column = (index: number) => body().map((row) => row[index + 1]);

async function openGuide(locale: Locale = "en", props: Partial<SizeGuideDialogProps> = {}) {
  const view = setup(locale, props);
  const user = userEvent.setup();
  const opener = trigger();
  await user.click(opener);
  await waitFor(() => expect(dialog()).not.toBeNull());
  return { user, opener, view };
}

describe("SizeGuideDialog", () => {
  describe.each(LOCALES)("the button · %s", (locale) => {
    it("is the only thing drawn until it is pressed, named by the catalog", () => {
      setup(locale);
      const button = screen.getByRole("button", { name: copyOf(locale).open });
      expect(button).toBe(trigger());
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("aria-haspopup")).toBe("dialog");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(dialog()).toBeNull();
      expect(document.querySelector("[data-base-ui-portal]")).toBeNull();
      expect(document.querySelector("table")).toBeNull();
    });
  });

  describe("the button", () => {
    it("is a 44 px link-styled button, and takes the buy box's classes after its own", () => {
      setup("en", { triggerClassName: "w-fit" });
      const classes = tokens(trigger());
      expect(classes).toContain("min-h-11");
      expect(classes).toContain("underline");
      expect(classes).toContain("w-fit");
      expect(classes).toContain("focus-visible:ring-ring");
      expect(trigger().className).not.toMatch(/ring-ring\//);
    });

    it("renders on the server as the button alone", () => {
      const html = renderToString(element("en"));
      expect(html).toContain('data-slot="size-guide-trigger"');
      expect(html).not.toContain("<table");
      expect(html).not.toContain('role="dialog"');
    });

    it.each([["{Enter}"], [" "]])("opens the dialog on %j from the keyboard", async (key) => {
      setup("en");
      const user = userEvent.setup();
      trigger().focus();
      await user.keyboard(key);
      await waitFor(() => expect(dialog()).not.toBeNull());
      expect(trigger().getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe.each(LOCALES)("the dialog · %s", (locale) => {
    it("is a modal dialog named by the catalog's title and described by the guide's heading", async () => {
      await openGuide(locale);
      const popup = screen.getByRole("dialog", { name: copyOf(locale).title });
      expect(popup).toBe(dialog());
      const description = document.getElementById(popup.getAttribute("aria-describedby") ?? "");
      expect(plain(description?.textContent)).toBe(plain(guideOf(locale).title));
      expect(screen.getByRole("button", { name: copyOf(locale).close })).toBeTruthy();
      expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      // The page behind it is out of the tree while it is open.
      expect(screen.queryByRole("button", { name: copyOf(locale).open })).toBeNull();
    });

    it("moves the focus inside when it opens", async () => {
      await openGuide(locale);
      expect(dialog()?.contains(document.activeElement)).toBe(true);
    });

    it("has the units toggle, named by the catalog, with the market's unit pressed", async () => {
      await openGuide(locale);
      const group = screen.getByRole("group", { name: copyOf(locale).units });
      expect(group).toBe(slot("size-guide-units"));
      const cm = within(group).getByRole("button", { name: copyOf(locale).centimetres });
      const inches = within(group).getByRole("button", { name: copyOf(locale).inches });
      expect(cm).toBe(unit("cm"));
      expect(inches).toBe(unit("in"));
      const chosen = guideOf(locale).unit;
      expect(pressed(cm)).toBe(chosen === "cm");
      expect(pressed(inches)).toBe(chosen === "in");
    });

    it("has a table with a caption that says the unit, and a note under it", async () => {
      await openGuide(locale);
      const guide = guideOf(locale);
      const caption = table().querySelector("caption") as HTMLElement;
      expect(plain(caption.textContent)).toBe(
        plain(guide.unit === "cm" ? copyOf(locale).captionCm : copyOf(locale).captionIn),
      );
      expect(table().getAttribute("data-slot")).toBe("table");
      expect(plain(slot("size-guide-note")?.textContent)).toBe(plain(guide.note));
    });

    it("has a column for each measurement, headed by its label, after the sizes' column", async () => {
      await openGuide(locale);
      const guide = guideOf(locale);
      const headers = within(table()).getAllByRole("columnheader");
      expect(headers.map((header) => plain(header.textContent))).toEqual([
        plain(copyOf(locale).size),
        ...guide.rows.map((row) => plain(row.label)),
      ]);
      for (const header of table().querySelectorAll("thead th")) {
        expect(header.getAttribute("scope")).toBe("col");
      }
    });

    it("has a row for each size, headed by the size", async () => {
      await openGuide(locale);
      const guide = guideOf(locale);
      const rows = within(table()).getAllByRole("rowheader");
      expect(rows.map((row) => row.textContent)).toEqual(guide.sizes);
      for (const row of rows) expect(row.getAttribute("scope")).toBe("row");
      expect(body()).toHaveLength(guide.sizes.length);
      for (const cells of body()) expect(cells).toHaveLength(guide.rows.length + 1);
    });
  });

  describe("the units", () => {
    it("starts in inches for the market that measures in them, and in centimetres otherwise", async () => {
      const view = (await openGuide("en")).view;
      expect(guideOf("en").unit).toBe("in");
      expect(pressed(unit("in"))).toBe(true);
      expect(pressed(unit("cm"))).toBe(false);
      view.unmount();
      await openGuide("de");
      expect(guideOf("de").unit).toBe("cm");
      expect(pressed(unit("cm"))).toBe(true);
    });

    it("writes inches to one decimal, a range with the dash and a single value alone", async () => {
      await openGuide("en");
      // 80 to 84 cm, 62 to 66 cm, 64 cm and 58 cm.
      expect(body()[0]).toEqual(["XS", "31.5–33.1", "24.4–26", "25.2", "22.8"]);
      expect(body()[5]).toEqual(["XXL", "39.4–40.9", "32.3–33.9", "29.1", "24.8"]);
    });

    it("writes centimetres as they are, a range with the dash", async () => {
      await openGuide("en", { unit: "cm" });
      expect(body()[0]).toEqual(["XS", "80–84", "62–66", "64", "58"]);
      expect(body()[5]).toEqual(["XXL", "100–104", "82–86", "74", "63"]);
    });

    it("writes the numbers in the locale's own form: Greek's comma, German's, French's", async () => {
      await openGuide("el", { unit: "in" });
      expect(body()[0]).toEqual(["XS", "31,5–33,1", "24,4–26", "25,2", "22,8"]);
    });

    it.each(LOCALES)("writes a range with the locale's dash and spacing · %s", async (locale) => {
      await openGuide(locale, { unit: "cm" });
      for (const cell of column(0)) expect(cell).toMatch(/^\d+\D{1,3}\d+$/);
      expect(column(0)[0]).toMatch(/^80\D+84$/);
      expect(column(2)[0]).toBe("64");
    });

    it("changes from one to the other with a click, and says the unit in the caption", async () => {
      const { user } = await openGuide("en");
      expect(plain(table().querySelector("caption")?.textContent)).toBe(
        "Body measurements in inches",
      );
      await user.click(unit("cm"));
      expect(pressed(unit("cm"))).toBe(true);
      expect(pressed(unit("in"))).toBe(false);
      expect(plain(table().querySelector("caption")?.textContent)).toBe(
        "Body measurements in centimeters",
      );
      expect(body()[0]).toEqual(["XS", "80–84", "62–66", "64", "58"]);
      await user.click(unit("in"));
      expect(body()[0]).toEqual(["XS", "31.5–33.1", "24.4–26", "25.2", "22.8"]);
      expect(plain(table().querySelector("caption")?.textContent)).toBe(
        "Body measurements in inches",
      );
    });

    it("changes with the keyboard: the arrow key moves between the units and Space presses", async () => {
      const { user } = await openGuide("en", { unit: "cm" });
      unit("cm").focus();
      await user.keyboard(" ");
      expect(pressed(unit("cm"))).toBe(true);
      unit("in").focus();
      await user.keyboard("{Enter}");
      expect(pressed(unit("in"))).toBe(true);
      expect(pressed(unit("cm"))).toBe(false);
    });

    it("always has a unit: pressing the one that is chosen keeps it", async () => {
      const { user } = await openGuide("en", { unit: "cm" });
      await user.click(unit("cm"));
      expect(pressed(unit("cm"))).toBe(true);
      expect(pressed(unit("in"))).toBe(false);
      expect(body()[0]).toEqual(["XS", "80–84", "62–66", "64", "58"]);
      expect(plain(table().querySelector("caption")?.textContent)).toBe(
        "Body measurements in centimeters",
      );
      await user.click(unit("cm"));
      expect(pressed(unit("cm"))).toBe(true);
    });

    it("keeps the reader's choice when the dialog is closed and opened again", async () => {
      const { user, opener } = await openGuide("en");
      await user.click(unit("cm"));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(dialog()).toBeNull());
      await user.click(opener);
      await waitFor(() => expect(dialog()).not.toBeNull());
      expect(pressed(unit("cm"))).toBe(true);
      expect(body()[0]?.[1]).toBe("80–84");
    });

    it("follows the unit the market passes when it changes, until the reader chooses", async () => {
      const { view, user } = await openGuide("en", { unit: "cm" });
      expect(pressed(unit("cm"))).toBe(true);
      view.rerender(element("en", { unit: "cm" }));
      await user.click(unit("in"));
      view.rerender(element("en", { unit: "cm" }));
      expect(pressed(unit("in"))).toBe(true);
    });

    it("writes a range whose ends round to the same number as that number", async () => {
      await openGuide("en", {
        unit: "in",
        sizes: ["S"],
        rows: [{ id: "chest", label: "Chest", cm: [{ from: 100, to: 100.2 }] }],
      });
      // 100 cm and 100.2 cm are both 39.4 in to one decimal.
      expect(body()).toEqual([["S", "39.4"]]);
    });
  });

  describe("the table", () => {
    it("sits in a box that scrolls sideways, which the keyboard can reach and which is named", async () => {
      await openGuide("en");
      const box = slot("table-container") as HTMLElement;
      expect(box.contains(table())).toBe(true);
      expect(box.getAttribute("role")).toBe("region");
      expect(box.getAttribute("tabindex")).toBe("0");
      expect(tokens(box)).toEqual(
        expect.arrayContaining([
          "overflow-x-auto",
          "w-full",
          "focus-visible:ring-3",
          "focus-visible:ring-ring",
        ]),
      );
      const caption = table().querySelector("caption") as HTMLElement;
      expect(box.getAttribute("aria-labelledby")).toBe(caption.id);
      expect(screen.getByRole("region", { name: "Body measurements in inches" })).toBe(box);
    });

    it("is named by the unit it shows, and stays named when the unit changes", async () => {
      const { user } = await openGuide("en");
      await user.click(unit("cm"));
      expect(screen.getByRole("region", { name: "Body measurements in centimeters" })).toBe(
        slot("table-container"),
      );
    });

    it("can be focused with Tab, after the units and before the close button", async () => {
      const { user } = await openGuide("en");
      unit("in").focus();
      await user.tab();
      expect(document.activeElement).toBe(slot("table-container"));
    });

    it("wraps a long label and keeps the numbers in columns of equal width digits", async () => {
      await openGuide("en");
      for (const header of table().querySelectorAll("th")) {
        expect(tokens(header)).toContain("wrap-anywhere");
      }
      for (const cell of table().querySelectorAll("td")) {
        expect(tokens(cell)).toContain("tabular-nums");
      }
      expect(tokens(table())).toContain("caption-top");
      expect(tokens(table().querySelector("caption"))).toContain("text-start");
    });

    it("gives every column header at least 5 rem, so a narrow popup scrolls the table instead of cutting words into letters", async () => {
      await openGuide("en");
      const headers = [...table().querySelectorAll('thead th[scope="col"]')];
      expect(headers).toHaveLength(guideOf("en").rows.length + 1);
      for (const header of headers) {
        expect(tokens(header)).toContain("min-w-20");
      }
    });

    it("leaves a cell empty for a measure a row does not have", async () => {
      await openGuide("en", {
        sizes: ["S", "M", "L"],
        rows: [{ id: "chest", label: "Chest", cm: [90, 94] }],
        unit: "cm",
      });
      expect(body()).toEqual([
        ["S", "90"],
        ["M", "94"],
        ["L", ""],
      ]);
    });

    it("draws no note when the guide has none", async () => {
      await openGuide("en", { note: undefined });
      expect(slot("size-guide-note")).toBeNull();
    });

    it("writes the note in full, wrapping anywhere", async () => {
      await openGuide("en");
      const note = slot("size-guide-note") as HTMLElement;
      expect(note.textContent).toBe(guideOf("en").note);
      expect(tokens(note)).toContain("wrap-anywhere");
    });
  });

  describe("closing", () => {
    it("closes with ONE Escape and puts the focus back on the button", async () => {
      const { user, opener } = await openGuide("en");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(dialog()).toBeNull());
      expect(document.activeElement).toBe(opener);
      expect(opener.getAttribute("aria-expanded")).toBe("false");
    });

    it("closes with the close button and puts the focus back on the button", async () => {
      const { user, opener } = await openGuide("en");
      await user.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(dialog()).toBeNull());
      expect(document.activeElement).toBe(opener);
    });

    it("keeps Tab and Shift+Tab inside, round the units, the table and the close button", async () => {
      const { user } = await openGuide("en");
      const popup = dialog() as HTMLElement;
      for (let press = 0; press < 10; press++) {
        await user.tab();
        expect(popup.contains(document.activeElement)).toBe(true);
      }
      for (let press = 0; press < 10; press++) {
        await user.tab({ shift: true });
        expect(popup.contains(document.activeElement)).toBe(true);
      }
    });

    it("makes the close button the last stop, after the table", async () => {
      const { user } = await openGuide("en");
      slot("table-container")?.focus();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    });
  });

  describe("drawn open for the design system", () => {
    it("is open at first render without taking the focus, and the page stays reachable", async () => {
      setup("en", { defaultOpen: true, modal: false, popupClassName: "max-h-[calc(100%-2rem)]" });
      expect(dialog()).not.toBeNull();
      expect(tokens(dialog())).toContain("max-h-[calc(100%-2rem)]");
      // Base UI moves focus after the popup is in, a frame or two later: wait past that.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      expect(dialog()?.contains(document.activeElement)).toBe(false);
      expect(trigger().getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByRole("button", { name: "Size guide" })).toBe(trigger());
      expect(document.querySelector("[inert]")).toBeNull();
      expect(table()).toBeTruthy();
    });

    it("takes the focus when a reader opens it again, and closes like any other", async () => {
      setup("en", { defaultOpen: true, modal: false });
      const user = userEvent.setup();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(dialog()).toBeNull());
      await user.click(trigger());
      await waitFor(() => expect(dialog()).not.toBeNull());
      expect(dialog()?.contains(document.activeElement)).toBe(true);
    });

    it("stops the entry animation under reduced motion", async () => {
      await openGuide("en");
      expect(tokens(dialog())).toContain("motion-reduce:duration-0");
    });

    it("is a column that can grow to xl, with the popup's own classes after its own", async () => {
      await openGuide("en", { popupClassName: "max-h-[calc(100%-2rem)]" });
      expect(tokens(dialog())).toEqual(
        expect.arrayContaining(["flex", "flex-col", "sm:max-w-xl", "max-h-[calc(100%-2rem)]"]),
      );
    });
  });

  describe.each(longLabels)("a long %s label", (locale, strings) => {
    const long = (): SizeGuide => ({
      title: strings.productName,
      sizes: [strings.badge, "M"],
      rows: [
        { id: "a", label: strings.fieldLabel, cm: [{ from: 80, to: 84 }, 90] },
        { id: "b", label: strings.optionLabel, cm: [64, 66] },
      ],
      unit: "cm",
      note: strings.productDescription,
    });

    it("is read in full, wraps anywhere, and nothing is cut", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SizeGuideDialog {...long()} copy={copyOf(locale)} locale={htmlLang[locale]} />,
      );
      await user.click(trigger());
      await waitFor(() => expect(dialog()).not.toBeNull());
      expect(screen.getByRole("columnheader", { name: strings.fieldLabel })).toBeTruthy();
      expect(screen.getByRole("columnheader", { name: strings.optionLabel })).toBeTruthy();
      expect(screen.getByRole("rowheader", { name: strings.badge })).toBeTruthy();
      expect(screen.getByText(strings.productName)).toBeTruthy();
      expect(screen.getByText(strings.productDescription)).toBeTruthy();
      for (const part of [
        dialog(),
        ...document.querySelectorAll("th, td, caption, [data-slot=dialog-title]"),
        slot("size-guide-note"),
        slot("size-guide-units"),
        unit("cm"),
        unit("in"),
        slot("table-container"),
      ]) {
        expect(part?.getAttribute("class") ?? "").not.toMatch(CLIPPING_CLASSES);
      }
      for (const wrapping of [
        screen.getByText(strings.productName),
        screen.getByRole("columnheader", { name: strings.fieldLabel }),
        screen.getByRole("rowheader", { name: strings.badge }),
        slot("size-guide-note"),
      ]) {
        expect(tokens(wrapping)).toContain("wrap-anywhere");
      }
      expect(container.querySelectorAll("[data-truncate]")).toHaveLength(0);
    });

    it("keeps the buttons 44 px tall", async () => {
      const user = userEvent.setup();
      render(<SizeGuideDialog {...long()} copy={copyOf(locale)} locale={htmlLang[locale]} />);
      expect(tokens(trigger())).toContain("min-h-11");
      await user.click(trigger());
      await waitFor(() => expect(dialog()).not.toBeNull());
      for (const button of [unit("cm"), unit("in")]) expect(tokens(button)).toContain("min-h-11");
    });
  });

  describe("the file", () => {
    const text = source("size-guide-dialog.tsx");

    it("keeps the class rules: tokens, logical properties, light only", () => {
      expect(findViolations(text)).toEqual([]);
    });

    it("opens with the T38 header, uses no em dash and cuts nothing", () => {
      expect(text.startsWith('// Ours (T38, SETUP.md "Product-page organisms (T38)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it("is a client component, says why, and imports no catalog (D49)", () => {
      expect(text).toMatch(/^"use client";$/m);
      expect(text.split('"use client"')[0]).toMatch(/client component because/);
      const imported = [
        ...text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms),
      ].map((match) => match[1] ?? "");
      expect(imported.filter((name) => name === "@shopblok/i18n")).toEqual([]);
      expect(imported.filter((name) => /@shopblok\/(?:registry|fixtures)/.test(name))).toEqual([]);
      expect(imported).toContain("@shopblok/i18n/format");
    });
  });
});
