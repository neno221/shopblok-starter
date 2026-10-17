import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { SortSelect, type SortSelectProps } from "./sort-select";

const source = readFileSync(path.join(import.meta.dirname, "sort-select.tsx"), "utf8");
const clientSource = readFileSync(path.join(import.meta.dirname, "sort-select-client.tsx"), "utf8");

/** The sort of a hoodies listing with two filters chosen, in the locale's words. */
function sortProps(locale: Locale, selected = "newest"): SortSelectProps {
  const { options } = catalogs[locale].molecules.sortSelect;
  return {
    action: `${commerceFixtures[locale].prefix}/categories/women/clothing/hoodies`,
    name: "sort",
    options: [
      { value: "relevance", label: options.relevance },
      { value: "newest", label: options.newest },
      { value: "price-asc", label: options.priceAsc },
      { value: "price-desc", label: options.priceDesc },
    ],
    selected,
    params: [
      { name: "colour", value: "black" },
      { name: "size", value: "m" },
    ],
    copy: catalogs[locale].molecules.sortSelect,
  };
}

function setup(locale: Locale = "en", props: Partial<SortSelectProps> = {}) {
  return render(<SortSelect {...sortProps(locale)} {...props} />);
}

const select = () => screen.getByRole("combobox", { name: "Sort by" }) as HTMLSelectElement;
const form = () => document.querySelector("form") as HTMLFormElement;
const applyButton = () => screen.getByRole("button", { name: "Apply" });
const query = (target: HTMLFormElement) =>
  new URLSearchParams(new FormData(target) as unknown as Record<string, string>).toString();

/** `requestSubmit` in happy-dom would navigate; the tests only need to see that it is called. */
let requestSubmit: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
});
afterEach(() => {
  requestSubmit.mockRestore();
});

describe("SortSelect", () => {
  describe("without JavaScript", () => {
    // `renderToStaticMarkup` runs no effect and attaches no handler: the page before its script
    // loads, or when it never does. What it draws must be a form that works on its own.
    const markup = renderToStaticMarkup(<SortSelect {...sortProps("en")} />);

    afterEach(() => {
      document.body.innerHTML = "";
    });

    function parse() {
      document.body.innerHTML = markup;
      return document.querySelector("form") as HTMLFormElement;
    }

    it("is a GET form to the listing, with the select, its options and a submit button", () => {
      const html = parse();
      expect(html.getAttribute("method")).toBe("get");
      expect(html.getAttribute("action")).toBe("/us/categories/women/clothing/hoodies");
      const field = html.querySelector("select") as HTMLSelectElement;
      expect(field.name).toBe("sort");
      expect([...field.options].map((option) => [option.value, option.textContent])).toEqual([
        ["relevance", "Relevance"],
        ["newest", "Newest"],
        ["price-asc", "Price: low to high"],
        ["price-desc", "Price: high to low"],
      ]);
      expect(field.value).toBe("newest");
      expect(html.querySelector("option[selected]")?.getAttribute("value")).toBe("newest");
      expect(html.querySelector("button")?.getAttribute("type")).toBe("submit");
      expect(html.querySelector("button")?.textContent).toBe("Apply");
    });

    it("keeps the listing's other parameters as hidden inputs", () => {
      const html = parse();
      const hidden = [...html.querySelectorAll<HTMLInputElement>("input[type=hidden]")];
      expect(hidden.map((input) => [input.name, input.value])).toEqual([
        ["colour", "black"],
        ["size", "m"],
      ]);
    });

    it("sends the filters and the sort in the URL, as the browser would", () => {
      expect(query(parse())).toBe("colour=black&size=m&sort=newest");
    });

    it("sends another sort once it is chosen", () => {
      const html = parse();
      (html.querySelector("select") as HTMLSelectElement).value = "price-asc";
      expect(query(html)).toBe("colour=black&size=m&sort=price-asc");
    });

    it("has a label tied to the select, and no inline handler", () => {
      const html = parse();
      const field = html.querySelector("select") as HTMLSelectElement;
      const label = html.querySelector("label") as HTMLLabelElement;
      expect(label.textContent).toBe("Sort by");
      expect(label.htmlFor).toBe(field.id);
      expect(field.id).not.toBe("");
      expect(markup).not.toMatch(/\son[a-z]+=/);
    });
  });

  describe("structure", () => {
    it("is a labelled select in a form, with a submit button that stays", () => {
      setup();
      expect(form().getAttribute("method")).toBe("get");
      expect(select().name).toBe("sort");
      expect(select().value).toBe("newest");
      // The button is still there once the page is hydrated: a layout shift would be worse.
      expect(applyButton().getAttribute("type")).toBe("submit");
      expect(form().contains(applyButton())).toBe(true);
    });

    it("lists the options in order, in the copy's words", () => {
      setup();
      expect(
        within(select())
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["Relevance", "Newest", "Price: low to high", "Price: high to low"]);
    });

    it("selects the option the state names", () => {
      setup("en", { selected: "price-desc" });
      expect(select().value).toBe("price-desc");
    });

    it("gives each form its own select id, so several states on a page stay unique", () => {
      render(
        <>
          <SortSelect {...sortProps("en")} />
          <SortSelect {...sortProps("en", "relevance")} />
        </>,
      );
      const ids = [...document.querySelectorAll("select")].map((each) => each.id);
      expect(new Set(ids).size).toBe(2);
      for (const label of document.querySelectorAll("label")) {
        expect(document.getElementById(label.htmlFor)?.tagName).toBe("SELECT");
      }
    });

    it("sends no hidden input for a listing with no other parameter", () => {
      setup("en", { params: [] });
      expect(document.querySelectorAll("input")).toHaveLength(0);
      expect(query(form())).toBe("sort=newest");
    });

    it("passes the form's own props on and merges the class", () => {
      setup("en", { id: "sort-form", className: "justify-end" });
      expect(form().id).toBe("sort-form");
      expect(form().className).toContain("justify-end");
    });
  });

  describe("with JavaScript", () => {
    it("submits the form when an option is chosen with a pointer", async () => {
      const user = userEvent.setup();
      setup();
      await user.selectOptions(select(), "price-asc");
      expect(requestSubmit).toHaveBeenCalledTimes(1);
      expect((requestSubmit.mock.contexts[0] as HTMLFormElement).contains(select())).toBe(true);
      // The chosen sort is what the form carries.
      expect(query(form())).toBe("colour=black&size=m&sort=price-asc");
    });

    it("submits the form that holds the select, and no other", async () => {
      const user = userEvent.setup();
      render(
        <>
          <SortSelect {...sortProps("en")} id="first" />
          <SortSelect {...sortProps("en")} id="second" />
        </>,
      );
      const [, second] = screen.getAllByRole("combobox");
      await user.selectOptions(second as HTMLElement, "relevance");
      expect(requestSubmit.mock.contexts).toEqual([document.getElementById("second")]);
    });

    it("does not submit for a key pressed on the closed select: it could change on every arrow press", () => {
      setup();
      fireEvent.keyDown(select(), { key: "ArrowDown" });
      fireEvent.change(select(), { target: { value: "price-asc" } });
      fireEvent.keyUp(select(), { key: "ArrowDown" });
      expect(requestSubmit).not.toHaveBeenCalled();
      // The choice stands in the select, waiting for the button.
      expect(select().value).toBe("price-asc");
    });

    it("does not submit while type-ahead picks an option", () => {
      setup();
      fireEvent.keyDown(select(), { key: "p" });
      fireEvent.change(select(), { target: { value: "price-asc" } });
      fireEvent.keyUp(select(), { key: "p" });
      expect(requestSubmit).not.toHaveBeenCalled();
    });

    it("submits a choice made after the key came up (the list, opened and picked)", () => {
      setup();
      fireEvent.keyDown(select(), { key: "ArrowDown" });
      fireEvent.keyUp(select(), { key: "ArrowDown" });
      fireEvent.change(select(), { target: { value: "price-desc" } });
      expect(requestSubmit).toHaveBeenCalledTimes(1);
    });

    it("submits when Enter commits a choice from the opened list", () => {
      setup();
      fireEvent.keyDown(select(), { key: "Enter" });
      fireEvent.change(select(), { target: { value: "relevance" } });
      expect(requestSubmit).toHaveBeenCalledTimes(1);
    });

    it("forgets a key whose keyup went to the opened native list, at the next pointer press", () => {
      setup();
      // Space or Alt+ArrowDown opens the list; its keyup goes to the list, not the select.
      fireEvent.keyDown(select(), { key: " " });
      fireEvent.pointerDown(select());
      fireEvent.change(select(), { target: { value: "newest" } });
      expect(requestSubmit).toHaveBeenCalledTimes(1);
    });

    it("forgets a key held when focus leaves, so the next pointer choice submits", () => {
      setup();
      fireEvent.keyDown(select(), { key: "ArrowDown" });
      fireEvent.blur(select());
      fireEvent.change(select(), { target: { value: "newest" } });
      expect(requestSubmit).toHaveBeenCalledTimes(1);
    });

    it("applies a keyboard choice with the button: Tab to it, Enter", async () => {
      const user = userEvent.setup();
      // The real `requestSubmit` this time: the button's click is what submits.
      requestSubmit.mockRestore();
      setup();
      const submitted = vi.fn((event: Event) => event.preventDefault());
      form().addEventListener("submit", submitted);
      await user.tab();
      expect(document.activeElement).toBe(select());
      fireEvent.keyDown(select(), { key: "ArrowDown" });
      fireEvent.change(select(), { target: { value: "price-asc" } });
      fireEvent.keyUp(select(), { key: "ArrowDown" });
      await user.tab();
      expect(document.activeElement).toBe(applyButton());
      await user.keyboard("{Enter}");
      expect(submitted).toHaveBeenCalledTimes(1);
      expect(query(form())).toBe("colour=black&size=m&sort=price-asc");
    });

    it("is reached select first, then the button, with the ring at full strength", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      expect(document.activeElement).toBe(select());
      expect(select().className).toContain("focus-visible:ring-ring");
      await user.tab();
      expect(document.activeElement).toBe(applyButton());
      expect(applyButton().className).toContain("focus-visible:ring-ring");
    });
  });

  describe("sizes", () => {
    it("makes the select and the button at least 44 px tall (D32)", () => {
      setup();
      expect(select().className).toContain("h-11");
      expect(applyButton().className).toContain("min-h-11");
    });

    it("wraps its row when the room is short, and lets the select take the line", () => {
      setup();
      expect(form().className).toContain("flex-wrap");
      expect(select().closest("[data-slot=native-select-wrapper]")?.className).toContain(
        "basis-40",
      );
    });

    it("says in the select that it cuts the chosen option to the box (data-truncate)", () => {
      setup();
      expect(select().hasAttribute("data-truncate")).toBe(true);
    });
  });

  describe("copy", () => {
    it.each(LOCALES)("says its words in %s", (locale) => {
      const copy = catalogs[locale].molecules.sortSelect;
      setup(locale);
      expect(screen.getByRole("combobox", { name: copy.label })).toBeTruthy();
      expect(screen.getByRole("button", { name: copy.apply })).toBeTruthy();
      expect(
        within(screen.getByRole("combobox"))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(Object.values(copy.options));
    });

    it("has no English left in German", () => {
      setup("de");
      expect(screen.getByRole("combobox", { name: "Sortieren nach" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Anwenden" })).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/Sort by|Apply|Relevance|Newest/);
    });

    it.each(longLabels)("takes long %s labels without a clipping class", (_locale, strings) => {
      const { container } = setup("en", {
        copy: {
          ...catalogs.en.molecules.sortSelect,
          label: strings.fieldLabel,
          apply: strings.action,
        },
        options: [
          { value: "a", label: strings.optionLabel },
          { value: "b", label: strings.toggleLabel },
        ],
        selected: "a",
      });
      expect(screen.getByRole("combobox", { name: strings.fieldLabel })).toBeTruthy();
      expect(screen.getByRole("button", { name: strings.action })).toBeTruthy();
      expect(
        within(screen.getByRole("combobox"))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual([strings.optionLabel, strings.toggleLabel]);
      for (const element of container.querySelectorAll("*")) {
        // The select cuts its chosen option to the box on purpose and says so.
        if (element.tagName === "SELECT") continue;
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
    });
  });

  describe("which part is a client component", () => {
    it("is a server component that renders a small client part, and says why", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(clientSource).toMatch(/^"use client";$/m);
      expect(clientSource.split("\n")[0]).toMatch(/^\/\/ Ours/);
      expect(clientSource).toContain("a client component because");
    });
  });
});
