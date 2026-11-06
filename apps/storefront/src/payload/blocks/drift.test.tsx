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
  it("finds every block's picker and the templates global's seven", () => {
    expect(pickers.filter((picker) => !picker.where.startsWith("templates."))).toHaveLength(
      BLOCKS.length,
    );
    expect(pickers.filter((picker) => picker.where.startsWith("templates."))).toEqual([
      { where: "templates.productPage.variant", family: "product-detail", offered: ["default"] },
      { where: "templates.listing.variant", family: "product-listing", offered: ["default"] },
      // "Off" and "Cart page" draw no member, so they are left out (D101).
      { where: "templates.quickView.variant", family: "quick-view", offered: ["default"] },
      { where: "templates.cart.variant", family: "cart", offered: ["default"] },
      { where: "templates.cart.miniCart", family: "mini-cart", offered: ["drawer"] },
      { where: "templates.checkout.variant", family: "checkout", offered: ["default"] },
      { where: "templates.receipt.variant", family: "receipt", offered: ["default"] },
    ]);
  });

  it("agree: each option a member, each member an option, its story, baselines, thumbnail and render", () => {
    expect(variantDrift(facts)).toEqual([]);
  });

  it("knows each family's root, and every member's render draws it", () => {
    const families = new Set(pickers.map((picker) => picker.family));
    for (const entry of entries.filter((each) => families.has(each.family ?? "")))
      expect(familyRoot(entry), entry.id).toBeDefined();
  });
});

// The rules on a family of two members, `hero` with `standard` and a made-up `overlay`, and the
// facts as a test wants them: everything there unless the test takes it away.
describe("variantDrift's rules", () => {
  const hero = entries.find((entry) => entry.id === "sections/hero");
  if (hero === undefined) throw new Error("no sections/hero");
  const overlay: RegistryEntry = { ...hero, id: "sections/hero-overlay", variant: "overlay" };
  const twoMembers = [...entries, overlay];
  const drawn = (variant: string) =>
    `<section data-slot="hero-section" data-variant="${variant}"><h2>x</h2></section>`;
  const fake = (overrides: Partial<VariantFacts> = {}): VariantFacts => ({
    entries: twoMembers,
    pickers: [{ where: "hero", family: "hero", offered: ["standard"] }],
    hasStory: () => true,
    hasFile: () => true,
    render: (id) => drawn(id === overlay.id ? "overlay" : "standard"),
    ...overrides,
  });

  it("refuses a picker that differs from its family (the registry's members come from variantsOf)", () => {
    expect(
      variantDrift(fake({ pickers: [{ where: "hero", family: "hero", offered: ["overlay"] }] })),
    ).toEqual(['hero offers [overlay] of the family "hero", whose members are [standard]']);
  });

  it("refuses a member without a story, a baseline or a thumbnail", () => {
    expect(variantDrift(fake({ hasStory: (id) => id !== overlay.id }))).toEqual([
      "sections/hero-overlay has no story in src/design-system/stories/",
    ]);
    expect(
      variantDrift(fake({ hasFile: (path) => !path.endsWith("hero-overlay/en-768.png") })),
    ).toEqual([
      "sections/hero-overlay has no baseline e2e/__screenshots__/design-system/sections/hero-overlay/en-768.png",
    ]);
    expect(variantDrift(fake({ hasFile: (path) => !path.startsWith("public/") }))).toEqual([
      "sections/hero has no thumbnail public/registry/sections/hero.png",
      "sections/hero-overlay has no thumbnail public/registry/sections/hero-overlay.png",
    ]);
  });

  it("refuses an entry file that ignores the variant: the second member draws the first", () => {
    expect(variantDrift(fake({ render: () => drawn("standard") }))).toEqual([
      'sections/hero-overlay\'s live render draws [data-slot="hero-section"] as [standard], not "overlay"',
    ]);
  });

  it("refuses a member whose root does not say which it is, or is not drawn", () => {
    expect(
      variantDrift(fake({ render: () => '<section data-slot="hero-section"></section>' })),
    ).toEqual([
      'sections/hero\'s live render draws [data-slot="hero-section"] as [no data-variant], not "standard"',
      'sections/hero-overlay\'s live render draws [data-slot="hero-section"] as [no data-variant], not "overlay"',
    ]);
    expect(variantDrift(fake({ render: () => "<div></div>" }))).toEqual([
      'sections/hero\'s live render has no [data-slot="hero-section"]',
      'sections/hero-overlay\'s live render has no [data-slot="hero-section"]',
    ]);
  });
});
