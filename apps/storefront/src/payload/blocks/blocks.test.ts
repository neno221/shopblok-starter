// D70's drift test: the registry's Sections and Payload's blocks are one list. A block added to one
// side only, or a variant added to a family without the block's `variant` field offering it, fails
// here with the reason.
import { entries, sectionEntries, variantsOf } from "@shopblok/registry";
import type {
  ArrayField,
  BlocksField,
  Block,
  DateField,
  GroupField,
  RelationshipField,
  SelectField,
  UploadField,
} from "payload";
import { describe, expect, it } from "vitest";
import { Pages } from "../collections/pages";
import { BLOCKS, LAYOUT_BLOCKS } from ".";
import { describeBlock } from "./describe";
import { ComparisonBlock } from "./comparison";
import { HeroBlock } from "./hero";
import { NewsletterBlock } from "./newsletter";
import { ProductCollectionBlock } from "./product-collection";
import { PromoBannerBlock } from "./promo-banner";
import { VideoBlock } from "./video";
import { blockDrift } from "./drift";

const field = (block: Block, name: string) =>
  block.fields.find((each) => "name" in each && each.name === name);

const names = (fields: readonly unknown[]) =>
  fields.flatMap((each) =>
    typeof each === "object" && each !== null && "name" in each ? [String(each.name)] : [],
  );

describe("the blocks and the registry (D70)", () => {
  it("agree: an entry per block, a block per entry, and the family's variants", () => {
    expect(blockDrift(sectionEntries(), BLOCKS)).toEqual([]);
    expect(BLOCKS.map((block) => block.slug)).toEqual(sectionEntries().map((entry) => entry.block));
  });

  it("fail when a block has no entry, an entry no block, or the variants differ", () => {
    const extra: Block = { slug: "storyCarousel", fields: [] };
    expect(blockDrift(sectionEntries(), [...BLOCKS, extra])).toEqual([
      'the block "storyCarousel" has no Sections entry in the registry',
    ]);
    expect(blockDrift(sectionEntries(), BLOCKS.slice(1))).toEqual([
      'sections/rich-text names the block "richText", which src/payload/blocks/ lacks',
    ]);
    const [first, ...rest] = BLOCKS;
    if (first === undefined) throw new Error("no block");
    const stale = {
      ...first,
      fields: first.fields.map((each) =>
        "name" in each && each.name === "variant"
          ? { ...each, options: ["standard", "split"] }
          : each,
      ),
    } as Block;
    expect(blockDrift(sectionEntries(), [stale, ...rest])).toEqual([
      'the block "richText" offers the variants [standard, split], the registry [standard]',
    ]);
  });

  it("gives each block the variant, its content and the section settings, with the registry's thumbnail and label", () => {
    for (const block of BLOCKS) {
      const entry = entries.find((each) => each.block === block.slug);
      expect(block.fields[0], block.slug).toMatchObject({
        name: "variant",
        type: "select",
      });
      expect(block.fields.at(-1), block.slug).toMatchObject({
        name: "sectionSettings",
      });
      expect(block.admin?.images?.thumbnail, block.slug).toEqual({
        url: entry?.thumbnail,
        alt: entry?.label,
      });
      expect(block.labels?.singular, block.slug).toBe(entry?.label);
      expect(field(block, "variant"), block.slug).toMatchObject({
        options: variantsOf(entry?.family ?? "").map(({ value, label }) => ({
          value,
          label,
        })),
      });
    }
  });

  it("are the blocks pages.layout offers, by reference to the root config's", () => {
    const layout = Pages.fields.find((each) => "name" in each && each.name === "layout") as
      BlocksField | undefined;
    expect(layout?.type).toBe("blocks");
    expect(layout?.blocks).toEqual([]);
    expect(layout?.blockReferences).toEqual(BLOCKS.map((block) => block.slug));
    expect(LAYOUT_BLOCKS).toEqual(BLOCKS.map((block) => block.slug));
    // SPEC §7.4: the structure is shared, the text is localized.
    expect("localized" in (layout ?? {}) && layout?.localized).toBeFalsy();
  });

  it("localize the text and nothing else of the structure", () => {
    const rows = BLOCKS.flatMap((block) =>
      (describeBlock(block.slug) ?? []).map((row) => ({
        ...row,
        block: block.slug,
      })),
    );
    const localized = rows.filter((row) => row.localized).map((row) => `${row.block}.${row.path}`);
    expect(localized).toEqual([
      "richText.content",
      "mediaWithText.heading",
      "mediaWithText.content",
      "mediaWithText.links.link.label",
      "uspBar.items.title",
      "uspBar.items.text",
      "logoCloud.heading",
      "faq.heading",
      "faq.items.question",
      "faq.items.answer",
      "testimonials.heading",
      "testimonials.quotes.quote",
      "testimonials.quotes.role",
      "video.heading",
      "video.title",
      "video.caption",
      "hero.eyebrow",
      "hero.heading",
      "hero.subheading",
      "hero.links.link.label",
      "categoryShowcase.heading",
      "categoryShowcase.intro",
      "categoryShowcase.links.link.label",
      "categoryShowcase.categorySource.items.label",
      "productCollection.heading",
      "productCollection.intro",
      "productCollection.links.link.label",
      "productCollection.tabs.label",
      "featuredProduct.heading",
      "featuredProduct.text",
      "bundle.heading",
      "bundle.text",
      "promoBanner.heading",
      "promoBanner.text",
      "promoBanner.terms",
      "promoBanner.links.link.label",
      "comparison.heading",
      "comparison.rows.label",
      "collectionSpotlight.heading",
      "collectionSpotlight.text",
      "recentlyViewed.heading",
      "newsletter.heading",
      "newsletter.text",
      "formBlock.heading",
      "formBlock.intro",
      "editorialList.heading",
    ]);
  });
});

describe("describeBlock (the DS's Payload block panel)", () => {
  it("lists a block's fields with their nested ones, types, localized, required and options", () => {
    const rows = describeBlock("faq");
    expect(rows?.map((row) => row.path)).toEqual([
      "variant",
      "heading",
      "items",
      "items.question",
      "items.answer",
      "sectionSettings",
      "sectionSettings.anchor",
      "sectionSettings.spacing",
      "sectionSettings.surface",
      "sectionSettings.container",
      "sectionSettings.visibility",
    ]);
    expect(rows?.[0]).toEqual({
      path: "variant",
      type: "select",
      localized: false,
      required: true,
      conditional: false,
      options: ["standard", "side-heading"],
    });
    expect(rows?.find((row) => row.path === "items.answer")).toMatchObject({
      type: "textarea",
      localized: true,
      required: true,
    });
    expect(describeBlock("mediaWithText")?.find((row) => row.path === "media")?.type).toBe(
      "upload (media)",
    );
    expect(describeBlock("nope")).toBeNull();
  });

  it("says which required fields are checked only when shown (the video's source)", () => {
    const rows = describeBlock("video") ?? [];
    const required = (path: string) => rows.find((row) => row.path === path);
    expect(required("url")).toMatchObject({
      required: true,
      conditional: true,
    });
    expect(required("file")).toMatchObject({
      required: true,
      conditional: true,
    });
    expect(required("title")).toMatchObject({
      required: true,
      conditional: false,
    });
  });

  it("leaves out the id and blockName Payload adds when it loads the config", () => {
    const [faq] = BLOCKS.filter((block) => block.slug === "faq");
    const sanitized = {
      ...faq!,
      fields: [{ name: "id", type: "text" }, { name: "blockName", type: "text" }, ...faq!.fields],
    } as Block;
    expect(describeBlock("faq", [sanitized])).toEqual(describeBlock("faq"));
  });
});

describe("the video block's captions (PR 95 review, item 6)", () => {
  const captions = VideoBlock.fields.find(
    (each) => "name" in each && each.name === "captions",
  ) as ArrayField;
  const validate = (rows: unknown[]) =>
    captions.validate?.(
      rows as never,
      {
        required: true,
        minRows: 1,
        siblingData: { captions: rows },
        req: { t: (key: string) => key },
      } as never,
    );

  it("takes one file per language, and refuses a language twice", () => {
    expect(validate([{ language: "en" }, { language: "el" }])).toBe(true);
    expect(validate([{ language: "en" }, { language: "en" }])).toBe(
      "Each language once: one captions file per language.",
    );
  });

  it("reads the rows from the block when the admin's form passes their count", () => {
    expect(
      captions.validate?.(
        2 as never,
        {
          required: true,
          minRows: 1,
          siblingData: { captions: [{ language: "de" }, { language: "de" }] },
          req: { t: (key: string) => key },
        } as never,
      ),
    ).toBe("Each language once: one captions file per language.");
  });
});

describe("productSource (T64)", () => {
  it("offers what to do when nothing is found, except for the hero, which stands without products", () => {
    const sourceOf = (slug: string) => {
      const block = BLOCKS.find((each) => each.slug === slug);
      const source = block === undefined ? undefined : field(block, "productSource");
      if (source === undefined || !("fields" in source)) throw new Error(`no source on ${slug}`);
      return names(source.fields);
    };
    expect(sourceOf("productCollection")).toContain("emptyBehavior");
    expect(sourceOf("hero")).not.toContain("emptyBehavior");
  });
});

describe("the hero's designs that need a picture or a product (T80, PR 119 review, item 2)", () => {
  const media = field(HeroBlock, "media") as UploadField;
  const source = (field(HeroBlock, "productSource") as GroupField).fields.find(
    (each) => "name" in each && each.name === "mode",
  ) as SelectField;
  const req = { t: (key: string) => key };
  const pictureFor = (variant: string) =>
    media.validate?.(null as never, { required: false, siblingData: { variant }, req } as never);
  const sourceFor = (variant: string, mode: string) =>
    source.validate?.(
      mode as never,
      { required: true, options: source.options, blockData: { variant }, req } as never,
    );

  it("refuses the Overlay and Editorial designs without a picture", async () => {
    expect(await pictureFor("overlay")).toBe(
      "This design draws its words on the picture: choose one.",
    );
    expect(await pictureFor("editorial")).toBe(
      "This design draws its words on the picture: choose one.",
    );
    expect(await pictureFor("standard")).toBe(true);
    expect(await pictureFor("text")).toBe(true);
  });

  it("refuses the Product design with no product source, and takes any other", async () => {
    expect(await sourceFor("product", "none")).toBe(
      "This design shows a product: choose where it comes from.",
    );
    expect(await sourceFor("product", "newest")).toBe(true);
    expect(await sourceFor("standard", "none")).toBe(true);
    expect(await sourceFor("bento", "none")).toBe(true);
  });
});

describe("the content and promotion designs that need a field (T82)", () => {
  const req = { t: (key: string) => key };
  const shown = (block: Block, name: string, variant: string) => {
    const each = field(block, name) as { admin?: { condition?: (...args: unknown[]) => boolean } };
    return each.admin?.condition?.({}, { variant }, {}) ?? true;
  };

  it("refuses the promo banner's Full bleed design without a picture, and takes the others without one", async () => {
    const media = field(PromoBannerBlock, "media") as UploadField;
    const pictureFor = (variant: string) =>
      media.validate?.(null as never, { required: false, siblingData: { variant }, req } as never);
    expect(await pictureFor("full-bleed")).toBe(
      "This design draws the offer on the picture: choose one.",
    );
    for (const variant of ["standard", "strip", "ticket", "countdown", "popup"])
      expect(await pictureFor(variant), variant).toBe(true);
  });

  it("refuses the promo banner's Countdown design without an end, and takes the others without one", async () => {
    const end = field(PromoBannerBlock, "endsAt") as DateField;
    const endFor = (variant: string, value: unknown = null) =>
      end.validate?.(value as never, { required: false, siblingData: { variant }, req } as never);
    expect(await endFor("countdown")).toBe("This design counts down to the offer's end: set one.");
    expect(await endFor("countdown", "2026-12-01T00:00:00.000Z")).toBe(true);
    for (const variant of ["standard", "strip", "ticket", "full-bleed", "popup"])
      expect(await endFor(variant), variant).toBe(true);
  });

  it("shows and requires the comparison's pick only for Highlight, among the products it compares", async () => {
    const pick = field(ComparisonBlock, "pick") as RelationshipField;
    expect(pick.required).toBe(true);
    expect(shown(ComparisonBlock, "pick", "highlight")).toBe(true);
    expect(shown(ComparisonBlock, "pick", "standard")).toBe(false);
    expect(shown(ComparisonBlock, "pick", "cards")).toBe(false);
    const products = [{ id: 1 }, 2];
    const pickFor = (variant: string, value: unknown) =>
      pick.validate?.(
        value as never,
        {
          required: true,
          relationTo: "products",
          siblingData: { variant, products },
          req: { ...req, payload: { collections: {}, db: { defaultIDType: "number" } } },
        } as never,
      );
    expect(await pickFor("highlight", 2)).toBe(true);
    expect(await pickFor("highlight", 1)).toBe(true);
    expect(await pickFor("highlight", 3)).toBe("Choose one of the products the table compares.");
    expect(await pickFor("highlight", null)).not.toBe(true);
    expect(await pickFor("standard", null)).toBe(true);
    const filter = pick.filterOptions as (args: { siblingData: unknown }) => unknown;
    expect(filter({ siblingData: { products } })).toEqual({ id: { in: ["1", "2"] } });
  });

  it("shows and requires the newsletter's picture only for Split", () => {
    const media = field(NewsletterBlock, "media") as UploadField;
    expect(media.required).toBe(true);
    expect(shown(NewsletterBlock, "media", "split")).toBe(true);
    expect(shown(NewsletterBlock, "media", "standard")).toBe(false);
  });
});

describe("the catalog designs that need a field (T81)", () => {
  const req = { t: (key: string) => key };
  const shown = (name: string, variant: string) => {
    const each = field(ProductCollectionBlock, name) as {
      admin?: { condition?: (...args: unknown[]) => boolean };
    };
    return each.admin?.condition?.({}, { variant }, {}) ?? true;
  };
  const designs = variantsOf("product-collection").map((option) => option.value);

  it("refuses the With banner and Lookbook designs without a picture, and shows it only to them", async () => {
    expect(designs).toHaveLength(8);
    const media = field(ProductCollectionBlock, "media") as UploadField;
    const pictureFor = (variant: string) =>
      media.validate?.(null as never, { required: false, siblingData: { variant }, req } as never);
    for (const variant of designs) {
      const needs = variant === "with-banner" || variant === "lookbook";
      expect(shown("media", variant), variant).toBe(needs);
      expect(await pictureFor(variant), variant).toBe(
        needs ? "This design draws a picture beside the products: choose one." : true,
      );
    }
  });

  it("asks the Tabs design for two to four tabs, each a label and a source, in place of the block's source", () => {
    const tabs = field(ProductCollectionBlock, "tabs") as ArrayField;
    expect([tabs.required, tabs.minRows, tabs.maxRows]).toEqual([true, 2, 4]);
    expect(names(tabs.fields)).toEqual(["label", "productSource"]);
    for (const variant of designs) {
      expect(shown("tabs", variant), variant).toBe(variant === "tabs");
      expect(shown("productSource", variant), variant).toBe(variant !== "tabs");
      expect(shown("display", variant), variant).toBe(variant === "standard");
    }
    // A tab is never empty: a tab with nothing to show is left out, so it has no "when empty".
    const source = tabs.fields.find(
      (each) => "name" in each && each.name === "productSource",
    ) as GroupField;
    expect(names(source.fields)).not.toContain("emptyBehavior");
  });
});
