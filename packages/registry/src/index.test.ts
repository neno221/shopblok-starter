import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  byGroup,
  defineEntries,
  entries,
  findEntry,
  GROUPS,
  sectionEntries,
  variantsOf,
  type EntryInput,
} from ".";
import { z } from "zod";
import {
  firstVariant,
  VARIANTS,
  variantEnum,
  variantNeeds,
  type Family,
} from "./contracts/variants";

const atom = (id: string, extra: Partial<EntryInput> = {}): EntryInput => ({
  id,
  group: "atoms",
  kind: "atom",
  label: id,
  ...extra,
});

describe("the registry (D40)", () => {
  it("lists M1's 8 foundations and 32 atoms, then T32's 15 molecules, T33's 13 and T34's 12, then T35's 4 organisms and 6 headers, T36's 2 organisms and 5 footers, T37's 7 organisms, T38's 7 and T39's 11, then T63's 8 sections, T64's 9 (T80's 7 hero variants after the hero; T82's 17 content and promotion variants after their blocks), T67's 2 and T66's 1, then T48's 2 templates, T49's 1, T50's 2 (T84's six listing layouts after the first), T51's 1, T52's 3, T53's 3, T65's 1 and T66's 2, in the navigation's order", () => {
    expect(byGroup("foundations")).toHaveLength(8);
    expect(byGroup("atoms")).toHaveLength(32);
    expect(byGroup("molecules")).toHaveLength(40);
    expect(byGroup("organisms")).toHaveLength(31);
    expect(byGroup("headers-footers")).toHaveLength(11);
    expect(byGroup("sections").map((entry) => entry.id)).toEqual([
      "sections/rich-text",
      "sections/media-with-text",
      "sections/media-with-text-overlap",
      "sections/media-with-text-full-bleed",
      "sections/usp-bar",
      "sections/usp-bar-strip",
      "sections/logo-cloud",
      "sections/logo-cloud-grid",
      "sections/faq",
      "sections/faq-side-heading",
      "sections/testimonials",
      "sections/testimonials-single",
      "sections/testimonials-carousel",
      "sections/testimonials-wall",
      "sections/video",
      "sections/spacer",
      "sections/hero",
      "sections/hero-overlay",
      "sections/hero-centered",
      "sections/hero-editorial",
      "sections/hero-bento",
      "sections/hero-collection-switcher",
      "sections/hero-product",
      "sections/hero-text",
      "sections/category-showcase",
      "sections/product-collection",
      "sections/featured-product",
      "sections/bundle",
      "sections/promo-banner",
      "sections/promo-banner-strip",
      "sections/promo-banner-ticket",
      "sections/promo-banner-full-bleed",
      "sections/promo-banner-countdown",
      "sections/promo-banner-popup",
      "sections/comparison",
      "sections/comparison-cards",
      "sections/comparison-highlight",
      "sections/collection-spotlight",
      "sections/recently-viewed",
      "sections/newsletter",
      "sections/newsletter-split",
      "sections/form-block",
      "sections/editorial-list",
      "sections/editorial-list-featured",
    ]);
    expect(byGroup("templates").map((entry) => entry.id)).toEqual([
      "templates/not-found",
      "templates/error",
      "templates/product-detail",
      "templates/product-listing",
      "templates/product-listing-top-bar",
      "templates/product-listing-drawer",
      "templates/product-listing-accordion",
      "templates/product-listing-chips",
      "templates/product-listing-rail",
      "templates/product-listing-inline",
      "templates/search-results",
      "templates/home",
      "templates/cart",
      "templates/checkout",
      "templates/order-confirmation",
      "templates/auth",
      "templates/account",
      "templates/order-lookup",
      "templates/cms-page",
      "templates/journal",
      "templates/post",
    ]);
    expect(entries).toHaveLength(187);
    expect(entries.map((entry) => entry.id).slice(0, 2)).toEqual([
      "foundations/colors",
      "foundations/typography",
    ]);
    expect(byGroup("atoms").at(-1)?.id).toBe("atoms/flag");
    expect(byGroup("molecules").at(0)?.id).toBe("molecules/price-block");
    expect(byGroup("molecules").at(14)?.id).toBe("molecules/media-figure");
    expect(byGroup("molecules").at(15)?.id).toBe("molecules/search-field");
    expect(byGroup("molecules").at(27)?.id).toBe("molecules/countdown-timer");
    expect(byGroup("molecules").at(28)?.id).toBe("molecules/cart-line-item");
    expect(byGroup("molecules").at(-1)?.id).toBe("molecules/verification-notice");
    expect(byGroup("organisms").map((entry) => entry.id)).toEqual([
      "organisms/announcement-bar",
      "organisms/mega-menu",
      "organisms/mobile-nav-drawer",
      "organisms/market-suggestion-banner",
      "organisms/cookie-consent",
      "organisms/loading-skeletons",
      "organisms/search-overlay",
      "organisms/filter-sidebar",
      "organisms/filter-drawer",
      "organisms/product-toolbar",
      "organisms/product-grid",
      "organisms/product-carousel",
      "organisms/compare-tray",
      "organisms/product-gallery",
      "organisms/buy-box",
      "organisms/mobile-sticky-atc",
      "organisms/product-info-accordions",
      "organisms/reviews-section",
      "organisms/quick-view-dialog",
      "organisms/size-guide-dialog",
      "organisms/cart-drawer",
      "organisms/quick-cart-dropdown",
      "organisms/checkout-steps",
      "organisms/payment-step",
      "organisms/order-summary",
      "organisms/account-nav",
      "organisms/order-timeline",
      "organisms/order-table",
      "organisms/address-book",
      "organisms/payment-methods-manager",
      "organisms/return-request-form",
    ]);
    expect(byGroup("headers-footers").at(5)?.id).toBe("headers-footers/header-transparent");
    expect(byGroup("headers-footers").at(-1)?.id).toBe("headers-footers/footer-two-tier");
    expect(entries.at(-1)?.id).toBe("templates/post");
  });

  it("gives every entry a unique `{group}/{slug}` id in a known group, and a label", () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of entries) {
      expect(GROUPS, entry.id).toContain(entry.group);
      expect(entry.id, entry.id).toMatch(new RegExp(`^${entry.group}/[a-z0-9]+(-[a-z0-9]+)*$`));
      expect(entry.label.trim(), entry.id).not.toBe("");
    }
  });

  it("names the @shopblok/ui export of every atom, and none for a foundation", () => {
    for (const entry of byGroup("atoms")) {
      expect(entry.kind, entry.id).toBe("atom");
      expect(entry.component?.module, entry.id).toBe(`@shopblok/ui/${entry.id}`);
      expect(entry.component?.name, entry.id).toMatch(/^[A-Z][A-Za-z]+$/);
    }
    for (const entry of byGroup("foundations")) {
      expect(entry.kind, entry.id).toBe("foundation");
      expect(entry.component, entry.id).toBeUndefined();
    }
  });

  it("names the @shopblok/ui/molecules export of every molecule, and its contract (D41)", () => {
    for (const entry of byGroup("molecules")) {
      expect(entry.kind, entry.id).toBe("molecule");
      expect(entry.component?.module, entry.id).toMatch(
        /^@shopblok\/ui\/molecules\/[a-z-]+(\/[a-z-]+)?$/,
      );
      expect(entry.component?.name, entry.id).toMatch(/^[A-Z][A-Za-z]+$/);
      expect(entry.contract, entry.id).toBeDefined();
    }
  });

  it("names the @shopblok/ui/organisms export of every organism, header and footer, and its contract (D41)", () => {
    for (const entry of [...byGroup("organisms"), ...byGroup("headers-footers")]) {
      expect(entry.kind, entry.id).toBe("organism");
      expect(entry.component?.module, entry.id).toMatch(
        /^@shopblok\/ui\/organisms\/[a-z-]+(\/[a-z-]+)?$/,
      );
      expect(entry.component?.name, entry.id).toMatch(/^[A-Z][A-Za-z]+$/);
      expect(entry.contract, entry.id).toBeDefined();
    }
  });

  it("names the @shopblok/ui/sections export of every section, its contract and its Payload block (D70)", () => {
    for (const entry of sectionEntries()) {
      expect(entry.kind, entry.id).toBe("section");
      expect(entry.component?.module, entry.id).toBe(`@shopblok/ui/${entry.id}`);
      expect(entry.component?.name, entry.id).toMatch(/^[A-Z][A-Za-z]+Section$/);
      expect(entry.contract, entry.id).toBeDefined();
      // One family per block, its first member `standard` (D79), with the block's id.
      expect(entry.family, entry.id).toBe(entry.id.slice("sections/".length));
      expect(entry.variant, entry.id).toBe("standard");
    }
    // M5's members (D99): `sections/<family>-<variant>`, the module in the family's folder, the
    // first member's block and contract.
    const first = new Map(sectionEntries().map((entry) => [entry.family, entry]));
    const members = byGroup("sections").filter((entry) => !sectionEntries().includes(entry));
    expect(members.length).toBeGreaterThan(0);
    for (const entry of members) {
      const family = entry.family ?? "";
      expect(entry.kind, entry.id).toBe("section");
      expect(entry.id, entry.id).toBe(`sections/${family}-${entry.variant ?? ""}`);
      expect(entry.component?.module, entry.id).toBe(
        `@shopblok/ui/sections/${family}/${entry.variant ?? ""}`,
      );
      expect(entry.component?.name, entry.id).toMatch(/^[A-Z][A-Za-z]+$/);
      expect(entry.block, entry.id).toBe(first.get(family)?.block);
      expect(entry.contract, entry.id).toBe(first.get(family)?.contract);
    }
    expect(sectionEntries().map((entry) => entry.block)).toEqual([
      "richText",
      "mediaWithText",
      "uspBar",
      "logoCloud",
      "faq",
      "testimonials",
      "video",
      "spacer",
      "hero",
      "categoryShowcase",
      "productCollection",
      "featuredProduct",
      "bundle",
      "promoBanner",
      "comparison",
      "collectionSpotlight",
      "recentlyViewed",
      "newsletter",
      "formBlock",
      "editorialList",
    ]);
    expect(entries.filter((entry) => entry.block !== undefined)).toEqual(byGroup("sections"));
  });

  it("finds an entry by id, and nothing else", () => {
    expect(findEntry("atoms/button")?.label).toBe("Button");
    for (const id of [
      "",
      "atoms",
      "atoms/nope",
      "Atoms/button",
      "atoms/button/x",
      "frame/atoms/button",
    ])
      expect(findEntry(id), id).toBeUndefined();
  });
});

describe("defineEntries", () => {
  it("rejects a duplicate id", () => {
    expect(() => defineEntries([atom("atoms/a"), atom("atoms/a")])).toThrow(
      'registry: "atoms/a" is listed twice.',
    );
  });

  it("rejects an id that is not `{group}/{slug}` with a kebab-case slug", () => {
    for (const id of [
      "atoms",
      "atoms/",
      "atoms/A",
      "atoms/a_b",
      "atoms/a/b",
      "molecules/a",
      "atoms/-a",
    ])
      expect(() => defineEntries([atom(id)]), id).toThrow("is not");
  });

  it("rejects an entry without a label", () => {
    expect(() => defineEntries([atom("atoms/a", { label: " " })])).toThrow("has no label");
  });

  it("wants a family and a variant together, with a variant unique in its family", () => {
    expect(() => defineEntries([atom("atoms/a", { family: "card" })])).toThrow("both");
    expect(() => defineEntries([atom("atoms/a", { variant: "x" })])).toThrow("both");
    expect(() =>
      defineEntries([
        atom("atoms/a", { family: "card", variant: "x" }),
        atom("atoms/b", { family: "card", variant: "x" }),
      ]),
    ).toThrow('the variant "card/x" is listed twice');
    // The same variant in two families is two variants.
    expect(
      defineEntries([
        atom("atoms/a", { family: "card", variant: "x" }),
        atom("atoms/b", { family: "tile", variant: "x" }),
      ]),
    ).toHaveLength(2);
  });

  it("wants a block on a section and on nothing else, one family per block (D70, D79)", () => {
    const section = (id: string, extra: Partial<EntryInput> = {}): EntryInput => ({
      id,
      group: "sections",
      kind: "section",
      label: id,
      family: id.slice("sections/".length),
      variant: "standard",
      block: "faq",
      ...extra,
    });
    expect(() => defineEntries([section("sections/faq", { block: undefined })])).toThrow(
      "a section names its Payload block, and only a section",
    );
    expect(() => defineEntries([atom("atoms/a", { block: "faq" })])).toThrow(
      "a section names its Payload block, and only a section",
    );
    expect(() => defineEntries([section("sections/faq", { block: "Faq" })])).toThrow(
      'the block "Faq" is not a camelCase slug',
    );
    expect(() =>
      defineEntries([section("sections/faq", { family: undefined, variant: undefined })]),
    ).toThrow("a section is a family member");
    // Two families drawn by one block, or one family by two blocks.
    expect(() => defineEntries([section("sections/faq"), section("sections/questions")])).toThrow(
      'the block "faq" and the family "questions" belong to other sections',
    );
    expect(() =>
      defineEntries([
        section("sections/faq"),
        section("sections/faq-split", { family: "faq", variant: "split", block: "questions" }),
      ]),
    ).toThrow('the block "questions" and the family "faq" belong to other sections');
    // M5's variants: more members of the block's family.
    expect(
      defineEntries([
        section("sections/faq"),
        section("sections/faq-split", { family: "faq", variant: "split" }),
      ]),
    ).toHaveLength(2);
  });

  it("derives the thumbnail of a family member (D52), and of nothing else", () => {
    const [member, single] = defineEntries([
      {
        id: "organisms/header-classic",
        group: "organisms",
        kind: "organism",
        label: "Classic",
        family: "header",
        variant: "classic",
      },
      atom("atoms/a"),
    ]);
    expect(member?.thumbnail).toBe("/registry/organisms/header-classic.png");
    expect(single?.thumbnail).toBeUndefined();
    for (const entry of entries)
      expect(entry.thumbnail, entry.id).toBe(
        entry.family === undefined ? undefined : `/registry/${entry.id}.png`,
      );
  });
});

describe("variantsOf", () => {
  it("lists the six headers of SPEC §9.4 (D46), in its order", () => {
    expect(variantsOf("header").map((option) => option.value)).toEqual([
      "classic",
      "centered",
      "two-tier",
      "mega-menu",
      "minimal",
      "transparent",
    ]);
    expect(variantsOf("header")[0]).toEqual({
      value: "classic",
      label: "Header · Classic",
      thumbnail: "/registry/headers-footers/header-classic.png",
    });
  });

  it("lists the five footers of SPEC §9.4 (D46), in its order", () => {
    expect(variantsOf("footer").map((option) => option.value)).toEqual([
      "multi-column",
      "newsletter-first",
      "minimal",
      "wordmark",
      "two-tier",
    ]);
    expect(variantsOf("footer")[3]).toEqual({
      value: "wordmark",
      label: "Footer · Big wordmark",
      thumbnail: "/registry/headers-footers/footer-wordmark.png",
    });
  });

  it("lists ProductCard's ten variants (D46), in the navigation's order", () => {
    expect(variantsOf("product-card").map((option) => option.value)).toEqual([
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
    ]);
    expect(variantsOf("product-card")[0]).toEqual({
      value: "standard",
      label: "ProductCard · Standard",
      thumbnail: "/registry/molecules/product-card-standard.png",
    });
  });

  it("lists each block's variants, `standard` first (D79, D99)", () => {
    expect(variantsOf("faq")).toEqual([
      { value: "standard", label: "FAQ", thumbnail: "/registry/sections/faq.png" },
      {
        value: "side-heading",
        label: "FAQ · Side heading",
        thumbnail: "/registry/sections/faq-side-heading.png",
      },
    ]);
    for (const entry of sectionEntries())
      expect(variantsOf(entry.family ?? "")[0]?.value, entry.id).toBe("standard");
    // T80: the hero's eight, in §1a's order.
    expect(variantsOf("hero").map((option) => option.value)).toEqual([
      "standard",
      "overlay",
      "centered",
      "editorial",
      "bento",
      "collection-switcher",
      "product",
      "text",
    ]);
    // T82: the content and promotion blocks' seventeen more, in §1a's order.
    expect(variantsOf("promo-banner").map((option) => option.value)).toEqual([
      "standard",
      "strip",
      "ticket",
      "full-bleed",
      "countdown",
      "popup",
    ]);
    expect(variantsOf("testimonials").map((option) => option.value)).toEqual([
      "standard",
      "single",
      "carousel",
      "wall",
    ]);
  });

  it("lists a family's variants as a Payload picker needs them (value, label, thumbnail)", () => {
    const list = defineEntries([
      {
        id: "headers-footers/header-classic",
        group: "headers-footers",
        kind: "organism",
        label: "Classic",
        family: "header",
        variant: "classic",
      },
      {
        id: "headers-footers/footer-minimal",
        group: "headers-footers",
        kind: "organism",
        label: "Minimal",
        family: "footer",
        variant: "minimal",
      },
      {
        id: "headers-footers/header-centered",
        group: "headers-footers",
        kind: "organism",
        label: "Centered",
        family: "header",
        variant: "centered",
      },
    ]);
    expect(variantsOf("header", list)).toEqual([
      {
        value: "classic",
        label: "Classic",
        thumbnail: "/registry/headers-footers/header-classic.png",
      },
      {
        value: "centered",
        label: "Centered",
        thumbnail: "/registry/headers-footers/header-centered.png",
      },
    ]);
    expect(variantsOf("nope", list)).toEqual([]);
    // The 61 variants a shop picks (D46, D52, D79, D99): six headers, five footers, ten cards, the
    // twenty blocks' one each (T63's eight content blocks, T64's nine commerce blocks, T67's two
    // form blocks, T66's editorial list), the first of T79's seven families each, T80's seven
    // more heroes, T84's six listing layouts and T82's seventeen content and promotion variants.
    expect(entries.filter((entry) => entry.family !== undefined)).toHaveLength(78);
  });

  it("starts T79's seven families with what M2 and M3 built, ids unchanged (D99)", () => {
    const firsts = Object.fromEntries(
      [
        "product-detail",
        "product-listing",
        "quick-view",
        "cart",
        "mini-cart",
        "checkout",
        "receipt",
      ].map((family) => [
        family,
        // The first member of each (T83 to T86 add the others after it).
        entries
          .filter((entry) => entry.family === family)
          .slice(0, 1)
          .map((entry) => `${entry.id} ${entry.variant}`),
      ]),
    );
    expect(firsts).toEqual({
      "product-detail": ["templates/product-detail default"],
      "product-listing": ["templates/product-listing default"],
      "quick-view": ["organisms/quick-view-dialog default"],
      cart: ["templates/cart default"],
      "mini-cart": ["organisms/cart-drawer drawer"],
      checkout: ["templates/checkout default"],
      receipt: ["templates/order-confirmation default"],
    });
    // The popup after an add has its own contract and no family (D100); the `templates` global
    // turns it on or off.
    expect(findEntry("organisms/quick-cart-dropdown")?.family).toBeUndefined();
  });
});

describe("contracts/variants.ts (D99)", () => {
  it("lists every family of the registry, each with variantsOf()'s values in order", () => {
    const families = [...new Set(entries.flatMap((entry) => entry.family ?? []))];
    expect(Object.keys(VARIANTS).sort()).toEqual(families.sort());
    for (const family of families)
      expect(
        [...(VARIANTS[family as Family] ?? [])],
        `contracts/variants.ts lists other variants of "${family}" than its entries`,
      ).toEqual(variantsOf(family).map((option) => option.value));
  });

  it("makes a family's first member its default, which a contract's variant field takes", () => {
    for (const family of Object.keys(VARIANTS) as Family[]) {
      expect(firstVariant(family)).toBe(variantsOf(family)[0]?.value);
      const schema = variantEnum(family);
      expect(schema.safeParse(firstVariant(family)).success, family).toBe(true);
      expect(schema.safeParse("from-a-later-version").success, family).toBe(false);
    }
  });

  it("is a leaf module: it imports nothing from entries/ (D99)", () => {
    const source = readFileSync(new URL("./contracts/variants.ts", import.meta.url), "utf8");
    expect(source.match(/from\s+["']([^"']+)["']/g)).toEqual([`from "zod"`]);
  });

  it("refuses a view model whose variant needs a field it lacks (D99)", () => {
    const Hero = z
      .object({
        variant: z.enum(["standard", "collection-switcher"]).optional(),
        collections: z.array(z.string()).optional(),
      })
      .superRefine(variantNeeds({ "collection-switcher": ["collections"] }));
    expect(Hero.safeParse({ variant: "standard" }).success).toBe(true);
    expect(Hero.safeParse({}).success).toBe(true);
    expect(Hero.safeParse({ variant: "collection-switcher", collections: ["a"] }).success).toBe(
      true,
    );
    const refused = Hero.safeParse({ variant: "collection-switcher" });
    expect(refused.error?.issues.map((issue) => [issue.path, issue.message])).toEqual([
      [["collections"], 'the "collection-switcher" variant needs collections'],
    ]);
    // An inherited key is no variant's: the check adds nothing and throws nothing (PR 116, item 6).
    const check = variantNeeds({ "collection-switcher": ["collections"] });
    const issues: unknown[] = [];
    check({ variant: "toString" }, { addIssue: (issue: unknown) => issues.push(issue) } as never);
    expect(issues).toEqual([]);
  });
});

// T40 (D52): the file behind each `thumbnail`, where Next serves it (`public/registry/{id}.png`).
// The `thumbnails` Playwright project writes them (`pnpm thumbnails`, or the update-baselines
// input of CI), and only Playwright's container does (D51). A family entry without its file fails
// here, with the command that makes it.
const thumbnailDir = fileURLToPath(
  new URL("../../../apps/storefront/public/registry/", import.meta.url),
);

describe("the thumbnails (D52)", () => {
  it("has a PNG for every family entry, 600 × 400 and 3:2", () => {
    const missing: string[] = [];
    for (const entry of entries) {
      if (entry.thumbnail === undefined) continue;
      const file = path.join(thumbnailDir, `${entry.id}.png`);
      if (!existsSync(file)) {
        missing.push(`${entry.id} (${entry.thumbnail})`);
        continue;
      }
      const png = readFileSync(file);
      // The IHDR chunk: width and height are the big-endian words at bytes 16 and 20.
      expect(png.subarray(1, 4).toString("latin1"), `${entry.id} is a PNG`).toBe("PNG");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], `${entry.id}: size`).toEqual([600, 400]);
    }
    expect(
      missing,
      "family entries without a thumbnail: run `pnpm thumbnails` in Playwright's container, or dispatch CI with update-baselines",
    ).toEqual([]);
  });

  it("has no PNG that no family entry points to", () => {
    const wanted = new Set(
      entries.flatMap((entry) => (entry.thumbnail === undefined ? [] : [`${entry.id}.png`])),
    );
    const found = readdirSync(thumbnailDir, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((item) => item.isFile() && item.name.endsWith(".png"))
      .map((item) =>
        path
          .relative(thumbnailDir, path.join(item.parentPath, item.name))
          .split(path.sep)
          .join("/"),
      );
    expect(found.filter((file) => !wanted.has(file))).toEqual([]);
  });
});
