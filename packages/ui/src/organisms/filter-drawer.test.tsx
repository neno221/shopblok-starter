// Ours (T37, SETUP.md "Listing organisms (T37)"). FilterDrawer's tests, in Testing Library and
// happy-dom: the button and how many filters it says are chosen, the sheet and where the focus goes,
// its title and close button, the groups it shares with the sidebar, the foot ("Clear all" only when
// something is chosen, "Show N results" always pressable), what the form sends, the keyboard (a
// focus trap, Escape), the sheet drawn open for the design system, a long German and Greek label,
// the four catalogs and a read of the two files' imports (D49).
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { FacetGroup, FilterPanel } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { FilterDrawer, type FilterDrawerProps } from "./filter-drawer";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.filterDrawer;
const panelOf = (locale: Locale): FilterPanel => commerceFixtures[locale].listing.filters;
/** A name matcher that ignores the space happy-dom's name computation puts before a comma. */
const named = (expected: string) => (name: string) => name.replace(/\s+,/g, ",") === expected;
const chosenOf = (locale: Locale) => panelOf(locale).active?.filters.length ?? 0;

function element(locale: Locale, props: Partial<FilterDrawerProps> = {}) {
  return (
    <>
      <button type="button">Before</button>
      <FilterDrawer
        {...panelOf(locale)}
        copy={copyOf(locale)}
        groupCopy={catalogs[locale].molecules.filterGroup}
        locale={htmlLang[locale]}
        prefetch={false}
        {...props}
      />
      <button type="button">After</button>
    </>
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const trigger = () => slot("filter-drawer-trigger") as HTMLButtonElement;
const sheet = () => slot("filter-drawer");
const formOf = () => sheet()?.querySelector("form") as HTMLFormElement;
const sent = () =>
  [...new FormData(formOf()).entries()].map(([name, value]) => `${name}=${String(value)}`);
/** The controls a Tab visits inside the sheet, in document order. */
const stops = () => [
  ...(sheet()?.querySelectorAll<HTMLElement>(
    "a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), [role=checkbox], [role=switch]",
  ) ?? []),
];
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

async function openSheet(locale: Locale = "en", props: Partial<FilterDrawerProps> = {}) {
  render(element(locale, props));
  const user = userEvent.setup();
  const opener = trigger();
  await user.click(opener);
  await waitFor(() => expect(sheet()).not.toBeNull());
  return { user, opener };
}

/** The clicks on links that a test has seen, none followed for real (happy-dom would navigate). */
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

describe("FilterDrawer: the button", () => {
  it.each(LOCALES)("is named for its job and says how many filters are chosen, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const count = chosenOf(locale);
    const chosen = formatMessage(copy.chosen, { count }, htmlLang[locale]);
    const button = screen.getByRole("button", { name: named(`${copy.open}, ${chosen}`) });
    expect(button).toBe(trigger());
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    // The eye gets the number; the name gets the sentence.
    const badge = slot("filter-drawer-count") as HTMLElement;
    expect(badge.textContent).toBe(String(count));
    expect(badge.getAttribute("aria-hidden")).toBe("true");
    expect(sheet()).toBeNull();
  });

  it("is only its name when nothing is chosen", () => {
    render(element("en", { active: undefined }));
    expect(screen.getByRole("button", { name: "Filters" })).toBe(trigger());
    expect(slot("filter-drawer-count")).toBeNull();
  });

  it("says one filter in the singular", () => {
    const { active } = panelOf("en");
    const [first] = active?.filters ?? [];
    if (active === undefined || first === undefined) throw new Error("the fixture has filters");
    render(element("en", { active: { ...active, filters: [first] } }));
    expect(screen.getByRole("button", { name: named("Filters, 1 filter chosen") })).toBeTruthy();
  });

  it("is 44 px tall, draws a hidden icon, and takes the page's classes after its own", () => {
    render(element("en", { triggerClassName: "lg:hidden" }));
    const button = trigger();
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("lg:hidden");
    expect(button.className).toContain("max-w-full");
    expect(button.className).toContain("focus-visible:ring-ring");
    expect(button.className).not.toMatch(/ring-ring\//);
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders on the server as the button alone", () => {
    const html = renderToString(element("en"));
    expect(html).toContain('data-slot="filter-drawer-trigger"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("filter-drawer-body");
  });

  it.each([["{Enter}"], [" "]])("opens the sheet on %j from the keyboard", async (key) => {
    render(element("en"));
    const user = userEvent.setup();
    trigger().focus();
    await user.keyboard(key);
    await waitFor(() => expect(sheet()).not.toBeNull());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("FilterDrawer: the sheet", () => {
  it.each(LOCALES)(
    "is a modal dialog named by its title, with a close button, in %s",
    async (locale) => {
      await openSheet(locale);
      const copy = copyOf(locale);
      expect(screen.getByRole("dialog", { name: copy.title })).toBe(sheet());
      expect(screen.getByRole("heading", { level: 2, name: copy.title })).toBeTruthy();
      expect(screen.getByRole("button", { name: copy.close })).toBeTruthy();
    },
  );

  it("moves the focus into the sheet, to the close button, which is first in the order", async () => {
    await openSheet("en");
    const close = screen.getByRole("button", { name: "Close filters" });
    expect(document.activeElement).toBe(close);
    expect(stops()[0]).toBe(close);
  });

  it("holds the same fields as the sidebar, in a GET form to the listing", async () => {
    await openSheet("en");
    expect(formOf().getAttribute("method")).toBe("get");
    expect(formOf().getAttribute("action")).toBe(panelOf("en").action);
    expect(sent()).toEqual([
      "category=women-hoodies",
      "colour=black",
      "colour=forest",
      "size=m",
      "price.min=22",
      "price.max=110",
      "in-stock=1",
    ]);
    const triggers = within(sheet() as HTMLElement).getAllByRole("button", { expanded: true });
    expect(triggers.map((each) => each.textContent)).toEqual([
      "Category",
      "Color",
      "Size",
      "Price",
    ]);
    // The sections sit under the sheet's title.
    expect(within(sheet() as HTMLElement).getAllByRole("heading", { level: 3 })).toHaveLength(4);
  });

  it("sends the listing's other parameters, and what is chosen in a closed section", async () => {
    const { user } = await openSheet("en", { params: [{ name: "sort", value: "newest" }] });
    await user.click(screen.getByRole("button", { name: "Size" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Size" }).getAttribute("aria-expanded")).toBe(
        "false",
      ),
    );
    expect(sent()[0]).toBe("sort=newest");
    expect(sent()).toContain("size=m");
  });

  it("has a body that scrolls between the header and the foot, which stay in view", async () => {
    await openSheet("en");
    expect(slot("filter-drawer-body")?.className).toContain("overflow-y-auto");
    // A containing block for the slider's fixed hidden inputs: they scroll and clip with the body.
    expect(slot("filter-drawer-body")?.className).toContain("[contain:paint]");
    expect(slot("filter-drawer-body")?.className).toContain("min-h-0");
    expect(slot("filter-drawer-header")?.className).toContain("shrink-0");
    expect(slot("filter-drawer-foot")?.className).toContain("shrink-0");
    expect(formOf().className).toContain("min-h-0");
    expect(formOf().contains(slot("filter-drawer-foot"))).toBe(true);
    expect(formOf().contains(slot("filter-drawer-header"))).toBe(false);
  });

  it("is wider than the navigation's sheet: 90 % of the window, up to 28 rem", async () => {
    await openSheet("en");
    const classes = sheet()?.className ?? "";
    expect(classes).toContain("data-[side=inline-start]:w-[90%]");
    expect(classes).toContain("data-[side=inline-start]:sm:max-w-md");
    // The sheet's own widths for this side are replaced; the other side's stay, unused.
    expect(classes).not.toContain("data-[side=inline-start]:w-3/4");
    expect(classes).not.toContain("data-[side=inline-start]:sm:max-w-sm");
    expect(sheet()?.getAttribute("data-side")).toBe("inline-start");
    expect(classes).toContain("motion-reduce:transition-none");
  });
});

describe("FilterDrawer: the foot", () => {
  it.each(LOCALES)("says how many results the submit shows, in %s", async (locale) => {
    await openSheet(locale);
    const label = formatMessage(
      copyOf(locale).show,
      { count: panelOf(locale).resultCount },
      htmlLang[locale],
    );
    const submit = screen.getByRole("button", { name: label });
    expect(submit).toBe(slot("filter-drawer-submit"));
    expect(submit.getAttribute("type")).toBe("submit");
    expect(submit.className).toContain("min-h-11");
    expect(slot("filter-drawer-foot")?.lastElementChild).toBe(submit);
  });

  it.each([
    [1, "Show 1 result"],
    [24, "Show 24 results"],
    [0, "Apply filters"],
  ])("reads %i as %j, and stays pressable", async (resultCount, label) => {
    await openSheet("en", { resultCount });
    const submit = screen.getByRole("button", { name: label }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    expect(submit.hasAttribute("aria-disabled")).toBe(false);
  });

  it.each(LOCALES)("links 'Clear all' to the listing without filters, in %s", async (locale) => {
    await openSheet(locale);
    const clear = screen.getByRole("link", { name: copyOf(locale).clear });
    expect(clear).toBe(slot("filter-drawer-clear"));
    expect(clear.getAttribute("href")).toBe(panelOf(locale).active?.clearHref);
    expect(clear.getAttribute("data-prefetch")).toBe("false");
    expect(clear.className).toContain("min-h-11");
    expect(slot("filter-drawer-foot")?.firstElementChild).toBe(clear);
  });

  it("draws no 'Clear all' when nothing is chosen", async () => {
    await openSheet("en", { active: undefined });
    expect(screen.queryByRole("link", { name: "Clear all" })).toBeNull();
    expect(slot("filter-drawer-foot")?.children).toHaveLength(1);
  });

  it("closes for 'Clear all', because the page behind it updates in place", async () => {
    const { user } = await openSheet("en");
    await user.click(screen.getByRole("link", { name: "Clear all" }));
    expect(followed).toEqual([panelOf("en").active?.clearHref]);
    await waitFor(() => expect(sheet()).toBeNull());
  });

  it("submits the form with the submit button", async () => {
    const { user } = await openSheet("en");
    const submitted = vi.fn((event: Event) => event.preventDefault());
    formOf().addEventListener("submit", submitted);
    await user.click(screen.getByRole("button", { name: "Show 24 results" }));
    expect(submitted).toHaveBeenCalledTimes(1);
    // Nothing submits by itself.
    await user.click(screen.getByRole("checkbox", { name: /^L\s*,/ }));
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it("wraps its two buttons when the room is short, and neither is cut", async () => {
    await openSheet("en");
    const foot = slot("filter-drawer-foot") as HTMLElement;
    expect(foot.className).toContain("flex-wrap");
    for (const each of [slot("filter-drawer-clear"), slot("filter-drawer-submit")]) {
      expect(each?.className).toContain("max-w-full");
      expect(each?.className).toContain("min-w-0");
      expect(each?.className).toContain("basis-");
    }
  });
});

describe("FilterDrawer: the keyboard", () => {
  it("closes with ONE Escape and gives the focus back to the button", async () => {
    const { user, opener } = await openSheet("en");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(sheet()).toBeNull());
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes with the close button and gives the focus back", async () => {
    const { user, opener } = await openSheet("en");
    await user.click(screen.getByRole("button", { name: "Close filters" }));
    await waitFor(() => expect(sheet()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it(
    "keeps the focus inside while Tab and Shift+Tab go round",
    async () => {
      const { user } = await openSheet("en");
      const inside = () => sheet()?.contains(document.activeElement) === true;
      const total = stops().length;
      expect(total).toBeGreaterThan(10);
      for (let press = 0; press < total + 3; press++) {
        await user.tab();
        expect(inside()).toBe(true);
      }
      for (let press = 0; press < total + 3; press++) {
        await user.tab({ shift: true });
        expect(inside()).toBe(true);
      }
    },
    // Some 60 Tab presses: about 2.3 s here, which passed the 5 s default on the Windows runner
    // (PR 63 CI, windows-smoke).
    30_000,
  );

  it("hides the page behind the sheet from assistive technology while it is open", async () => {
    await openSheet("en");
    expect(screen.queryByRole("button", { name: "Before" })).toBeNull();
    expect(screen.getByRole("button", { name: "Before", hidden: true })).toBeTruthy();
  });
});

describe("FilterDrawer: drawn open for the design system", () => {
  it("is open at first render without taking the focus, and the page stays reachable", () => {
    render(
      element("en", { defaultOpen: true, modal: false, popupClassName: "max-h-[calc(100%-2rem)]" }),
    );
    expect(sheet()).not.toBeNull();
    expect(sheet()?.className).toContain("max-h-[calc(100%-2rem)]");
    expect(sheet()?.contains(document.activeElement)).toBe(false);
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
  });

  it("takes the focus when a reader opens it again", async () => {
    const user = userEvent.setup();
    render(element("en", { defaultOpen: true, modal: false }));
    await user.click(screen.getByRole("button", { name: "Close filters" }));
    await waitFor(() => expect(sheet()).toBeNull());
    await user.click(trigger());
    await waitFor(() => expect(sheet()).not.toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close filters" })),
    );
  });
});

describe("FilterDrawer: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s label everywhere, and cuts nothing",
    async (locale, long) => {
      const facets: FacetGroup[] = [
        {
          kind: "checkbox",
          id: "gift",
          label: long.fieldLabel,
          options: [{ value: "wrap", label: long.optionLabel, count: 4, selected: true }],
        },
      ];
      render(
        element(locale, {
          groups: facets,
          active: {
            filters: [{ id: "gift:wrap", label: long.optionLabel, removeHref: "/store" }],
            clearHref: "/store",
          },
          copy: {
            open: long.linkLabel,
            chosen: copyOf(locale).chosen,
            title: long.fieldLabel,
            close: long.action,
            show: long.action,
            clear: long.hint,
          },
        }),
      );
      const user = userEvent.setup();
      await user.click(trigger());
      await waitFor(() => expect(sheet()).not.toBeNull());
      expect(
        classesIn(sheet() as HTMLElement).filter((each) => CLIPPING_CLASSES.test(each)),
      ).toEqual([]);
      expect(classesIn(trigger()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
      expect(within(trigger()).getByText(long.linkLabel).className).toContain("wrap-anywhere");
      expect(screen.getByRole("heading", { name: long.fieldLabel, level: 2 }).className).toContain(
        "wrap-anywhere",
      );
      expect(
        within(slot("filter-drawer-submit") as HTMLElement).getByText(long.action).className,
      ).toContain("wrap-anywhere");
      expect(
        within(slot("filter-drawer-clear") as HTMLElement).getByText(long.hint).className,
      ).toContain("wrap-anywhere");
      expect(sheet()?.querySelectorAll(".overflow-y-auto")).toHaveLength(1);
    },
  );
});

describe("the files (D49)", () => {
  const read = (name: string) => readFileSync(path.join(import.meta.dirname, name), "utf8");
  const specifiers = (source: string) =>
    [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map((match) => match[1] ?? "");
  /** The modules a file imports at run time: a type-only import leaves no trace. */
  const runtimeImports = (source: string) =>
    [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms)].map(
      (match) => match[1] ?? "",
    );

  it("keeps the client part free of formatters, catalogs, contracts and the groups' drawing", () => {
    const source = read("filter-drawer-client.tsx");
    expect(source).toMatch(/^"use client";?$/m);
    const imported = specifiers(source);
    expect(imported.filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each))).toEqual(
      [],
    );
    expect(
      imported.filter((each) => /filter-group|filter-fields|accordion-item/.test(each)),
    ).toEqual([]);
    expect(runtimeImports(source)).not.toContain("@shopblok/ui/atoms/flag");
  });

  it("makes the words and the fields on the server, and is no client component", () => {
    const source = read("filter-drawer.tsx");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    const imported = specifiers(source);
    expect(imported).toContain("@shopblok/i18n/format");
    expect(imported).toContain("./filter-fields");
    expect(imported).toContain("./filter-drawer-client");
    expect(runtimeImports(source)).not.toContain("@shopblok/i18n");
  });
});
