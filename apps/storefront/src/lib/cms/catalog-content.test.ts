import { describe, expect, it } from "vitest";
import { catalogContent, richTextOrNull } from "./catalog-content";

// T69 (D83): what the catalog's content reads hand the pages.

const paragraph = (text: string) => ({
  type: "paragraph",
  children: text === "" ? [] : [{ type: "text", text, format: 0 }],
});
const state = (...children: object[]) => ({ root: { type: "root", children } });
const upload = (filename: string, mimeType = "image/webp") => ({
  id: filename,
  url: `http://localhost:8000/api/media/file/${filename}`,
  filename,
  alt: `About ${filename}`,
  width: 1200,
  height: 400,
  mimeType,
});

describe("richTextOrNull", () => {
  it("is null for no value and for an emptied editor (one empty paragraph, or spaces)", () => {
    expect(richTextOrNull(null)).toBeNull();
    expect(richTextOrNull(undefined)).toBeNull();
    expect(richTextOrNull(state(paragraph("")))).toBeNull();
    expect(richTextOrNull(state(paragraph("   "), paragraph("")))).toBeNull();
  });

  it("is null for an emptied heading, quote or list (Lexical keeps the first block's type)", () => {
    expect(richTextOrNull(state({ type: "heading", tag: "h3", children: [] }))).toBeNull();
    expect(
      richTextOrNull(state({ type: "quote", children: [{ type: "text", text: " " }] })),
    ).toBeNull();
    const emptyList = {
      type: "list",
      listType: "bullet",
      children: [{ type: "listitem", children: [] }],
    };
    expect(richTextOrNull(state(emptyList))).toBeNull();
  });

  it("keeps a text, and a node that shows by itself (a rule)", () => {
    const written = state(paragraph(""), paragraph("Soft cotton"));
    expect(richTextOrNull(written)).toBe(written);
    const rule = state({ type: "horizontalrule" });
    expect(richTextOrNull(rule)).toBe(rule);
  });
});

describe("catalogContent", () => {
  it("a product: its description, and its pictures in the editor's order, as paths", () => {
    const content = catalogContent("products", {
      richDescription: state(paragraph("Soft cotton")),
      gallery: [upload("b.webp"), upload("a.webp"), 7, upload("clip.mp4", "video/mp4")],
    });
    expect(content.description).not.toBeNull();
    // An unpopulated id and a video are left out.
    expect(content.gallery).toEqual([
      { src: "/api/media/file/b.webp", alt: "About b.webp", width: 1200, height: 400 },
      { src: "/api/media/file/a.webp", alt: "About a.webp", width: 1200, height: 400 },
    ]);
  });

  it("a product with nothing: no description, no pictures", () => {
    expect(catalogContent("products", {})).toEqual({ description: null, gallery: [] });
  });

  it("a category or collection: its picture, banner and intro, each only when set", () => {
    expect(
      catalogContent("categories", {
        image: upload("tile.webp"),
        banner: upload("banner.webp"),
        intro: state(paragraph("Layers for every season")),
      }),
    ).toEqual({
      image: expect.objectContaining({ src: "/api/media/file/tile.webp" }),
      banner: expect.objectContaining({
        src: "/api/media/file/banner.webp",
        alt: "About banner.webp",
      }),
      intro: state(paragraph("Layers for every season")),
    });
    expect(catalogContent("collections", { image: null, intro: state(paragraph("")) })).toEqual({
      intro: null,
    });
  });
});
