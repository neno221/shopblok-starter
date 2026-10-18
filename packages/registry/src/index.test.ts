import { describe, expect, it } from "vitest";
import { byGroup, defineEntries, entries, findEntry, GROUPS, variantsOf, type EntryInput } from ".";

const atom = (id: string, extra: Partial<EntryInput> = {}): EntryInput => ({
  id,
  group: "atoms",
  kind: "atom",
  label: id,
  ...extra,
});

describe("the registry (D40)", () => {
  it("lists M1's 8 foundations and 32 atoms, then T32's 15 molecules, T33's 13 and T34's 12, then T35's 4 organisms and 6 headers, T36's 2 organisms and 5 footers, T37's 7 organisms, T38's 7 and T39's 11, in the navigation's order", () => {
    expect(byGroup("foundations")).toHaveLength(8);
    expect(byGroup("atoms")).toHaveLength(32);
    expect(byGroup("molecules")).toHaveLength(40);
    expect(byGroup("organisms")).toHaveLength(31);
    expect(byGroup("headers-footers")).toHaveLength(11);
    expect(entries).toHaveLength(122);
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
    expect(entries.at(-1)?.id).toBe("headers-footers/footer-two-tier");
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
    // The 21 variants a shop picks (D46, D52): six headers, five footers, ten cards.
    expect(entries.filter((entry) => entry.family !== undefined)).toHaveLength(21);
  });
});
