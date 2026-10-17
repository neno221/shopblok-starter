// Ours (T37, SETUP.md "Listing organisms (T37)"). SearchOverlay's tests, in Testing Library and
// happy-dom: the button, the dialog it opens and where the focus goes, the field and its GET form,
// the four states of the list (recent queries, results, loading, no results), the keyboard (the
// arrow keys, Enter on a link, on a query and on nothing, and ONE Escape closing the dialog), the
// status region (one announcement per question, none per key), the links a plain click closes the
// dialog for, a long German and Greek label, the four catalogs and a read of the files' imports
// (D49). Pixels are not measurable here: the layout, the clipping and the 44 px rule belong to the
// design-system job's browser checks, which the lead runs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { SearchResult } from "@shopblok/registry/contracts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { SearchOverlay, type SearchOverlayProps } from "./search-overlay";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.searchOverlay;
const priceCopyOf = (locale: Locale) => catalogs[locale].molecules.priceBlock;
const samples = (locale: Locale) => commerceFixtures[locale].listing.search;
/** Intl, the catalogs and Base UI's live region may write a no-break space or a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();

type Sample = "idle" | "results" | "loading" | "empty";

function element(locale: Locale, sample: Sample, props: Partial<SearchOverlayProps> = {}) {
  return (
    <SearchOverlay
      {...samples(locale)[sample]}
      copy={copyOf(locale)}
      priceCopy={priceCopyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const trigger = () => slot("search-overlay-trigger") as HTMLButtonElement;
const dialog = () => slot("search-overlay");
const field = () => document.querySelector<HTMLInputElement>('input[role="combobox"]');
const list = () => slot("search-overlay-list");
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const status = () => plain(slot("search-overlay-status")?.textContent);
const submit = () => slot("search-overlay-submit");
/** Every class of every element in `root` (SVG elements have no string `className`). */
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

/** The links a click reached, and none followed for real: happy-dom would navigate. */
const followed: string[] = [];
function follow(event: Event) {
  const anchor = (event.target as Element).closest("a");
  if (anchor === null) return;
  followed.push(anchor.getAttribute("href") ?? "");
  event.preventDefault();
}
beforeEach(() => {
  followed.length = 0;
  document.addEventListener("click", follow);
});
afterEach(() => {
  document.removeEventListener("click", follow);
});

async function openOverlay(
  locale: Locale = "en",
  sample: Sample = "results",
  props: Partial<SearchOverlayProps> = {},
) {
  const view = render(element(locale, sample, props));
  const user = userEvent.setup();
  const opener = trigger();
  await user.click(opener);
  await waitFor(() => expect(dialog()).not.toBeNull());
  return { user, opener, view };
}

describe("SearchOverlay: the button", () => {
  it.each(LOCALES)(
    "is the only thing drawn until it is pressed, named for its job, in %s",
    (locale) => {
      render(element(locale, "results"));
      const button = trigger();
      expect(button.tagName).toBe("BUTTON");
      expect(screen.getByRole("button", { name: copyOf(locale).open })).toBe(button);
      expect(button.getAttribute("aria-haspopup")).toBe("dialog");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(dialog()).toBeNull();
      expect(document.querySelector("[data-base-ui-portal]")).toBeNull();
    },
  );

  it("is 44 px square, draws a hidden icon, and takes the header's classes after its own", () => {
    render(element("en", "idle", { triggerClassName: "lg:hidden" }));
    const button = trigger();
    expect(button.className).toContain("size-11");
    expect(button.className).toContain("lg:hidden");
    expect(button.className).toContain("focus-visible:ring-ring");
    expect(button.className).not.toMatch(/ring-ring\//);
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(within(button).getByText("Search").className).toContain("sr-only");
  });

  it("renders on the server as the button alone", () => {
    const html = renderToString(element("en", "results"));
    expect(html).toContain('data-slot="search-overlay-trigger"');
    expect(html).not.toContain("search-overlay-list");
    expect(html).not.toContain('role="dialog"');
  });

  it.each([["{Enter}"], [" "]])("opens the dialog on %j from the keyboard", async (key) => {
    render(element("en", "idle"));
    const user = userEvent.setup();
    trigger().focus();
    await user.keyboard(key);
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("SearchOverlay: the dialog and its field", () => {
  it.each(LOCALES)(
    "is a modal dialog named by its title, with a named field, in %s",
    async (locale) => {
      await openOverlay(locale, "idle");
      const copy = copyOf(locale);
      const popup = screen.getByRole("dialog", { name: copy.title });
      expect(popup).toBe(dialog());
      const input = screen.getByRole("combobox", { name: copy.label });
      expect(input).toBe(field());
      expect(input.getAttribute("placeholder")).toBe(copy.placeholder);
      expect(screen.getByRole("button", { name: copy.close })).toBeTruthy();
      // The title is read, not drawn.
      expect(within(popup).getByText(copy.title).className).toContain("sr-only");
    },
  );

  it("moves the focus to the field when it opens", async () => {
    await openOverlay("en", "idle");
    expect(document.activeElement).toBe(field());
  });

  it("is a GET form to the search page, and the field is `q`", async () => {
    await openOverlay("en", "idle");
    const form = dialog()?.querySelector("form") as HTMLFormElement;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe(samples("en").idle.search.action);
    const input = field() as HTMLInputElement;
    expect(input.getAttribute("name")).toBe("q");
    expect(input.getAttribute("type")).toBe("search");
    expect(input.getAttribute("enterkeyhint")).toBe("search");
    expect(input.hasAttribute("data-truncate")).toBe(true);
    // The Autocomplete's hidden input carries no name, so the query is sent once.
    expect([...new FormData(form).keys()]).toEqual(["q"]);
  });

  it("starts with the query it was given, and sends it", async () => {
    await openOverlay("en", "results");
    const input = field() as HTMLInputElement;
    expect(input.value).toBe("hoodie");
    expect(new FormData(input.form as HTMLFormElement).get("q")).toBe("hoodie");
  });

  it("owns its list: the field points at a listbox that exists, in every state", async () => {
    for (const sample of ["idle", "results", "loading", "empty"] as const) {
      const { view } = await openOverlay("en", sample);
      const input = field() as HTMLInputElement;
      expect(input.getAttribute("aria-expanded")).toBe("true");
      const controlled = document.getElementById(input.getAttribute("aria-controls") ?? "");
      expect(controlled).toBe(list());
      expect(controlled?.getAttribute("role")).toBe("listbox");
      expect(
        controlled?.getAttribute("aria-label") ?? controlled?.getAttribute("aria-labelledby"),
      ).toBeTruthy();
      view.unmount();
    }
  });

  it("has no popup of its own for the list, and no landmark in the dialog", async () => {
    await openOverlay("en", "results");
    expect(document.querySelector('[data-slot="combobox-content"]')).toBeNull();
    expect(dialog()?.querySelector('[role="search"], [role="listbox"] [role="dialog"]')).toBeNull();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it("closes with the close button and puts the focus back on the button", async () => {
    const { user, opener } = await openOverlay("en", "results");
    await user.click(screen.getByRole("button", { name: "Close search" }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("draws the popup open without taking the focus, and keeps the page reachable when it is not modal", () => {
    render(
      <>
        <button type="button">Before</button>
        {element("en", "results", {
          defaultOpen: true,
          modal: false,
          popupClassName: "max-h-[calc(100%-4rem)]",
        })}
      </>,
    );
    expect(dialog()).not.toBeNull();
    expect(dialog()?.className).toContain("max-h-[calc(100%-4rem)]");
    expect(document.activeElement).not.toBe(field());
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("takes the focus when a reader opens a popup drawn open, after closing it", async () => {
    const user = userEvent.setup();
    render(element("en", "results", { defaultOpen: true, modal: false }));
    await user.click(screen.getByRole("button", { name: "Close search" }));
    await waitFor(() => expect(dialog()).toBeNull());
    await user.click(trigger());
    await waitFor(() => expect(dialog()).not.toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(field()));
  });
});

describe("SearchOverlay: before a query (the recent queries)", () => {
  it.each(LOCALES)(
    "lists the recent queries in a listbox named for them, in %s",
    async (locale) => {
      await openOverlay(locale, "idle");
      const copy = copyOf(locale);
      const recent = samples(locale).idle.recent;
      const listbox = screen.getByRole("listbox", { name: copy.recent });
      expect(
        within(listbox)
          .getAllByRole("option")
          .map((each) => each.textContent),
      ).toEqual(recent);
      expect(options().every((each) => each.tagName === "DIV")).toBe(true);
      // Nothing is a link, a product, or a button inside the listbox.
      expect(listbox.querySelector("a, button, img")).toBeNull();
      expect(status()).toBe("");
      expect(submit()).toBeNull();
    },
  );

  it("draws nothing for a visitor with no recent query, and still owns an empty listbox", async () => {
    await openOverlay("en", "idle", { recent: [] });
    expect(options()).toHaveLength(0);
    expect(screen.queryByText("Recent searches")).toBeNull();
    expect(list()?.getAttribute("aria-label")).toBe("Search products");
  });

  it("has no clear button unless the page can forget the queries", async () => {
    await openOverlay("en", "idle");
    expect(screen.queryByRole("button", { name: "Clear recent searches" })).toBeNull();
  });

  it("clears the recent queries through the page, and gives the focus back to the field", async () => {
    const onClearRecent = vi.fn();
    const { user, view } = await openOverlay("en", "idle", { onClearRecent });
    await user.click(screen.getByRole("button", { name: "Clear recent searches" }));
    expect(onClearRecent).toHaveBeenCalledTimes(1);
    // The page answers with an empty list; the button goes with it and the focus must not be lost.
    view.rerender(element("en", "idle", { onClearRecent, recent: [] }));
    expect(screen.queryByRole("button", { name: "Clear recent searches" })).toBeNull();
    expect(document.activeElement).toBe(field());
  });

  it("puts a recent query in the field when it is pressed, and asks for its results", async () => {
    const onQueryChange = vi.fn();
    const { user } = await openOverlay("en", "idle", { onQueryChange });
    await user.click(screen.getByRole("option", { name: "wool socks" }));
    expect((field() as HTMLInputElement).value).toBe("wool socks");
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith("wool socks");
    expect(document.activeElement).toBe(field());
    expect(dialog()).not.toBeNull();
    expect(followed).toEqual([]);
  });
});

describe("SearchOverlay: a query with results", () => {
  it.each(LOCALES)("groups products, categories and suggestions, named, in %s", async (locale) => {
    await openOverlay(locale, "results");
    const copy = copyOf(locale);
    const { result } = samples(locale).results;
    const groups = within(dialog() as HTMLElement).getAllByRole("group", {
      name: (name) => [copy.products, copy.categories, copy.suggestions].includes(name),
    });
    expect(groups.map((each) => each.getAttribute("aria-labelledby")).every(Boolean)).toBe(true);
    const named = (name: string) =>
      within(screen.getByRole("group", { name })).getAllByRole("option");
    expect(named(copy.products)).toHaveLength(result?.products.length ?? -1);
    expect(named(copy.categories)).toHaveLength(result?.categories.length ?? -1);
    expect(named(copy.suggestions)).toHaveLength(result?.suggestions.length ?? -1);
    expect(screen.getByRole("listbox", { name: copy.label })).toBe(list());
  });

  it("draws a product as one link that is the option: a picture, a title and a price", async () => {
    // A path (not the fixtures' data URIs, which next/image does not resize) shows the `sizes` it was given.
    const { result } = samples("en").results;
    const first = result?.products[0];
    if (first === undefined || result === undefined) throw new Error("the fixture has a product");
    const photo = { src: "/photos/hoodie.jpg", alt: "A hoodie", width: 600, height: 800 };
    await openOverlay("en", "results", {
      result: { ...result, products: [{ ...first, images: [photo] }, ...result.products.slice(1)] },
    });
    const row = screen.getByRole("option", { name: new RegExp(first.title) });
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("href")).toBe(first.href);
    expect(row.getAttribute("tabindex")).toBe("-1");
    expect(row.getAttribute("data-prefetch")).toBe("false");
    // The picture is decoration beside the title, and sized for a thumbnail.
    const picture = row.querySelector("img") as HTMLImageElement;
    expect(picture.getAttribute("alt")).toBe("");
    expect(picture.getAttribute("sizes")).toBe("48px");
    expect(row.querySelector('[data-slot="image"]')?.className).toContain("w-12");
    expect(row.textContent).toContain("$64.00");
    // Nothing interactive inside an option (axe's nested-interactive).
    expect(row.querySelector("a, button, input, select, textarea, [tabindex]")).toBeNull();
    // 56 px tall at least; the title breaks inside its box.
    expect(row.className).toContain("min-h-14");
    expect(within(row).getByText(first.title).className).toContain("wrap-anywhere");
  });

  it("says a sale and a lowest price in words as well as in strokes", async () => {
    const { result } = samples("en").results;
    const [one, two] = result?.products ?? [];
    if (one === undefined || two === undefined) throw new Error("the fixture has products");
    const product = (card: typeof one, price: typeof one.price) => ({ ...card, price });
    const sale = product(one, {
      price: { amount: 54, currencyCode: "USD" },
      compareAt: { amount: 75, currencyCode: "USD" },
      varies: false,
    });
    const varies = product(two, {
      price: { amount: 30, currencyCode: "USD" },
      varies: true,
    });
    await openOverlay("en", "results", {
      result: { ...(result as SearchResult), products: [sale, varies] },
    });
    const rows = screen.getAllByRole("option").filter((each) => each.tagName === "A");
    const first = rows[0] as HTMLElement;
    expect(plain(first.textContent)).toContain("Sale price $54.00");
    expect(plain(first.textContent)).toContain("Original price $75.00");
    expect(first.querySelector("s")?.textContent).toContain("$75.00");
    expect(plain((rows[1] as HTMLElement).textContent)).toContain("From $30.00");
    // The word is drawn beside the price, smaller and muted.
    expect(rows[1]?.querySelector(".text-muted-foreground")?.textContent).toBe("From");
  });

  it("draws a category as a link option, and a suggestion as an option that is not a link", async () => {
    await openOverlay("en", "results");
    const { result } = samples("en").results;
    const category = screen.getByRole("option", { name: result?.categories[0]?.label ?? "" });
    expect(category.tagName).toBe("A");
    expect(category.getAttribute("href")).toBe(result?.categories[0]?.href);
    expect(category.getAttribute("tabindex")).toBe("-1");
    const suggestion = screen.getByRole("option", { name: result?.suggestions[0] ?? "" });
    expect(suggestion.tagName).toBe("DIV");
    expect(category.className).toContain("min-h-11");
    expect(suggestion.className).toContain("min-h-11");
  });

  it.each(LOCALES)(
    "ends with the form's submit, which counts every match, in %s",
    async (locale) => {
      await openOverlay(locale, "results");
      const total = samples(locale).results.result?.total ?? 0;
      const label = formatMessage(copyOf(locale).seeAll, { count: total }, htmlLang[locale]);
      const button = screen.getByRole("button", { name: label });
      expect(button).toBe(submit());
      expect(button.getAttribute("type")).toBe("submit");
      expect(button.className).toContain("min-h-11");
      expect(button.closest("form")).toBe(dialog()?.querySelector("form"));
    },
  );

  it("says one result in the singular", async () => {
    const { result } = samples("en").results;
    await openOverlay("en", "results", { result: { ...(result as SearchResult), total: 1 } });
    expect(submit()?.textContent).toBe("See 1 result");
    expect(status()).toBe("1 result");
  });

  it("announces the count once, politely, in a status region", async () => {
    await openOverlay("en", "results");
    const region = slot("search-overlay-status") as HTMLElement;
    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.className).toContain("sr-only");
    expect(status()).toBe("14 results");
  });

  it("walks the options with the arrow keys while the focus stays in the field", async () => {
    const { user } = await openOverlay("en", "results");
    const input = field() as HTMLInputElement;
    await user.keyboard("{ArrowDown}");
    const [first, second] = options();
    expect(input.getAttribute("aria-activedescendant")).toBe(first?.id);
    expect(first?.hasAttribute("data-highlighted")).toBe(true);
    expect(document.activeElement).toBe(input);
    await user.keyboard("{ArrowDown}");
    expect(input.getAttribute("aria-activedescendant")).toBe(second?.id);
    expect(first?.hasAttribute("data-highlighted")).toBe(false);
    await user.keyboard("{ArrowUp}");
    expect(input.getAttribute("aria-activedescendant")).toBe(first?.id);
  });

  it("keeps the options out of the tab order: Tab goes from the field to the next control", async () => {
    const { user } = await openOverlay("en", "results");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close search" }));
    await user.tab();
    expect(document.activeElement).toBe(submit());
  });

  it("opens a product with Enter on its highlighted row, and closes the dialog", async () => {
    const { user } = await openOverlay("en", "results");
    const input = field() as HTMLInputElement;
    await user.keyboard("{ArrowDown}{Enter}");
    expect(followed).toEqual([samples("en").results.result?.products[0]?.href]);
    // The link was not written into the field.
    expect(input.value).toBe("hoodie");
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it("opens a category with Enter, from the arrow keys", async () => {
    const { user } = await openOverlay("en", "results");
    const { result } = samples("en").results;
    await user.keyboard("{ArrowDown}".repeat((result?.products.length ?? 0) + 1));
    await user.keyboard("{Enter}");
    expect(followed).toEqual([result?.categories[0]?.href]);
  });

  it("puts a highlighted suggestion in the field with Enter, and keeps the dialog open", async () => {
    const onQueryChange = vi.fn();
    const { user } = await openOverlay("en", "results", { onQueryChange });
    const { result } = samples("en").results;
    const before = (result?.products.length ?? 0) + (result?.categories.length ?? 0);
    await user.keyboard("{ArrowDown}".repeat(before + 1));
    await user.keyboard("{Enter}");
    expect((field() as HTMLInputElement).value).toBe(result?.suggestions[0]);
    expect(onQueryChange).toHaveBeenCalledWith(result?.suggestions[0]);
    expect(dialog()).not.toBeNull();
    expect(followed).toEqual([]);
  });

  it("submits the form with Enter when nothing is highlighted, with the text typed", async () => {
    const { user } = await openOverlay("en", "results");
    const form = dialog()?.querySelector("form") as HTMLFormElement;
    const sent: FormData[] = [];
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sent.push(new FormData(form));
    });
    await user.clear(field() as HTMLInputElement);
    await user.type(field() as HTMLInputElement, "wool socks{Enter}");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.get("q")).toBe("wool socks");
    expect(followed).toEqual([]);
  });

  it("submits with the See all button, and sends the same text", async () => {
    const { user } = await openOverlay("en", "results");
    const form = dialog()?.querySelector("form") as HTMLFormElement;
    const sent: FormData[] = [];
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sent.push(new FormData(form));
    });
    await user.click(submit() as HTMLElement);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.get("q")).toBe("hoodie");
  });
});

describe("SearchOverlay: the keyboard and Escape", () => {
  it("closes the whole dialog with ONE Escape from the field, and gives the focus back to the button", async () => {
    const { user, opener } = await openOverlay("en", "results");
    expect(document.activeElement).toBe(field());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes with ONE Escape while an option is highlighted, too", async () => {
    const { user, opener } = await openOverlay("en", "results");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(options().some((each) => each.hasAttribute("data-highlighted"))).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("closes with ONE Escape before a query, and with the list empty", async () => {
    const { user, opener } = await openOverlay("en", "idle", { recent: [] });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("keeps the focus inside while Tab and Shift+Tab go round", async () => {
    const { user } = await openOverlay("en", "results");
    const inside = () => dialog()?.contains(document.activeElement) === true;
    for (let press = 0; press < 6; press++) {
      await user.tab();
      expect(inside()).toBe(true);
    }
    for (let press = 0; press < 6; press++) {
      await user.tab({ shift: true });
      expect(inside()).toBe(true);
    }
  });
});

describe("SearchOverlay: the links close the dialog", () => {
  it("closes for a plain click on a product, and follows its link", async () => {
    const { user } = await openOverlay("en", "results");
    const first = samples("en").results.result?.products[0];
    await user.click(screen.getByRole("option", { name: new RegExp(first?.title ?? "") }));
    expect(followed).toEqual([first?.href]);
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it("leaves the field as it was: a link's text is never written into it", async () => {
    const onQueryChange = vi.fn();
    const { user } = await openOverlay("en", "results", { onQueryChange });
    const category = samples("en").results.result?.categories[0];
    await user.click(screen.getByRole("option", { name: category?.label ?? "" }));
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(followed).toEqual([category?.href]);
  });

  it("stays open for a click with a modifier key, which opens another tab", async () => {
    const { user } = await openOverlay("en", "results");
    const first = samples("en").results.result?.products[0];
    const row = screen.getByRole("option", { name: new RegExp(first?.title ?? "") });
    await user.keyboard("{Control>}");
    await user.click(row);
    await user.keyboard("{/Control}");
    expect(followed).toEqual([first?.href]);
    expect(dialog()).not.toBeNull();
  });
});

describe("SearchOverlay: asking for results", () => {
  it("asks at every key, and not on the first render", async () => {
    const onQueryChange = vi.fn();
    const { user } = await openOverlay("en", "idle", { onQueryChange });
    expect(onQueryChange).not.toHaveBeenCalled();
    await user.type(field() as HTMLInputElement, "socks");
    expect(onQueryChange.mock.calls.map(([query]) => query)).toEqual([
      "s",
      "so",
      "soc",
      "sock",
      "socks",
    ]);
  });

  it("works without a listener", async () => {
    const { user } = await openOverlay("en", "idle");
    await user.type(field() as HTMLInputElement, "socks");
    expect((field() as HTMLInputElement).value).toBe("socks");
  });

  it("shows the recent queries again when the field is emptied", async () => {
    const { user } = await openOverlay("en", "results");
    await user.clear(field() as HTMLInputElement);
    expect(screen.getByRole("listbox", { name: "Recent searches" })).toBeTruthy();
    expect(submit()).toBeNull();
    expect(status()).toBe("");
  });

  it("keeps the text the visitor typed when the page sends the same query back later", async () => {
    const { user, view } = await openOverlay("en", "idle");
    await user.type(field() as HTMLInputElement, "hoo");
    view.rerender(element("en", "idle"));
    expect((field() as HTMLInputElement).value).toBe("hoo");
  });

  it("keeps the text when the dialog is closed and opened again", async () => {
    const { user } = await openOverlay("en", "idle");
    await user.type(field() as HTMLInputElement, "hoo");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    await user.click(trigger());
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect((field() as HTMLInputElement).value).toBe("hoo");
  });
});

describe("SearchOverlay: while the next answer is on its way", () => {
  it("keeps the last results on screen, marked busy, with a spinner and the words", async () => {
    await openOverlay("en", "loading");
    const results = slot("search-overlay-results") as HTMLElement;
    expect(results.getAttribute("aria-busy")).toBe("true");
    expect(options().length).toBeGreaterThan(0);
    const row = slot("search-overlay-loading") as HTMLElement;
    expect(row.textContent).toBe("Searching…");
    // The status region speaks; the visible row does not say it twice.
    expect(row.getAttribute("aria-hidden")).toBe("true");
    expect(status()).toBe("Searching…");
    expect(row.querySelector("svg")?.getAttribute("class")).toContain("motion-safe:animate-spin");
    expect(row.querySelector("svg")?.getAttribute("class")).not.toMatch(/(?:^|\s)animate-spin/);
  });

  it("is not busy and has no spinner once the answer is there", async () => {
    await openOverlay("en", "results");
    expect(slot("search-overlay-results")?.hasAttribute("aria-busy")).toBe(false);
    expect(slot("search-overlay-loading")).toBeNull();
  });

  it("says the count when the answer arrives, and Searching… while it waits", async () => {
    const { view } = await openOverlay("en", "results");
    expect(status()).toBe("14 results");
    view.rerender(element("en", "loading"));
    expect(status()).toBe("Searching…");
    view.rerender(element("en", "results"));
    expect(status()).toBe("14 results");
  });

  it("does not announce keys: the status holds until the page says it is loading", async () => {
    const { user, view } = await openOverlay("en", "results");
    const region = slot("search-overlay-status") as HTMLElement;
    const seen: string[] = [];
    const watch = new MutationObserver(() => seen.push(plain(region.textContent)));
    watch.observe(region, { childList: true, characterData: true, subtree: true });
    await user.type(field() as HTMLInputElement, "ies");
    await act(async () => {});
    expect(seen).toEqual([]);
    expect(status()).toBe("14 results");
    // The page asks, and the region says so once.
    view.rerender(
      element("en", "loading", { search: { ...samples("en").loading.search, query: "hoodies" } }),
    );
    watch.disconnect();
    expect(status()).toBe("Searching…");
  });

  it("says nothing for a field with no text, even when the page is loading", async () => {
    await openOverlay("en", "idle", { loading: true });
    expect(status()).toBe("");
    expect(slot("search-overlay-loading")).toBeNull();
    expect(slot("search-overlay-results")?.hasAttribute("aria-busy")).toBe(false);
  });
});

describe("SearchOverlay: a query with no results", () => {
  it.each(LOCALES)("says so with the query and a hint, in %s", async (locale) => {
    await openOverlay(locale, "empty");
    const copy = copyOf(locale);
    const { query } = samples(locale).empty.search;
    const box = slot("search-overlay-empty") as HTMLElement;
    expect(plain(box.textContent)).toContain(
      plain(formatMessage(copy.noResults, { query }, htmlLang[locale])),
    );
    expect(plain(box.textContent)).toContain(copy.noResultsHint);
    expect(status()).toBe(plain(formatMessage(copy.status, { count: 0 }, htmlLang[locale])));
    expect(submit()).toBeNull();
  });

  it("still owns an empty listbox, and the sentence is outside it", async () => {
    await openOverlay("en", "empty");
    expect(options()).toHaveLength(0);
    expect(list()?.getAttribute("role")).toBe("listbox");
    expect(list()?.contains(slot("search-overlay-empty"))).toBe(false);
    expect((field() as HTMLInputElement).getAttribute("aria-controls")).toBe(list()?.id);
  });

  it("is not a no-result when only categories matched", async () => {
    const { result } = samples("en").results;
    await openOverlay("en", "results", {
      result: { ...(result as SearchResult), total: 0, products: [], suggestions: [] },
    });
    expect(slot("search-overlay-empty")).toBeNull();
    expect(options()).toHaveLength(result?.categories.length ?? -1);
    expect(submit()).toBeNull();
  });

  it("draws the query the visitor typed, trimmed, in the sentence", async () => {
    const { user } = await openOverlay("en", "empty");
    await user.clear(field() as HTMLInputElement);
    await user.type(field() as HTMLInputElement, "  zzz  ");
    expect(plain(slot("search-overlay-empty")?.textContent)).toContain("“zzz”");
  });
});

describe("SearchOverlay: long labels", () => {
  it.each(longLabels)("wraps a long %s label, and cuts nothing", async (locale, long) => {
    const { result } = samples(locale).results;
    const [card] = result?.products ?? [];
    if (card === undefined || result === undefined) throw new Error("the fixture has a product");
    const copy = {
      ...copyOf(locale),
      recent: long.fieldLabel,
      clearRecent: long.action,
      products: long.linkLabel,
      seeAll: long.action,
      noResultsHint: long.helpText,
    };
    const longResult: SearchResult = {
      ...result,
      products: [{ ...card, title: long.productName }],
      categories: [{ label: long.linkLabel, href: "/c" }],
      suggestions: [long.chipLabel],
    };
    await openOverlay(locale, "results", {
      copy,
      result: longResult,
      recent: [long.chipLabel],
      onClearRecent: () => {},
      search: { action: "/search", query: long.productName },
    });
    const popup = dialog() as HTMLElement;
    expect(classesIn(popup).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(within(popup).getByText(long.productName, { selector: "span" }).className).toContain(
      "wrap-anywhere",
    );
    expect(within(popup).getByText(long.linkLabel, { selector: "span" }).className).toContain(
      "wrap-anywhere",
    );
    expect(within(popup).getByText(long.chipLabel).className).toContain("wrap-anywhere");
    expect(submit()?.className).not.toMatch(/whitespace-nowrap/);
  });

  it.each(longLabels)(
    "wraps a long %s title and a long clear button of the recent list",
    async (locale, long) => {
      const copy = { ...copyOf(locale), recent: long.fieldLabel, clearRecent: long.action };
      await openOverlay(locale, "idle", {
        copy,
        recent: [long.chipLabel, long.productName],
        onClearRecent: () => {},
      });
      const clear = screen.getByRole("button", { name: long.action });
      expect(clear.className).toContain("max-w-full");
      expect(
        classesIn(dialog() as HTMLElement).filter((each) => CLIPPING_CLASSES.test(each)),
      ).toEqual([]);
      expect(screen.getByText(long.fieldLabel).className).toContain("wrap-anywhere");
      expect(screen.getByText(long.productName).className).toContain("wrap-anywhere");
    },
  );

  it("scrolls in the middle and keeps the field and the submit where they are", async () => {
    await openOverlay("en", "results");
    const popup = dialog() as HTMLElement;
    expect(popup.className).toContain("flex-col");
    expect(popup.className).toContain("overflow-hidden");
    expect(slot("search-overlay-results")?.className).toContain("min-h-0");
    // The listbox scrolls, not a box around it: the field's arrow keys scroll a combobox's own
    // listbox, and axe's scrollable-region-focusable lets only that off (its options take no Tab stop).
    const list = screen.getByRole("listbox");
    expect(list.className).toContain("overflow-y-auto");
    expect(list.className).toContain("min-h-0");
    expect(screen.getByRole("combobox").getAttribute("aria-controls")).toBe(list.id);
    expect(slot("search-overlay-results")?.className).not.toMatch(
      /overflow-(?:y-)?(?:auto|scroll)/,
    );
    expect(slot("search-overlay-foot")?.className).toContain("shrink-0");
    expect(popup.className).not.toMatch(/(?:^|\s)(?:top-1\/2|-translate-y-1\/2|gap-6|p-6)(?:\s|$)/);
  });
});

describe("SearchOverlay: the files (D49)", () => {
  const read = (name: string) => readFileSync(path.join(import.meta.dirname, name), "utf8");
  /** The modules a file imports at run time: a type-only import leaves no trace. */
  const runtimeImports = (source: string) =>
    [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms)].map(
      (match) => match[1] ?? "",
    );

  it.each(["search-overlay.tsx", "search-overlay-results.tsx"])(
    "keeps %s a client component that imports no catalog and no flag",
    (name) => {
      const source = read(name);
      expect(source).toMatch(/^"use client";?$/m);
      const imported = runtimeImports(source);
      expect(imported.filter((each) => each === "@shopblok/i18n")).toEqual([]);
      expect(
        imported.filter((each) =>
          /@shopblok\/(?:registry|fixtures)|atoms\/flag|country-flag/.test(each),
        ),
      ).toEqual([]);
      expect(imported.filter((each) => /atoms\/price$|molecules\/price-block/.test(each))).toEqual(
        [],
      );
    },
  );

  it("formats with the formatters alone", () => {
    expect(runtimeImports(read("search-overlay.tsx"))).toContain("@shopblok/i18n/format");
    expect(runtimeImports(read("search-overlay-results.tsx"))).toContain("@shopblok/i18n/format");
  });

  it("puts the list inline in the dialog, the one thing that makes one Escape enough", () => {
    const source = read("search-overlay.tsx");
    expect(source).toMatch(/<Autocomplete\.Root[^>]*\binline\b/s);
    expect(source).not.toMatch(/Autocomplete\.(?:Portal|Positioner|Popup)/);
    expect(read("search-overlay-results.tsx")).not.toMatch(
      /Autocomplete\.(?:Portal|Positioner|Popup)/,
    );
  });
});
