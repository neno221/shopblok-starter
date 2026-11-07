// D99's drift test (T79): the blocks' and the `templates` global's variant fields offer exactly
// their families' members, and every member has its story, three `en` baselines, a thumbnail and a
// live render that says which member it is. A new variant missing any of them fails here with the
// file it lacks.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { entries, type RegistryEntry } from "@shopblok/registry";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { manifest } from "../../design-system/catalog";
import { createContext } from "../../design-system/context";
import { stories } from "../../design-system/stories";
import { Templates } from "../globals/templates";
import { BLOCKS } from ".";
import { familyRoot, variantDrift, variantPickers, type VariantFacts } from "./drift";

const storefront = fileURLToPath(new URL("../../../", import.meta.url));

const pickers = [
  ...BLOCKS.flatMap((block) => variantPickers(block.slug, block.fields)),
  ...variantPickers("templates", Templates.fields),
];

const render = (id: string): string => {
  const entry = manifest.find((each) => each.id === id);
  if (entry === undefined) throw new Error(`no DS entry ${id}`);
  return renderToStaticMarkup(<>{entry.live(createContext("en"))}</>);
};

const facts: VariantFacts = {
  entries,
  pickers,
  hasStory: (id) => Object.hasOwn(stories, id),
  hasFile: (path) => existsSync(`${storefront}${path}`),
  render,
};

describe("the variant fields and their families (D99)", () => {
  it("finds every block's picker and the templates global's eight", () => {
    expect(pickers.filter((picker) => !picker.where.startsWith("templates."))).toHaveLength(
      BLOCKS.length,
    );
    expect(pickers.filter((picker) => picker.where.startsWith("templates."))).toEqual([
      // T83: the product page's six layouts and the quick view's three looks.
      {
        where: "templates.productPage.variant",
        family: "product-detail",
        offered: ["default", "thumbnails-below", "grid", "stacked", "wide", "centered"],
      },
      {
        where: "templates.listing.variant",
        family: "product-listing",
        offered: ["default", "top-bar", "drawer", "accordion", "chips", "rail", "inline"],
      },
      // T84: the listing's grid's card, ProductCard's ten (D46).
      {
        where: "templates.listing.card",
        family: "product-card",
        offered: [
          "standard",
          "swatches",
          "quick-add",
          "overlay",
          "minimal",
          "horizontal",
          "compact",
          "editorial",
          "bordered",
          "image-swap",
        ],
      },
      // "Off" and "Cart page" draw no member, so they are left out (D101).
      {
        where: "templates.quickView.variant",
        family: "quick-view",
        offered: ["default", "drawer", "compact"],
      },
      {
        where: "templates.cart.variant",
        family: "cart",
        offered: ["default", "table", "sticky-summary", "focused"],
      },
      {
        where: "templates.cart.miniCart",
        family: "mini-cart",
        offered: ["drawer", "drawer-picks"],
      },
      {
        where: "templates.checkout.variant",
        family: "checkout",
        offered: ["default", "one-page", "summary-first", "focused", "express-rail"],
      },
      {
        where: "templates.receipt.variant",
        family: "receipt",
        offered: ["default", "statement", "timeline-first", "split", "compact", "next-steps"],
      },
    ]);
  });

  it("agree: each option a member, each member an option, its story, baselines, thumbnail and render", () => {
    expect(variantDrift(facts)).toEqual([]);
  });

  it("knows each family's root, and every member's render draws it", () => {
    const families = new Set(pickers.map((picker) => picker.family));
    for (const entry of entries.filter((each) => families.has(each.family ?? "")))
      expect(familyRoot(entry, entries), entry.id).toBeDefined();
  });
});

// The rules on a family of two members, `spacer` with `standard` and a made-up `dotted` (T80 made
// the hero's `overlay` real; the spacer gets no other member in M5), and the
// facts as a test wants them: everything there unless the test takes it away.
describe("variantDrift's rules", () => {
  const spacer = entries.find((entry) => entry.id === "sections/spacer");
  if (spacer === undefined) throw new Error("no sections/spacer");
  const dotted: RegistryEntry = { ...spacer, id: "sections/spacer-dotted", variant: "dotted" };
  const twoMembers = [...entries, dotted];
  const drawn = (variant: string) =>
    `<section data-slot="spacer-section" data-variant="${variant}"><h2>x</h2></section>`;
  const fake = (overrides: Partial<VariantFacts> = {}): VariantFacts => ({
    entries: twoMembers,
    pickers: [{ where: "spacer", family: "spacer", offered: ["standard"] }],
    hasStory: () => true,
    hasFile: () => true,
    render: (id) => drawn(id === dotted.id ? "dotted" : "standard"),
    ...overrides,
  });

  it("refuses a picker that differs from its family (the registry's members come from variantsOf)", () => {
    expect(
      variantDrift(fake({ pickers: [{ where: "spacer", family: "spacer", offered: ["dotted"] }] })),
    ).toEqual(['spacer offers [dotted] of the family "spacer", whose members are [standard]']);
  });

  it("refuses a member without a story, a baseline or a thumbnail", () => {
    expect(variantDrift(fake({ hasStory: (id) => id !== dotted.id }))).toEqual([
      "sections/spacer-dotted has no story in src/design-system/stories/",
    ]);
    expect(
      variantDrift(fake({ hasFile: (path) => !path.endsWith("spacer-dotted/en-768.png") })),
    ).toEqual([
      "sections/spacer-dotted has no baseline e2e/__screenshots__/design-system/sections/spacer-dotted/en-768.png",
    ]);
    expect(variantDrift(fake({ hasFile: (path) => !path.startsWith("public/") }))).toEqual([
      "sections/spacer has no thumbnail public/registry/sections/spacer.png",
      "sections/spacer-dotted has no thumbnail public/registry/sections/spacer-dotted.png",
    ]);
  });

  it("refuses an entry file that ignores the variant: the second member draws the first", () => {
    expect(variantDrift(fake({ render: () => drawn("standard") }))).toEqual([
      'sections/spacer-dotted\'s live render draws [data-slot="spacer-section"] as [standard], not "dotted"',
    ]);
  });

  it("finds a template member's root at its family's first member's slot", () => {
    // T86's receipt members: each draws the first member's root with its own `data-variant`.
    const members = entries.filter((entry) => entry.family === "receipt");
    const split = members.find((entry) => entry.variant === "split");
    if (split === undefined) throw new Error("no templates/order-confirmation-split");
    expect(familyRoot(split, entries)).toBe("order-confirmation-template");
    const page = (variant: string) =>
      `<main data-slot="order-confirmation-template" data-variant="${variant}"></main>`;
    const picker = {
      where: "templates.receipt.variant",
      family: "receipt",
      offered: members.map((entry) => entry.variant ?? ""),
    };
    const variantOf = (id: string) => members.find((entry) => entry.id === id)?.variant ?? "";
    expect(
      variantDrift(
        fake({ entries: members, pickers: [picker], render: (id) => page(variantOf(id)) }),
      ),
    ).toEqual([]);
    expect(
      variantDrift(
        fake({
          entries: members,
          pickers: [picker],
          render: (id) => page(id === split.id ? "default" : variantOf(id)),
        }),
      ),
    ).toEqual([
      'templates/order-confirmation-split\'s live render draws [data-slot="order-confirmation-template"] as [default], not "split"',
    ]);
  });

  it("refuses a member whose root does not say which it is, or is not drawn", () => {
    expect(
      variantDrift(fake({ render: () => '<section data-slot="spacer-section"></section>' })),
    ).toEqual([
      'sections/spacer\'s live render draws [data-slot="spacer-section"] as [no data-variant], not "standard"',
      'sections/spacer-dotted\'s live render draws [data-slot="spacer-section"] as [no data-variant], not "dotted"',
    ]);
    expect(variantDrift(fake({ render: () => "<div></div>" }))).toEqual([
      'sections/spacer\'s live render has no [data-slot="spacer-section"]',
      'sections/spacer-dotted\'s live render has no [data-slot="spacer-section"]',
    ]);
  });
});
