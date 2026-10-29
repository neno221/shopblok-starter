import { catalogs } from "@shopblok/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findMarket } from "../../lib/markets/market";
import { seeded } from "../../lib/markets/test-maps";
import type { LayoutBlock } from "../../lib/cms/resolve/sections";
import { RenderBlocks } from "./render-blocks";

const us = findMarket(seeded, "en-us")!;

const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  version: 1,
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  children,
});
const textNode = (text: string) => ({
  type: "text",
  version: 1,
  text,
  format: 0,
  style: "",
  mode: "normal",
  detail: 0,
});
const linkNode = (fields: Record<string, unknown>, text: string) => ({
  type: "link",
  version: 3,
  direction: null,
  format: "",
  indent: 0,
  fields,
  children: [textNode(text)],
});
const state = (children: unknown[]) => ({
  root: { type: "root", version: 1, direction: null, format: "", indent: 0, children },
});

const faq = (id: string, question: string) =>
  ({
    blockType: "faq",
    id,
    variant: "standard",
    heading: "Questions",
    items: [{ id: `${id}-q`, question, answer: "An answer." }],
  }) as unknown as LayoutBlock;

const render = (blocks: LayoutBlock[]) =>
  renderToStaticMarkup(
    <RenderBlocks blocks={blocks} context={{ market: us, map: seeded }} messages={catalogs.en} />,
  );

describe("RenderBlocks (T63)", () => {
  it("draws each block by its section, in order, with its settings", () => {
    const html = render([
      {
        blockType: "spacer",
        id: "s",
        variant: "standard",
        size: "small",
        divider: true,
        sectionSettings: { anchor: "gap", surface: "muted" },
      },
      faq("f", "Shipping?"),
    ] as unknown as LayoutBlock[]);
    expect(html.indexOf('data-slot="spacer-section"')).toBeLessThan(
      html.indexOf('data-slot="faq-section"'),
    );
    expect(html).toContain('id="gap"');
    expect(html).toContain('data-surface="muted"');
  });

  it("renders rich text with the market's link rule: internal to the market, unsafe as text", () => {
    const html = render([
      {
        blockType: "richText",
        id: "r",
        variant: "standard",
        content: state([
          paragraph([
            textNode("See "),
            linkNode(
              {
                linkType: "internal",
                doc: { relationTo: "products", value: { id: 1, handle: "heritage-hoodie" } },
              },
              "the hoodie",
            ),
            textNode(", "),
            linkNode({ linkType: "custom", url: "/sale", newTab: true }, "the sale"),
            textNode(" and "),
            linkNode({ linkType: "custom", url: "javascript:alert(1)" }, "nothing"),
          ]),
        ]),
      },
    ] as unknown as LayoutBlock[]);
    expect(html).toContain('<a href="/us/products/heritage-hoodie">the hoodie</a>');
    expect(html).toContain(
      '<a href="/us/sale" target="_blank" rel="noopener noreferrer">the sale</a>',
    );
    expect(html).not.toContain("javascript:");
    expect(html).toContain("nothing");
    expect(html).toContain('data-slot="prose"');
  });

  it("writes one FAQPage JSON-LD for all the page's questions, and none without a FAQ", () => {
    const html = render([faq("a", "Shipping?"), faq("b", "Returns?")]);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0]?.[1] ?? "{}") as {
      "@type": string;
      mainEntity: { name: string }[];
    };
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity.map((question) => question.name)).toEqual(["Shipping?", "Returns?"]);
    expect(render([])).not.toContain("application/ld+json");
  });

  it("escapes the editor's text in the JSON-LD", () => {
    const html = render([faq("x", "</script><script>alert(1)</script>")]);
    expect(html).not.toContain("</script><script>alert(1)");
  });

  it("draws an embed's poster and play button, and no frame", () => {
    const html = render([
      {
        blockType: "video",
        id: "v",
        variant: "standard",
        title: "How it is made",
        source: "embed",
        url: "https://vimeo.com/76979871",
      },
    ] as unknown as LayoutBlock[]);
    expect(html).toContain("Play video: How it is made");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("vimeo.com/");
  });
});

describe("RenderBlocks: the forms (T67, D81)", () => {
  const contact = {
    id: 4,
    title: "Contact",
    confirmationMessage: state([paragraph([textNode("Thanks, we write back.")])]),
    fields: [
      { blockType: "text", id: "f1", name: "name", label: "Name", required: true },
      { blockType: "message", id: "f2", message: state([paragraph([textNode("We read all.")])]) },
      { blockType: "email", id: "f3", name: "email", label: "Email", required: true },
    ],
  };
  const signup = {
    id: 3,
    title: "Newsletter",
    fields: [{ blockType: "email", id: "e1", name: "address", label: "Email", required: true }],
  };

  it("draws a form block with the editor's text between the fields and the spam trap, posting to its anchor", () => {
    const html = render([
      { blockType: "formBlock", id: "c1", variant: "standard", heading: "Write", form: contact },
    ] as unknown as LayoutBlock[]);
    expect(html).toContain('id="form-c1"');
    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain("We read all.");
    expect(html).toMatch(/<div hidden="" data-slot="form-honeypot">.*name="website"/);
    // The confirmation is drawn only once the form is sent.
    expect(html).not.toContain("Thanks, we write back.");
  });

  it("draws a newsletter with its form's own field name and the spam trap", () => {
    const html = render([
      {
        blockType: "newsletter",
        id: "n1",
        variant: "standard",
        form: signup,
        privacy: { type: "custom", url: "/privacy" },
      },
    ] as unknown as LayoutBlock[]);
    expect(html).toContain('id="form-n1"');
    expect(html).toContain('name="address"');
    expect(html).toContain('href="/us/privacy"');
    expect(html).toContain('name="website"');
  });
});
