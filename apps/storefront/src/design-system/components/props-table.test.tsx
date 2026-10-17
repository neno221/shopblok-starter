import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { propRows, PropsTable } from "./props-table";

// No M1 entry has a contract yet (D41; T30 writes the first), so the table is checked on a sample.
const sample = z.object({
  title: z.string().describe("The product's name, in the market's language."),
  price: z.number(),
  badge: z.enum(["sale", "new"]).optional(),
  sizes: z.array(z.string()),
  href: z.string().nullable(),
  image: z.object({ src: z.string(), alt: z.string() }).optional(),
});

describe("propRows", () => {
  it("lists the contract's top-level properties in order, with their types and descriptions", () => {
    expect(propRows(sample)).toEqual([
      {
        name: "title",
        type: "string",
        required: true,
        description: "The product's name, in the market's language.",
      },
      { name: "price", type: "number", required: true },
      { name: "badge", type: '"sale" | "new"', required: false },
      { name: "sizes", type: "string[]", required: true },
      { name: "href", type: "string | null", required: true },
      { name: "image", type: "object", required: false },
    ]);
  });

  it("documents the input: a prop with a default is not required", () => {
    const contract = z.object({ size: z.enum(["sm", "md"]).default("md") });
    expect(propRows(contract)).toEqual([{ name: "size", type: '"sm" | "md"', required: false }]);
  });

  it("shows a type JSON Schema cannot express as unknown instead of throwing", () => {
    const contract = z.object({
      placedAt: z.date(),
      total: z.string().transform(Number),
    });
    expect(propRows(contract)).toEqual([
      { name: "placedAt", type: "unknown", required: true },
      { name: "total", type: "string", required: true },
    ]);
  });

  it("has no rows for a contract that is not an object", () => {
    expect(propRows(z.string())).toEqual([]);
  });
});

describe("PropsTable", () => {
  it("renders a row per property, with a header for each column", () => {
    const markup = renderToStaticMarkup(<PropsTable contract={sample} />);
    expect(markup).toContain("<caption");
    for (const header of ["Prop", "Type", "Required", "Description"])
      expect(markup).toContain(`>${header}</th>`);
    expect(markup.match(/<th scope="row"/g)).toHaveLength(6);
    expect(markup).toContain(">&quot;sale&quot; | &quot;new&quot;</td>");
    expect(markup).toContain("The product&#x27;s name, in the market&#x27;s language.");
  });
});
