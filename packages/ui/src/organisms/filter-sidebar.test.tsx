// Ours (T37, SETUP.md "Listing organisms (T37)"). FilterSidebar's and FilterFields' tests, in
// Testing Library and happy-dom: the form and its name, the heading and the sections' levels, the
// chips, what the form sends (every chosen field, the listing's other parameters, a closed group's
// fields), that nothing submits by itself, a long German and Greek label, the four catalogs and a
// read of the files' imports. The drawer shares the fields and has its own file.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { FacetGroup, FilterPanel } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { FilterFields } from "./filter-fields";
import { FilterSidebar, type FilterSidebarProps } from "./filter-sidebar";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.filterSidebar;
const panelOf = (locale: Locale): FilterPanel => commerceFixtures[locale].listing.filters;

function element(locale: Locale, props: Partial<FilterSidebarProps> = {}) {
  return (
    <FilterSidebar
      {...panelOf(locale)}
      copy={copyOf(locale)}
      groupCopy={catalogs[locale].molecules.filterGroup}
      chipsCopy={catalogs[locale].molecules.activeFilterChips}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const form = () => slot("filter-sidebar") as HTMLFormElement;
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
/** What the form would send, as `name=value` pairs in document order. */
const sent = (target: HTMLFormElement = form()) =>
  [...new FormData(target).entries()].map(([name, value]) => `${name}=${String(value)}`);

describe("FilterSidebar: the form", () => {
  it.each(LOCALES)("is a form landmark named by its heading, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const landmark = screen.getByRole("form", { name: copy.title });
    expect(landmark).toBe(form());
    const heading = screen.getByRole("heading", { level: 2, name: copy.title });
    expect(landmark.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(heading.className).toContain("wrap-anywhere");
  });

  it("is a GET form to the listing, without JavaScript", () => {
    render(element("en"));
    expect(form().getAttribute("method")).toBe("get");
    expect(form().getAttribute("action")).toBe(panelOf("en").action);
    expect(renderToString(element("en"))).toContain('method="get"');
  });

  it.each(LOCALES)("ends with the submit, which says what it does, in %s", (locale) => {
    render(element(locale));
    const apply = screen.getByRole("button", { name: copyOf(locale).apply });
    expect(apply.getAttribute("type")).toBe("submit");
    expect(apply.className).toContain("min-h-11");
    expect(apply.className).toContain("w-full");
    expect(form().lastElementChild).toBe(apply);
  });

  it("does not draw the count of results: that is the drawer's button", () => {
    render(element("en"));
    expect(form().textContent).not.toContain("24");
    expect(form().hasAttribute("resultcount")).toBe(false);
  });

  it("passes a class and attributes to the form, and keeps its own", () => {
    render(element("en", { className: "lg:sticky", id: "filters" }));
    expect(form().className).toContain("lg:sticky");
    expect(form().className).toContain("min-w-0");
    expect(form().id).toBe("filters");
    expect(form().getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("takes the heading's level, and the sections go one under", () => {
    render(element("en", { headingLevel: 3 }));
    expect(screen.getByRole("heading", { level: 3, name: "Filters" })).toBeTruthy();
    // Category, Color, Size and Price are sections; the switches are rows.
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(4);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });
});

describe("FilterSidebar: the chosen filters", () => {
  it.each(LOCALES)("shows them as chips above the groups, with a way off, in %s", (locale) => {
    render(element(locale));
    const { active } = panelOf(locale);
    const chips = screen.getByRole("list", {
      name: formatMessage(
        catalogs[locale].molecules.activeFilterChips.label,
        { count: active?.filters.length ?? 0 },
        htmlLang[locale],
      ),
    });
    expect(chips.compareDocumentPosition(slot("filter-fields") as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(within(chips).getAllByRole("listitem")).toHaveLength((active?.filters.length ?? 0) + 1);
    expect(
      within(chips)
        .getAllByRole("link")
        .every((link) => link.getAttribute("data-prefetch") === "false"),
    ).toBe(true);
    expect(
      within(chips)
        .getByRole("link", { name: catalogs[locale].molecules.activeFilterChips.clearAllLabel })
        .getAttribute("href"),
    ).toBe(active?.clearHref);
  });

  it("draws no chips when nothing is chosen", () => {
    render(element("en", { active: undefined }));
    expect(screen.queryByRole("list", { name: /active filter/ })).toBeNull();
    expect(slot("active-filter-chips")).toBeNull();
  });
});

describe("FilterSidebar: the groups", () => {
  it("opens every section, and draws the switches as plain rows between them", () => {
    render(element("en"));
    const triggers = screen.getAllByRole("button", { expanded: true });
    expect(triggers.map((each) => each.textContent)).toEqual([
      "Category",
      "Color",
      "Size",
      "Price",
    ]);
    expect(screen.queryAllByRole("button", { expanded: false })).toHaveLength(0);
    const rows = document.querySelectorAll('[data-slot="filter-toggle-row"]');
    expect(rows).toHaveLength(2);
    // They keep their place in the facets' order: after the price section.
    const [last] = [...document.querySelectorAll('[data-slot="accordion-item"]')].slice(-1);
    expect(last?.compareDocumentPosition(rows[0] as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // "In stock" is said once: a switch with its label, not a section over a switch.
    expect(within(slot("filter-fields") as HTMLElement).getAllByText("In stock")).toHaveLength(1);
    expect(screen.getByRole("switch", { name: /In stock/ })).toBeTruthy();
  });

  it("names each section's fieldset by the group, with the legend kept for assistive technology", () => {
    render(element("en"));
    const group = screen.getByRole("group", { name: "Size" });
    expect(group.tagName).toBe("FIELDSET");
    expect(within(group).getByText("Size", { selector: "legend" }).className).toContain("sr-only");
    expect(within(group).getAllByRole("checkbox")).toHaveLength(6);
  });

  it("draws the swatches, the price range and the switches with their own parts", () => {
    render(element("en"));
    expect(document.querySelectorAll('[data-kind="swatch"] input')).not.toHaveLength(0);
    expect(document.querySelector('[data-kind="range"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-kind="toggle"]')).toHaveLength(2);
  });

  it("closes a section with its button and opens it again", async () => {
    const user = userEvent.setup();
    render(element("en"));
    const size = screen.getByRole("button", { name: "Size" });
    await user.click(size);
    expect(size.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard("{Enter}");
    expect(size.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("FilterSidebar: what the form sends", () => {
  it("sends every chosen field, the way the URL carries it", () => {
    render(element("en"));
    expect(sent()).toEqual([
      "category=women-hoodies",
      "colour=black",
      "colour=forest",
      "size=m",
      "price.min=22",
      "price.max=110",
      "in-stock=1",
    ]);
  });

  it("sends the listing's other parameters first, as hidden inputs", () => {
    const params = [
      { name: "sort", value: "newest" },
      { name: "view", value: "list" },
    ];
    render(element("en", { params }));
    expect(sent().slice(0, 2)).toEqual(["sort=newest", "view=list"]);
    const hidden = [...form().querySelectorAll<HTMLInputElement>('input[type="hidden"]')];
    expect(hidden.map((each) => each.name)).toEqual(["sort", "view"]);
    expect(form().querySelector('input[name="page"]')).toBeNull();
  });

  it("still sends what is chosen in a section the visitor closed", async () => {
    const user = userEvent.setup();
    render(element("en"));
    await user.click(screen.getByRole("button", { name: "Size" }));
    await user.click(screen.getByRole("button", { name: "Color" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Size" }).getAttribute("aria-expanded")).toBe(
        "false",
      ),
    );
    // The panels stay in the page, hidden, and a hidden control is still a control of the form.
    expect(document.querySelectorAll("[hidden]").length).toBeGreaterThan(0);
    expect(sent()).toContain("size=m");
    expect(sent()).toContain("colour=black");
    expect(sent()).toContain("colour=forest");
  });

  it("sends a box the visitor ticks, and one they untick", async () => {
    const user = userEvent.setup();
    render(element("en"));
    await user.click(screen.getByRole("checkbox", { name: /^Hoodies/ }));
    await user.click(screen.getByRole("checkbox", { name: /^L\s*,/ }));
    expect(sent()).toContain("size=l");
    expect(sent()).not.toContain("category=women-hoodies");
  });

  it("does not submit by itself: not on a tick, not on a switch", async () => {
    const user = userEvent.setup();
    render(element("en"));
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener("submit", submitted);
    await user.click(screen.getByRole("checkbox", { name: /^L\s*,/ }));
    await user.click(screen.getByRole("switch", { name: /On sale/ }));
    expect(submitted).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it("submits with the keyboard from a box", async () => {
    const user = userEvent.setup();
    render(element("en"));
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener("submit", submitted);
    screen.getByRole("button", { name: "Apply filters" }).focus();
    await user.keyboard("{Enter}");
    expect(submitted).toHaveBeenCalledTimes(1);
  });
});

describe("FilterFields", () => {
  const groups: FacetGroup[] = [
    {
      kind: "checkbox",
      id: "size",
      label: "Size",
      options: [{ value: "m", label: "M", count: 3, selected: true }],
    },
    { kind: "toggle", id: "sale", label: "On sale", count: 2, selected: false },
  ];
  const fields = (props: Partial<Parameters<typeof FilterFields>[0]> = {}) => (
    <form data-testid="form">
      <FilterFields
        groups={groups}
        params={[]}
        copy={catalogs.en.molecules.filterGroup}
        locale="en-US"
        {...props}
      />
    </form>
  );

  it("repeats a parameter the listing sends twice, in order", () => {
    render(
      fields({
        params: [
          { name: "tag", value: "a" },
          { name: "tag", value: "b" },
        ],
      }),
    );
    expect(sent(screen.getByTestId("form") as HTMLFormElement)).toEqual([
      "tag=a",
      "tag=b",
      "size=m",
    ]);
  });

  it("is no form of its own, and no navigation: the shell holds the form", () => {
    const { container } = render(fields());
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelector("[role='form'], nav, [role='search']")).toBeNull();
  });

  it("starts every section open and keeps the closed panels in the page", () => {
    const { container } = render(fields());
    expect(screen.getByRole("button", { name: "Size" }).getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-slot="filter-fields"]')).not.toBeNull();
    // Closed or not, the panel is in the page: Base UI's `keepMounted` keeps it, with `hidden`.
    expect(container.querySelector('[data-slot="accordion-content"]')).not.toBeNull();
  });
});

describe("FilterSidebar: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s group, option and button, and cuts nothing",
    (locale, long) => {
      const facets: FacetGroup[] = [
        {
          kind: "checkbox",
          id: "gift",
          label: long.fieldLabel,
          options: [
            { value: "wrap", label: long.optionLabel, count: 4, selected: true },
            { value: "card", label: long.chipLabel, count: 2, selected: false },
          ],
        },
        { kind: "toggle", id: "alert", label: long.toggleLabel, count: 5, selected: false },
      ];
      render(
        element(locale, {
          groups: facets,
          active: {
            filters: [
              {
                id: "gift:wrap",
                group: long.fieldLabel,
                label: long.optionLabel,
                removeHref: "/store",
              },
            ],
            clearHref: "/store",
          },
          copy: { title: long.linkLabel, apply: long.action },
        }),
      );
      expect(classesIn(form()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
      expect(screen.getByRole("heading", { name: long.linkLabel }).className).toContain(
        "wrap-anywhere",
      );
      expect(screen.getByRole("button", { name: long.fieldLabel }).textContent).toContain(
        long.fieldLabel,
      );
      expect(screen.getByRole("button", { name: long.action }).className).toContain("w-full");
      expect(
        screen.getByRole("switch", { name: new RegExp(long.toggleLabel.slice(0, 12)) }),
      ).toBeTruthy();
      expect(within(plainOption(long.optionLabel)).getByText(long.optionLabel).className).toContain(
        "wrap-anywhere",
      );
    },
  );
});

/** The label of the checkbox row whose text starts with `text`. */
function plainOption(text: string): HTMLElement {
  const row = screen.getByText(text, { selector: "span" }).closest("label");
  if (row === null) throw new Error(`no row for ${text}`);
  return row;
}

describe("the files (D42, D49)", () => {
  const read = (name: string) => readFileSync(path.join(import.meta.dirname, name), "utf8");
  const specifiers = (source: string) =>
    [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map((match) => match[1] ?? "");

  it.each(["filter-sidebar.tsx", "filter-fields.tsx"])(
    "keeps %s a server component, with no client hook of its own",
    (name) => {
      const source = read(name);
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(source).not.toMatch(/\buse(?:State|Effect|Reducer|Ref|Callback|Memo)\(/);
    },
  );

  it("holds one markup of the fields for the two shells", () => {
    expect(specifiers(read("filter-sidebar.tsx"))).toContain("./filter-fields");
    expect(specifiers(read("filter-drawer.tsx"))).toContain("./filter-fields");
  });

  it("builds the sections with the T33 molecules and the accordion primitive, and keeps their panels", () => {
    const source = read("filter-fields.tsx");
    expect(specifiers(source)).toEqual(
      expect.arrayContaining([
        "@shopblok/ui/molecules/accordion-item",
        "@shopblok/ui/molecules/filter-group",
        "@shopblok/ui/primitives/accordion",
      ]),
    );
    expect(source).toMatch(/<Accordion\s[^>]*\bkeepMounted\b/s);
  });
});
