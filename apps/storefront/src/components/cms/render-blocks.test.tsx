import { catalogs } from "@shopblok/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findMarket } from "../../lib/markets/market";
import { seeded } from "../../lib/markets/test-maps";
import type { LayoutBlock } from "../../lib/cms/resolve/sections";
import { fakeCatalog, synced, unitedStates } from "../../test-support/fake-catalog";
import type { CommerceContext } from "../../lib/cms/resolve/commerce";
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

// An async server component: awaited, then rendered as the server would.
const render = async (blocks: LayoutBlock[]) =>
  renderToStaticMarkup(
    await RenderBlocks({ blocks, context: { market: us, map: seeded }, messages: catalogs.en }),
  );

describe("RenderBlocks (T63)", () => {
  it("draws each block by its section, in order, with its settings", async () => {
    const html = await render([
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

  it("renders rich text with the market's link rule: internal to the market, unsafe as text", async () => {
    const html = await render([
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

  it("writes one FAQPage JSON-LD for all the page's questions, and none without a FAQ", async () => {
    const html = await render([faq("a", "Shipping?"), faq("b", "Returns?")]);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0]?.[1] ?? "{}") as {
      "@type": string;
      mainEntity: { name: string }[];
    };
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity.map((question) => question.name)).toEqual(["Shipping?", "Returns?"]);
    expect(await render([])).not.toContain("application/ld+json");
  });

  it("escapes the editor's text in the JSON-LD", async () => {
    const html = await render([faq("x", "</script><script>alert(1)</script>")]);
    expect(html).not.toContain("</script><script>alert(1)");
  });

  it("draws an embed's poster and play button, and no frame", async () => {
    const html = await render([
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

describe("RenderBlocks, the commerce blocks (T64)", () => {
  const commerce: CommerceContext = {
    reads: fakeCatalog(unitedStates).reads,
    hrefs: {
      product: (handle) => `/us/products/${handle}`,
      category: (path) => `/us/categories/${path}`,
      collection: (handle) => `/us/collections/${handle}`,
    },
    now: "2026-10-29T12:00:00.000Z",
    storeHref: "/us/store",
    words: {
      empty: { title: "Nothing", text: "None yet.", action: "Shop" },
      recentlyViewed: "Recently viewed",
    },
  };
  const blocks = [
    {
      blockType: "hero",
      id: "h",
      variant: "standard",
      heading: "Autumn is here",
      productSource: { mode: "handpicked", products: [synced("prod_mug")] },
    },
    {
      blockType: "productCollection",
      id: "p",
      variant: "standard",
      heading: "New in",
      display: "grid",
      productSource: { mode: "newest", limit: 2 },
    },
    { blockType: "recentlyViewed", id: "r", variant: "standard" },
  ] as unknown as LayoutBlock[];
  const draw = async (heroTitle: boolean, withCatalog = true) =>
    renderToStaticMarkup(
      await RenderBlocks({
        blocks,
        context: { market: us, map: seeded, ...(withCatalog ? { commerce } : {}) },
        messages: catalogs.en,
        heroTitle,
      }),
    );

  it("draws them with the market's catalog, prices in its currency", async () => {
    const html = await draw(false);
    expect(html).toContain('data-slot="hero-section"');
    expect(html).toMatch(/<h2[^>]*data-slot="hero-heading"[^>]*>Autumn is here<\/h2>/);
    expect(html).toContain('data-slot="product-collection-section"');
    expect(html).toContain("/us/products/hoodie");
    expect(html).toContain("$65.00");
    // The visitor's list is the browser's: nothing on the server (D44).
    expect(html).not.toContain("Recently viewed");
  });

  it("gives the page's h1 to a hero that opens it, and leaves the blocks out without a catalog", async () => {
    expect(await draw(true)).toMatch(/<h1[^>]*data-slot="hero-heading"/);
    expect(await draw(false, false)).toBe("");
  });
});
