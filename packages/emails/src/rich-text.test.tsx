import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fillRichText, lexicalToText, paragraphs, RichText, richTextHasText } from ".";

const text = (value: string, format = 0) => ({ type: "text", text: value, format });
const doc = (...children: object[]) => ({ root: { type: "root", children } });

const sample = doc(
  { type: "heading", tag: "h2", children: [text("Title")] },
  {
    type: "paragraph",
    children: [
      text("Bold", 1),
      text(" and "),
      text("italic", 2),
      { type: "linebreak" },
      text("next"),
    ],
  },
  {
    type: "list",
    listType: "number",
    children: [
      { type: "listitem", children: [text("one")] },
      {
        type: "listitem",
        children: [
          {
            type: "list",
            listType: "bullet",
            children: [{ type: "listitem", children: [text("nested")] }],
          },
        ],
      },
      { type: "listitem", children: [text("two")] },
    ],
  },
  { type: "quote", children: [text("A quote")] },
  { type: "paragraph", children: [] },
);

describe("the rich text (D121)", () => {
  it("draws headings, paragraphs with marks and breaks, lists and quotes, and leaves empty blocks out", () => {
    const html = renderToStaticMarkup(<RichText document={sample} />);
    expect(html).toMatch(/<h2[^>]*>Title<\/h2>/);
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<br/>");
    expect(html).toMatch(/<ol[^>]*><li[^>]*>one<\/li><li[^>]*><ul/);
    expect(html).toMatch(/<blockquote[^>]*>/);
    expect(html.match(/<p /g)?.length).toBe(1);
  });

  it("reads as plain text the way T70's lexicalToText did", () => {
    expect(lexicalToText(sample)).toBe(
      "Title\n\nBold and italic\nnext\n\n1. one\n  - nested\n2. two\n\nA quote",
    );
    expect(lexicalToText(null)).toBe("");
    expect(lexicalToText({ root: "x" })).toBe("");
  });

  it("fills the variables in text nodes only, and not a link's URL", () => {
    const filled = fillRichText(
      doc({
        type: "paragraph",
        children: [
          text("Hi {{email}}"),
          {
            type: "link",
            fields: { url: "https://x.example/{{email}}" },
            children: [text("{{code}}")],
          },
        ],
      }),
      ["email"],
      { email: "a@b.c", code: "1" },
    );
    expect(lexicalToText(filled)).toBe("Hi a@b.c{{code}} (https://x.example/{{email}})");
  });

  it("knows a document with text from one without", () => {
    expect(richTextHasText(paragraphs(["x"]))).toBe(true);
    expect(richTextHasText(paragraphs([" "]))).toBe(false);
    expect(richTextHasText({ root: { children: [] } })).toBe(false);
    expect(richTextHasText("x")).toBe(false);
  });
});
