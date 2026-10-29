// Ours (T38, SETUP.md "Product-page organisms (T38)"). The tests of ProductInfoAccordions, in
// happy-dom with Testing Library: the region and the section headings in the four catalogs, which
// sections are open at first and what opens and closes them (a pointer, Enter, Space; the arrow
// keys between the titles are Base UI's own and happy-dom does not run them), that a closed
// section's text is still in the page, the five kinds of block (paragraphs, a
// list, facts, a link, the shop's rich text), the heading level, `prefetch`, a long German and Greek title, and the
// files' rules. Pixels are not measurable here: the layout at 375, 768 and 1440 px, the facts'
// columns, the 44 px rule and axe are the design system's own checks, which are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { ProductInfo } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ProductInfoAccordions, type ProductInfoAccordionsProps } from "./product-info-accordions";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

const copyOf = (locale: Locale) => catalogs[locale].organisms.productInfoAccordions;
const infoOf = (locale: Locale) => commerceFixtures[locale].productPage.info;

function element(locale: Locale = "en", props: Partial<ProductInfoAccordionsProps> = {}) {
  return (
    <ProductInfoAccordions
      {...infoOf(locale)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}
const setup = (locale: Locale = "en", props?: Partial<ProductInfoAccordionsProps>) =>
  render(element(locale, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const all = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
/** Text with its spaces made plain: French writes a no-break space before "?" and ":". */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const triggers = () => all("accordion-trigger");
const panels = () => all("accordion-content");
const expanded = () => triggers().map((trigger) => trigger.getAttribute("aria-expanded"));
const trigger = (title: string) => screen.getByRole("button", { name: title });
/** The panel of the section at this index (a closed trigger carries no `aria-controls`). */
const panelAt = (index: number) => panels()[index] as HTMLElement;

describe("ProductInfoAccordions", () => {
  describe.each(LOCALES)("the region and its sections · %s", (locale) => {
    it("is one region named by the catalog, with a heading and a button for each section", () => {
      setup(locale);
      const region = screen.getByRole("region", { name: copyOf(locale).label });
      expect(region).toBe(slot("product-info-accordions"));
      expect(region.tagName).toBe("SECTION");
      // The open section's panel is a region of its own (Base UI), named by its title.
      expect(screen.getAllByRole("region")).toHaveLength(2);
      const { sections } = infoOf(locale);
      expect(screen.getAllByRole("heading")).toHaveLength(sections.length);
      for (const section of sections) {
        const heading = screen.getByRole("heading", { level: 2, name: section.title });
        expect(within(heading).getByRole("button", { name: section.title })).toBeTruthy();
      }
    });

    it("opens the first section and closes the rest, with the text of every one in the page", () => {
      setup(locale);
      const { sections } = infoOf(locale);
      expect(expanded()).toEqual(sections.map((_, index) => (index === 0 ? "true" : "false")));
      const first = sections[0]?.blocks[0];
      expect(first?.kind).toBe("text");
      // A closed section's words are in the document for find-in-page and for a crawler.
      const text = plain(document.body.textContent);
      for (const section of sections) {
        for (const block of section.blocks) {
          if (block.kind === "text") {
            for (const paragraph of block.paragraphs) expect(text).toContain(plain(paragraph));
          }
          if (block.kind === "list") {
            for (const item of block.items) expect(text).toContain(plain(item));
          }
          if (block.kind === "facts") {
            for (const row of block.rows) {
              expect(text).toContain(plain(row.label));
              expect(text).toContain(plain(row.value));
            }
          }
          if (block.kind === "link") expect(text).toContain(plain(block.link.label));
        }
      }
    });
  });

  describe("what is open at first", () => {
    it("is the first section, with its panel shown and the others' panels hidden", () => {
      setup("en");
      const { sections } = infoOf("en");
      expect(panels()).toHaveLength(sections.length);
      expect(panels().map((panel) => panel.hasAttribute("hidden"))).toEqual(
        sections.map((_, index) => index !== 0),
      );
    });

    it("is the sections `defaultOpen` lists, by id, and none when it is empty", () => {
      const view = setup("en", { defaultOpen: ["details", "returns"] });
      expect(expanded()).toEqual(["false", "true", "false", "true"]);
      view.unmount();
      setup("en", { defaultOpen: [] });
      expect(expanded()).toEqual(["false", "false", "false", "false"]);
      expect(panels().every((panel) => panel.hasAttribute("hidden"))).toBe(true);
    });

    it("ignores an id that is no section", () => {
      setup("en", { defaultOpen: ["nothing", "delivery"] });
      expect(expanded()).toEqual(["false", "false", "true", "false"]);
    });

    it("has the first section open in the server's markup, with no script", () => {
      const html = renderToString(element("en"));
      const { sections } = infoOf("en");
      expect(html).toContain('data-slot="product-info-accordions"');
      expect(html).toContain('aria-expanded="true"');
      expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
      expect(html.match(/aria-expanded="false"/g)).toHaveLength(sections.length - 1);
      // Every section's words are in the HTML, the closed ones too.
      for (const section of sections) expect(html).toContain(section.title);
      const delivery = sections.find((section) => section.id === "delivery");
      const block = delivery?.blocks[0];
      if (block?.kind === "text") expect(html).toContain(block.paragraphs[0]);
    });
  });

  describe("opening and closing", () => {
    it("opens a section with a click and shows its panel, and a second click closes it", async () => {
      setup("en");
      const user = userEvent.setup();
      const title = infoOf("en").sections[2]?.title ?? "";
      expect(panelAt(2).hasAttribute("hidden")).toBe(true);
      await user.click(trigger(title));
      await waitFor(() => expect(trigger(title).getAttribute("aria-expanded")).toBe("true"));
      expect(panelAt(2).hasAttribute("hidden")).toBe(false);
      await user.click(trigger(title));
      await waitFor(() => expect(trigger(title).getAttribute("aria-expanded")).toBe("false"));
    });

    it("lets several be open at once: opening one closes none", async () => {
      setup("en");
      const user = userEvent.setup();
      const { sections } = infoOf("en");
      await user.click(trigger(sections[1]?.title ?? ""));
      await user.click(trigger(sections[3]?.title ?? ""));
      await waitFor(() => expect(expanded()).toEqual(["true", "true", "false", "true"]));
    });

    it("can close the section that is open: all of them can be shut", async () => {
      setup("en");
      const user = userEvent.setup();
      await user.click(trigger(infoOf("en").sections[0]?.title ?? ""));
      await waitFor(() => expect(expanded()).toEqual(["false", "false", "false", "false"]));
    });

    it.each(["{Enter}", " "])("opens with the keyboard on %j", async (key) => {
      setup("en");
      const user = userEvent.setup();
      const title = infoOf("en").sections[1]?.title ?? "";
      trigger(title).focus();
      await user.keyboard(key);
      await waitFor(() => expect(trigger(title).getAttribute("aria-expanded")).toBe("true"));
    });

    it("is reached by Tab: each title in turn, then the link of a section that is open", async () => {
      setup("en", { defaultOpen: ["returns"] });
      const user = userEvent.setup();
      await user.tab();
      expect(document.activeElement).toBe(triggers()[0]);
      await user.tab();
      expect(document.activeElement).toBe(triggers()[1]);
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(triggers()[3]);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: /./ }));
    });
  });

  describe("the sections", () => {
    it("are headings of the level the page says, h2 by default", () => {
      const view = setup("en");
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
      view.unmount();
      const third = setup("en", { headingLevel: 3 });
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
      expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
      third.unmount();
      setup("en", { headingLevel: 4 });
      expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(4);
      expect(screen.queryAllByRole("heading", { level: 3 })).toEqual([]);
    });

    it("keep the titles 44 px tall and wrapping, and the content at a readable measure", () => {
      setup("en", { defaultOpen: ["description", "details", "returns"] });
      for (const each of triggers()) {
        expect(tokens(each)).toContain("min-h-11");
        expect(tokens(each.firstElementChild)).toContain("wrap-anywhere");
        expect(each.className).not.toMatch(CLIPPING_CLASSES);
      }
      for (const each of [
        ...all("product-info-text"),
        ...all("product-info-list"),
        ...all("product-info-facts"),
      ]) {
        expect(tokens(each)).toContain("max-w-prose");
      }
    });
  });

  describe("the blocks", () => {
    it("draw a text block as paragraphs, each its own <p>", () => {
      setup("en", { defaultOpen: ["description"] });
      const block = infoOf("en").sections[0]?.blocks[0];
      if (block?.kind !== "text") throw new Error("the first block is text");
      const text = slot("product-info-text") as HTMLElement;
      expect([...text.querySelectorAll("p")].map((p) => p.textContent)).toEqual(block.paragraphs);
      for (const paragraph of text.querySelectorAll("p")) {
        expect(tokens(paragraph)).toContain("wrap-anywhere");
      }
    });

    it("draw a list block as a bulleted list, one item each", () => {
      setup("en", { defaultOpen: ["details"] });
      const block = infoOf("en").sections[1]?.blocks.find((each) => each.kind === "list");
      if (block?.kind !== "list") throw new Error("the details have a list");
      const list = slot("product-info-list") as HTMLElement;
      expect(list.tagName).toBe("UL");
      expect(tokens(list)).toContain("list-disc");
      expect(
        within(list)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(block.items);
    });

    it("draw a facts block as a description list: a term and its value, side by side from sm", () => {
      setup("en", { defaultOpen: ["details"] });
      const block = infoOf("en").sections[1]?.blocks.find((each) => each.kind === "facts");
      if (block?.kind !== "facts") throw new Error("the details have facts");
      const facts = slot("product-info-facts") as HTMLElement;
      expect(facts.tagName).toBe("DL");
      expect([...facts.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(
        block.rows.map((row) => row.label),
      );
      expect([...facts.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(
        block.rows.map((row) => row.value),
      );
      // A term and its value are the only things in a row, as the HTML spec allows inside a <dl>.
      for (const row of facts.children) {
        expect([...row.children].map((child) => child.tagName)).toEqual(["DT", "DD"]);
      }
      expect(tokens(facts)).toContain("sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]");
      expect(tokens(facts.firstElementChild)).toContain("sm:grid-cols-subgrid");
    });

    it("draw a link block as a link on a line of its own, 44 px tall, to its address", () => {
      setup("en", { defaultOpen: ["returns"] });
      const block = infoOf("en").sections[3]?.blocks.find((each) => each.kind === "link");
      if (block?.kind !== "link") throw new Error("the returns have a link");
      const link = screen.getByRole("link", { name: block.link.label });
      expect(link).toBe(slot("product-info-link"));
      expect(link.getAttribute("href")).toBe(block.link.href);
      expect(tokens(link)).toContain("min-h-11");
      expect(tokens(link)).toContain("w-fit");
      expect(tokens(link)).toContain("wrap-anywhere");
      expect(link.parentElement?.getAttribute("class")).toContain("flex-col");
    });

    it("keep an external link in the same tab: the catalog has no note for a new one", () => {
      const info: ProductInfo = {
        sections: [
          {
            id: "more",
            title: "More",
            blocks: [
              {
                kind: "link",
                link: { label: "Size chart", href: "https://example.com/sizes", external: true },
              },
            ],
          },
        ],
      };
      render(
        <ProductInfoAccordions {...info} copy={copyOf("en")} locale="en-US" prefetch={false} />,
      );
      const link = screen.getByRole("link", { name: "Size chart" });
      expect(link.hasAttribute("target")).toBe(false);
      expect(link.hasAttribute("rel")).toBe(false);
    });

    it("draw a section's blocks in order, with a gap between them", () => {
      setup("en", { defaultOpen: ["details"] });
      const body = slot("product-info-facts")?.parentElement as HTMLElement;
      expect(tokens(body)).toEqual(expect.arrayContaining(["flex", "flex-col", "gap-4"]));
      expect([...body.children].map((child) => child.getAttribute("data-slot"))).toEqual([
        "product-info-facts",
        "product-info-list",
      ]);
    });
  });

  describe("prefetch (every story passes false: the pages answer 404 until M3)", () => {
    it("reaches the link", () => {
      setup("en", { prefetch: false, defaultOpen: ["returns"] });
      expect(slot("product-info-link")?.getAttribute("data-prefetch")).toBe("false");
    });

    it("is left to Next when it is not given", () => {
      setup("en", { prefetch: undefined, defaultOpen: ["returns"] });
      expect(slot("product-info-link")?.getAttribute("data-prefetch")).toBe("undefined");
    });
  });

  describe.each(longLabels)("a long %s title and paragraph", (locale, strings) => {
    const long = (): ProductInfo => ({
      sections: [
        {
          id: "description",
          title: strings.productName,
          blocks: [
            { kind: "text", paragraphs: [strings.productDescription] },
            { kind: "facts", rows: [{ label: strings.fieldLabel, value: strings.imageAlt }] },
            { kind: "list", items: [strings.helpText] },
            { kind: "link", link: { label: strings.linkLabel, href: "/returns" } },
          ],
        },
        { id: "more", title: strings.badge, blocks: [{ kind: "text", paragraphs: ["x"] }] },
      ],
    });

    it("is read in full, wraps anywhere, and nothing is cut", () => {
      const { container } = render(
        <ProductInfoAccordions
          {...long()}
          copy={copyOf(locale)}
          locale={htmlLang[locale]}
          prefetch={false}
        />,
      );
      expect(screen.getByRole("button", { name: strings.productName })).toBeTruthy();
      expect(screen.getByText(strings.productDescription)).toBeTruthy();
      expect(screen.getByRole("link", { name: strings.linkLabel })).toBeTruthy();
      for (const part of [
        slot("product-info-accordions"),
        ...all("accordion-trigger"),
        ...all("accordion-content"),
        slot("product-info-text"),
        slot("product-info-facts"),
        slot("product-info-list"),
        slot("product-info-link"),
      ]) {
        expect(part?.className).not.toMatch(CLIPPING_CLASSES);
      }
      for (const wrapping of [
        slot("product-info-link"),
        slot("product-info-text")?.firstElementChild,
        slot("product-info-facts")?.querySelector("dt"),
        slot("product-info-facts")?.querySelector("dd"),
        slot("product-info-list")?.querySelector("li"),
      ]) {
        expect(tokens(wrapping ?? null)).toContain("wrap-anywhere");
      }
      expect(tokens(slot("product-info-accordions"))).toContain("min-w-0");
      expect(container.querySelectorAll("[data-truncate]")).toHaveLength(0);
    });
  });

  describe("the file", () => {
    const text = source("product-info-accordions.tsx");

    it("keeps the class rules: tokens, logical properties, light only", () => {
      expect(findViolations(text)).toEqual([]);
    });

    it("opens with the T38 header, uses no em dash and cuts nothing", () => {
      expect(text.startsWith('// Ours (T38, SETUP.md "Product-page organisms (T38)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it("is a server component: no directive, no hook, no catalog", () => {
      expect(text).not.toMatch(/^"use client";?$/m);
      expect(text).not.toMatch(/\buse(?:State|Effect|Ref|Reducer|Memo|Callback)\b/);
      const imported = [
        ...text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms),
      ].map((match) => match[1] ?? "");
      expect(
        imported.filter((name) => /^@shopblok\/(?:i18n|registry|fixtures)/.test(name)),
      ).toEqual([]);
    });

    it("keeps every section mounted, and does not use hidden=until-found", () => {
      expect(text).toMatch(/<Accordion multiple keepMounted\b/);
      const code = text
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//"))
        .join("\n");
      expect(code).not.toMatch(/hiddenUntilFound/);
    });
  });
});

describe("ProductInfoAccordions: the shop's rich text (T69)", () => {
  const info: ProductInfo = {
    sections: [
      { id: "description", title: "Description", blocks: [{ kind: "rich" }] },
      {
        id: "delivery",
        title: "Delivery",
        blocks: [{ kind: "text", paragraphs: ["Ships in 2 days."] }, { kind: "rich" }],
      },
    ],
  };

  it("draws the page's rich text where a section has its rich block, with the editor's text's look", () => {
    setup("en", {
      ...info,
      defaultOpen: ["description", "delivery"],
      rich: {
        description: (
          <>
            <h3>Soft cotton</h3>
            <p>
              Brushed inside, <strong>heavy</strong> outside.
            </p>
          </>
        ),
      },
    });
    const [rich, ...more] = all("product-info-rich");
    expect(more).toEqual([]);
    expect(rich?.closest('[data-slot="accordion-content"]')).toBe(panelAt(0));
    expect(rich?.getAttribute("data-slot")).toBe("product-info-rich");
    expect(tokens(rich)).toContain("max-w-prose");
    expect(within(rich as HTMLElement).getByRole("heading", { level: 3 }).textContent).toBe(
      "Soft cotton",
    );
    // A rich block with no text for its section draws nothing; the section's other blocks stay.
    expect(plain(panelAt(1).textContent)).toBe("Ships in 2 days.");
  });
});
