import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { SearchField, type SearchFieldProps } from "./search-field";

const source = readFileSync(path.join(import.meta.dirname, "search-field.tsx"), "utf8");
const clientSource = readFileSync(
  path.join(import.meta.dirname, "search-field-client.tsx"),
  "utf8",
);

const fixtures = (locale: Locale) => commerceFixtures[locale];

function fieldProps(locale: Locale, query = ""): SearchFieldProps {
  return {
    action: `${fixtures(locale).prefix}/search`,
    query,
    copy: catalogs[locale].molecules.searchField,
  };
}

function setup(locale: Locale = "en", query = "", props: Partial<SearchFieldProps> = {}) {
  return render(<SearchField {...fieldProps(locale, query)} {...props} />);
}

const box = () => screen.getByRole("searchbox", { name: "Search products" }) as HTMLInputElement;
const clearButton = () => screen.queryByRole("button", { name: "Clear search" });
const form = () => document.querySelector("form") as HTMLFormElement;

describe("SearchField", () => {
  describe("structure", () => {
    it("is a search landmark named by the copy, around a GET form to the search page", () => {
      setup("en", "hoodie");
      const landmark = screen.getByRole("search", { name: "Search products" });
      expect(within(landmark).getByRole("searchbox")).toBeTruthy();
      expect(within(landmark).getByRole("button", { name: "Search" })).toBeTruthy();
      expect(form().getAttribute("method")).toBe("get");
      expect(form().getAttribute("action")).toBe("/us/search");
      expect(landmark.contains(form())).toBe(true);
      // The form itself is not a second landmark: it has no name.
      expect(form().getAttribute("aria-label")).toBeNull();
      expect(screen.getAllByRole("search")).toHaveLength(1);
    });

    it("is a labelled search input named q, with the Enter key saying 'search'", () => {
      setup("en", "hoodie");
      expect(box().type).toBe("search");
      expect(box().name).toBe("q");
      expect(box().value).toBe("hoodie");
      expect(box().getAttribute("enterkeyhint")).toBe("search");
      expect(box().getAttribute("aria-label")).toBe("Search products");
      expect(box().getAttribute("placeholder")).toBe("Search products");
      expect(box().getAttribute("autocapitalize")).toBe("off");
      expect(box().getAttribute("spellcheck")).toBe("false");
    });

    it("says that a long query is cut by the box and scrolls (data-truncate, the DS clip check)", () => {
      setup("en", "hoodie");
      expect(box().hasAttribute("data-truncate")).toBe(true);
    });

    it("takes another parameter name", () => {
      setup("en", "tee", { name: "query" });
      expect(box().name).toBe("query");
      expect(
        new URLSearchParams(new FormData(form()) as unknown as Record<string, string>).get("query"),
      ).toBe("tee");
    });

    it("has a submit button with its text", () => {
      setup();
      const submit = screen.getByRole("button", { name: "Search" });
      expect(submit.getAttribute("type")).toBe("submit");
      expect(form().contains(submit)).toBe(true);
    });

    it("hides the magnifier and the clear icon from assistive technology", () => {
      setup("en", "hoodie");
      for (const icon of document.querySelectorAll("svg")) {
        expect(icon.getAttribute("aria-hidden")).toBe("true");
      }
    });

    it("keeps the browser's own clear mark and magnifier from doubling ours", () => {
      setup("en", "hoodie");
      expect(box().className).toContain("[&::-webkit-search-cancel-button]:appearance-none");
      expect(box().className).toContain("[&::-webkit-search-decoration]:appearance-none");
    });

    it("passes the landmark's own props on and merges the class", () => {
      setup("en", "", { id: "site-search", className: "max-w-xl" });
      const landmark = screen.getByRole("search");
      expect(landmark.id).toBe("site-search");
      expect(landmark.className).toContain("max-w-xl");
    });
  });

  describe("the clear button", () => {
    it("is not there while the field is empty", () => {
      setup();
      expect(clearButton()).toBeNull();
    });

    it("is there when the field starts with a query, and when text is typed", async () => {
      const user = userEvent.setup();
      const first = setup("en", "hoodie");
      expect(clearButton()).toBeTruthy();
      first.unmount();
      setup();
      await user.type(box(), "tee");
      expect(clearButton()).toBeTruthy();
    });

    it("goes again when the text is deleted by hand", async () => {
      const user = userEvent.setup();
      setup("en", "ab");
      await user.type(box(), "{Backspace}{Backspace}");
      expect(box().value).toBe("");
      expect(clearButton()).toBeNull();
    });

    it("empties the field and returns focus to it, without submitting", async () => {
      const user = userEvent.setup();
      setup("en", "hoodie");
      const submitted = vi.fn((event: Event) => event.preventDefault());
      form().addEventListener("submit", submitted);
      await user.click(clearButton() as HTMLElement);
      expect(box().value).toBe("");
      expect(document.activeElement).toBe(box());
      expect(clearButton()).toBeNull();
      expect(submitted).not.toHaveBeenCalled();
    });

    it("clears from the keyboard: Tab to it, Enter, and the caret is in the field", async () => {
      const user = userEvent.setup();
      setup("en", "hoodie");
      await user.tab();
      expect(document.activeElement).toBe(box());
      await user.tab();
      expect(document.activeElement).toBe(clearButton());
      await user.keyboard("{Enter}");
      expect(box().value).toBe("");
      expect(document.activeElement).toBe(box());
    });

    it("is a 44 × 44 px button of its own, not a submit", () => {
      setup("en", "hoodie");
      const clear = clearButton() as HTMLElement;
      expect(clear.className).toContain("size-11");
      expect(clear.getAttribute("type")).toBe("button");
      expect(clear.className).toContain("focus-visible:ring-ring");
    });

    it("starts again from a new query the server sends", () => {
      const { rerender } = setup("en", "hoodie");
      rerender(<SearchField {...fieldProps("en", "tee")} />);
      expect(box().value).toBe("tee");
      rerender(<SearchField {...fieldProps("en", "")} />);
      expect(box().value).toBe("");
      expect(clearButton()).toBeNull();
    });
  });

  describe("without JavaScript", () => {
    // `renderToStaticMarkup` runs no effect and attaches no handler, which is what the page is
    // before its script loads (or when it never does).
    const markup = renderToStaticMarkup(<SearchField {...fieldProps("en", "hoodie")} />);

    afterEach(() => {
      document.body.innerHTML = "";
    });

    function parse() {
      document.body.innerHTML = markup;
      return document.querySelector("form") as HTMLFormElement;
    }

    it("is a working GET form: the action, the search input with the query, and a submit button", () => {
      const html = parse();
      expect(html.getAttribute("method")).toBe("get");
      expect(html.getAttribute("action")).toBe("/us/search");
      const input = html.querySelector("input[type=search]") as HTMLInputElement;
      expect(input.name).toBe("q");
      expect(input.value).toBe("hoodie");
      expect(html.querySelector("button[type=submit]")?.textContent).toBe("Search");
      // What the browser would put in the URL.
      expect(
        new URLSearchParams(new FormData(html) as unknown as Record<string, string>).toString(),
      ).toBe("q=hoodie");
    });

    it("draws no clear button yet: it could do nothing until the page has hydrated", () => {
      parse();
      expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("has no inline handler", () => {
      expect(markup).not.toMatch(/\son[a-z]+=/);
    });
  });

  describe("the submit", () => {
    it("sends the query when Enter is pressed in the field", async () => {
      const user = userEvent.setup();
      setup("en", "");
      const sent: string[] = [];
      form().addEventListener("submit", (event) => {
        event.preventDefault();
        sent.push(
          new URLSearchParams(new FormData(form()) as unknown as Record<string, string>).toString(),
        );
      });
      await user.type(box(), "wool socks{Enter}");
      expect(sent).toEqual(["q=wool+socks"]);
    });

    it("sends it when the button is pressed", async () => {
      const user = userEvent.setup();
      setup("en", "");
      const sent: string[] = [];
      form().addEventListener("submit", (event) => {
        event.preventDefault();
        sent.push(new FormData(form()).get("q") as string);
      });
      await user.type(box(), "tee");
      await user.click(screen.getByRole("button", { name: "Search" }));
      expect(sent).toEqual(["tee"]);
    });
  });

  describe("keyboard", () => {
    it("is reached input, clear, submit, in that order", async () => {
      const user = userEvent.setup();
      setup("en", "hoodie");
      await user.tab();
      expect(document.activeElement).toBe(box());
      await user.tab();
      expect(document.activeElement).toBe(clearButton());
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Search" }));
    });

    it("is reached input, submit when there is no text", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      expect(document.activeElement).toBe(box());
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Search" }));
    });
  });

  describe("sizes", () => {
    it("makes the input, the submit button and the clear button at least 44 px tall", () => {
      setup("en", "hoodie");
      expect(box().className).toContain("h-11");
      expect(screen.getByRole("button", { name: "Search" }).className).toContain("min-h-11");
      expect(document.querySelector("[data-slot=input-group]")?.className).toContain("min-h-11");
    });

    it("draws the ring at full strength on the group, the button and the clear button", () => {
      setup("en", "hoodie");
      expect(document.querySelector("[data-slot=input-group]")?.className).toContain(
        "has-[[data-slot=input-group-control]:focus-visible]:ring-ring",
      );
      for (const button of screen.getAllByRole("button")) {
        expect(button.className).toContain("focus-visible:ring-ring");
      }
    });

    it("lets the button wrap below the field when the room is short", () => {
      setup();
      expect(form().className).toContain("flex-wrap");
      expect(document.querySelector("[data-slot=input-group]")?.className).toContain("basis-48");
    });
  });

  describe("copy", () => {
    it.each(LOCALES)("says its words in %s", (locale) => {
      const copy = catalogs[locale].molecules.searchField;
      setup(locale, "hoodie");
      expect(screen.getByRole("search", { name: copy.label })).toBeTruthy();
      expect(screen.getByRole("searchbox", { name: copy.label }).getAttribute("placeholder")).toBe(
        copy.placeholder,
      );
      expect(screen.getByRole("button", { name: copy.submit })).toBeTruthy();
      expect(screen.getByRole("button", { name: copy.clear })).toBeTruthy();
    });

    it("has no English left in German", () => {
      setup("de", "Hoodie");
      expect(screen.getByRole("searchbox", { name: "Produkte suchen" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Suchen" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Suche löschen" })).toBeTruthy();
      expect(document.body.innerHTML).not.toMatch(/Search|Clear/);
    });

    it.each(longLabels)("takes long %s labels without a clipping class", (_locale, strings) => {
      const copy = {
        label: strings.fieldLabel,
        placeholder: strings.placeholder,
        submit: strings.action,
        clear: strings.hint,
      };
      const { container } = setup("en", strings.productName, { copy });
      expect(screen.getByRole("search", { name: strings.fieldLabel })).toBeTruthy();
      expect(screen.getByRole("button", { name: strings.action })).toBeTruthy();
      expect(screen.getByRole("button", { name: strings.hint })).toBeTruthy();
      expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe(strings.productName);
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
    });
  });

  describe("which part is a client component", () => {
    it("is a server component that renders a small client part, and says why", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(clientSource).toMatch(/^"use client";$/m);
      expect(clientSource.split("\n")[0]).toMatch(/^\/\/ Ours/);
      expect(clientSource).toContain("A client component because");
    });
  });
});
