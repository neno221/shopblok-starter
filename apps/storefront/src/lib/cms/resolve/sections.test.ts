import { describe, expect, it } from "vitest";
import type { Media } from "../../../payload-types";
import { findMarket } from "../../markets/market";
import { seeded } from "../../markets/test-maps";
import { paragraphs, resolveBlock, resolveLayout, sectionLink, type LayoutBlock } from "./sections";

const us = findMarket(seeded, "en-us")!;
const cy = findMarket(seeded, "el-cy")!;
const context = { market: us, map: seeded };

const media = (id: number, mimeType: string, extra: Partial<Media> = {}): Media => ({
  id,
  alt: `File ${id}`,
  url: `/api/media/file/${id}`,
  mimeType,
  width: mimeType.startsWith("image/") ? 1200 : null,
  height: mimeType.startsWith("image/") ? 800 : null,
  updatedAt: "2026-10-29T00:00:00.000Z",
  createdAt: "2026-10-29T00:00:00.000Z",
  ...extra,
});

const product = { id: 7, handle: "heritage-hoodie", title: "Heritage Hoodie" };
const lexical = {
  root: {
    type: "root",
    children: [{ type: "paragraph", version: 1, children: [] }],
    direction: null,
    format: "",
    indent: 0,
    version: 1,
  },
} as const;

describe("resolveBlock (T63)", () => {
  it("applies the settings, dropping Payload's empty values", () => {
    const resolved = resolveBlock(
      {
        blockType: "spacer",
        id: "s1",
        variant: "standard",
        size: "large",
        divider: null,
        sectionSettings: { anchor: "", spacing: "small", surface: null, container: "wide" },
      } as LayoutBlock,
      context,
    );
    expect(resolved).toEqual({
      key: "s1",
      blockType: "spacer",
      section: {
        settings: { spacing: "small", container: "wide" },
        size: "large",
        divider: false,
      },
    });
  });

  it("resolves a media-with-text block's picture and links for the market, leaving out what cannot be a call to action", () => {
    const block = {
      blockType: "mediaWithText",
      id: "m1",
      variant: "standard",
      media: media(1, "image/webp"),
      imageSide: "start",
      heading: "Heritage",
      content: lexical,
      links: [
        {
          link: {
            type: "reference",
            reference: { relationTo: "products", value: product },
            label: "Shop",
            appearance: "outline",
          },
        },
        { link: { type: "custom", url: "/sale", label: "Sale", newTab: true } },
        { link: { type: "custom", url: "mailto:hi@example.com", label: "Mail" } },
      ],
    } as unknown as LayoutBlock;
    const forUs = resolveBlock(block, context);
    expect(forUs?.blockType).toBe("mediaWithText");
    if (forUs?.blockType !== "mediaWithText") return;
    expect(forUs.section.image).toEqual({
      src: "/api/media/file/1",
      alt: "File 1",
      width: 1200,
      height: 800,
    });
    expect(forUs.section.links).toEqual([
      { label: "Shop", href: "/us/products/heritage-hoodie", appearance: "outline" },
      { label: "Sale", href: "/us/sale", external: true },
    ]);
    expect(forUs.content).toEqual(lexical);
    const forCyprus = resolveBlock(block, { market: cy, map: seeded });
    if (forCyprus?.blockType !== "mediaWithText") throw new Error("not resolved");
    expect(forCyprus.section.links[0]?.href).toBe("/products/heritage-hoodie");
  });

  it("leaves out a block that does not parse: a media-with-text block whose picture is a video", () => {
    expect(
      resolveBlock(
        {
          blockType: "mediaWithText",
          variant: "standard",
          media: media(2, "video/mp4"),
          imageSide: "end",
        } as LayoutBlock,
        context,
      ),
    ).toBeNull();
  });

  it("splits a FAQ answer into paragraphs at blank lines, and keys each question by its row", () => {
    const resolved = resolveBlock(
      {
        blockType: "faq",
        id: "f1",
        variant: "standard",
        heading: null,
        items: [
          { id: "q1", question: "Shipping?", answer: "Two days.\r\n\r\n  \nFree over $75.\n" },
        ],
      } as LayoutBlock,
      context,
    );
    expect(resolved?.blockType === "faq" && resolved.section).toEqual({
      settings: {},
      items: [{ value: "q1", title: "Shipping?", answer: ["Two days.", "Free over $75."] }],
    });
    expect(paragraphs("One\nline\n\nTwo")).toEqual(["One\nline", "Two"]);
  });

  it("leaves out a FAQ whose draft row has no answer yet, rather than failing (PR 95 review, item 1)", () => {
    const block = {
      blockType: "faq",
      id: "f2",
      variant: "standard",
      items: [{ id: "q1", question: "Shipping?", answer: null }],
    } as unknown as LayoutBlock;
    expect(() => resolveBlock(block, context)).not.toThrow();
    expect(resolveBlock(block, context)).toBeNull();
  });

  it("passes only the settings an editor set, so a section's own default holds (PR 95 review, item 3)", () => {
    const resolved = resolveBlock(
      {
        blockType: "faq",
        id: "f3",
        variant: "standard",
        items: [{ id: "q1", question: "Shipping?", answer: "Two days." }],
        sectionSettings: { anchor: null, spacing: "medium", surface: null, container: null },
      } as unknown as LayoutBlock,
      context,
    );
    expect(resolved?.blockType === "faq" && Object.keys(resolved.section.settings ?? {})).toEqual([
      "spacing",
    ]);
  });

  it("names a logo by its brand and links it to https only", () => {
    const resolved = resolveBlock(
      {
        blockType: "logoCloud",
        variant: "standard",
        logos: [
          {
            id: "l1",
            name: "Northwind",
            image: media(3, "image/png"),
            url: "https://north.example",
          },
          {
            id: "l2",
            name: "Atelier",
            image: media(4, "image/png"),
            url: "http://atelier.example",
          },
          { id: "l3", name: "Missing", image: 99 },
        ],
      } as unknown as LayoutBlock,
      context,
    );
    if (resolved?.blockType !== "logoCloud") throw new Error("not resolved");
    expect(resolved.section.logos.map((logo) => [logo.name, logo.image.alt, logo.href])).toEqual([
      ["Northwind", "Northwind", "https://north.example"],
      ["Atelier", "Atelier", undefined],
    ]);
  });

  it("turns a video's address into the provider and id, and refuses another host", () => {
    const video = (url: string) =>
      resolveBlock(
        {
          blockType: "video",
          variant: "standard",
          title: "How it is made",
          source: "embed",
          url,
        } as LayoutBlock,
        context,
      );
    const unlisted = video("https://vimeo.com/76979871/abc123def0");
    expect(unlisted?.blockType === "video" && unlisted.section.source).toEqual({
      kind: "embed",
      provider: "vimeo",
      videoId: "76979871",
      hash: "abc123def0",
    });
    const resolved = video("https://youtu.be/aqz-KE-bpKQ");
    expect(resolved?.blockType === "video" && resolved.section.source).toEqual({
      kind: "embed",
      provider: "youtube",
      videoId: "aqz-KE-bpKQ",
    });
    expect(video("https://example.com/video")).toBeNull();
  });

  it("plays an upload with its captions, each named by its language; one without captions is left out", () => {
    const block = (captions: unknown[]) =>
      ({
        blockType: "video",
        variant: "standard",
        title: "How it is made",
        source: "upload",
        file: media(5, "video/mp4"),
        captions,
        poster: media(6, "image/jpeg"),
      }) as unknown as LayoutBlock;
    const resolved = resolveBlock(
      block([
        { language: "el", file: media(7, "text/vtt") },
        { language: "en", file: media(8, "image/png") },
        // A language twice in a draft: the first one plays (PR 95 review, item 6).
        { language: "el", file: media(9, "text/vtt") },
      ]),
      context,
    );
    expect(resolved?.blockType === "video" && resolved.section.source).toEqual({
      kind: "file",
      src: "/api/media/file/5",
      type: "video/mp4",
      tracks: [{ src: "/api/media/file/7", srclang: "el", label: "Ελληνικά" }],
    });
    // WCAG 1.2.2: no captions, no video.
    expect(resolveBlock(block([]), context)).toBeNull();
  });

  it("keeps the testimonials' optional parts optional", () => {
    const resolved = resolveBlock(
      {
        blockType: "testimonials",
        variant: "standard",
        quotes: [
          { id: "t1", quote: "Lovely.", author: "Ana", role: null, rating: null, avatar: null },
        ],
      } as LayoutBlock,
      context,
    );
    expect(resolved?.blockType === "testimonials" && resolved.section.quotes).toEqual([
      { id: "t1", quote: "Lovely.", author: "Ana" },
    ]);
  });
});

describe("resolveLayout", () => {
  it("keeps the blocks that can be drawn, in the editor's order", async () => {
    const layout = [
      { blockType: "spacer", id: "a", variant: "standard", size: "small" },
      { blockType: "uspBar", id: "b", variant: "standard", items: [] },
      { blockType: "richText", id: "c", variant: "standard", content: lexical },
    ] as unknown as LayoutBlock[];
    expect((await resolveLayout(layout, context)).map((block) => block.key)).toEqual(["a", "c"]);
    expect(await resolveLayout(null, context)).toEqual([]);
  });

  it("leaves the commerce blocks out without the market's catalog", async () => {
    const layout = [
      { blockType: "recentlyViewed", id: "a", variant: "standard", heading: "Seen" },
      { blockType: "spacer", id: "b", variant: "standard", size: "small" },
    ] as unknown as LayoutBlock[];
    expect((await resolveLayout(layout, context)).map((block) => block.key)).toEqual(["b"]);
  });
});

describe("sectionLink", () => {
  it("needs a label and a page or site to go to", () => {
    expect(sectionLink({ type: "custom", url: "/sale", label: " " }, context)).toBeUndefined();
    expect(
      sectionLink({ type: "custom", url: "javascript:x", label: "X" }, context),
    ).toBeUndefined();
    expect(sectionLink({ type: "custom", url: "https://a.example", label: "A" }, context)).toEqual({
      label: "A",
      href: "https://a.example",
    });
  });
});
