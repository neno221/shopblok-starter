import { variantsOf } from "@shopblok/registry";
import type { AccessArgs, Field, GlobalConfig, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LANGUAGES } from "../locales";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { Footer, oneProfilePerNetwork, profileUrl } from "./footer";
import { Header, HEADER_EXCLUDED_VARIANTS } from "./header";
import { SiteSettings, titleTemplate } from "./site-settings";
import { Templates } from "./templates";

const as = (user: unknown) => ({ req: { user } as PayloadRequest }) as AccessArgs;
const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const integration = { collection: "integrations", id: 1, role: "medusa-sync" };

const GLOBALS: [string, GlobalConfig][] = [
  ["header", Header],
  ["footer", Footer],
  ["site-settings", SiteSettings],
  ["templates", Templates],
];

/** A top-level field (inside tabs too) by name. */
function field(global: GlobalConfig, name: string): Field | undefined {
  const walk = (fields: readonly Field[]): Field | undefined => {
    for (const each of fields) {
      if ("name" in each && each.name === name) return each;
      if (each.type === "tabs") {
        for (const tab of each.tabs) {
          const found = walk(tab.fields);
          if (found !== undefined) return found;
        }
      }
    }
    return undefined;
  };
  return walk(global.fields);
}

const options = (select: Field | undefined) =>
  ((select as { options?: { value: string }[] } | undefined)?.options ?? []).map((o) => o.value);

describe.each(GLOBALS)("the %s global (D78)", (slug, global) => {
  it("is read by anyone once published, and as a draft by staff only", () => {
    const read = global.access?.read;
    expect(read?.(as(null))).toEqual({ _status: { equals: "published" } });
    expect(read?.(as(integration))).toEqual({ _status: { equals: "published" } });
    expect(read?.(as(editor))).toBe(true);
    expect(read?.(as(admin))).toBe(true);
  });

  it("is edited by staff, editors included, and never by an integration or a visitor", () => {
    const update = global.access?.update;
    expect(update?.(as(editor))).toBe(true);
    expect(update?.(as(admin))).toBe(true);
    expect(update?.(as(integration))).toBe(false);
    expect(update?.(as(null))).toBe(false);
  });

  it("keeps its versions from everyone but staff", () => {
    const readVersions = global.access?.readVersions;
    expect(readVersions?.(as(editor))).toBe(true);
    expect(readVersions?.(as(integration))).toBe(false);
    expect(readVersions?.(as(null))).toBe(false);
  });

  it("has drafts with autosave", () => {
    expect(global.versions).toMatchObject({ drafts: { autosave: expect.anything() }, max: 50 });
  });

  describe("revalidation", () => {
    beforeEach(() => revalidateTag.mockReset());
    const findGlobal = vi.fn();
    const req = () => ({
      locale: "el",
      context: {},
      payload: { logger: { warn: vi.fn() }, db: { findGlobal } },
    });

    async function save(rowBefore: string, doc: { _status: string }, rowAfter?: string) {
      const request = req();
      findGlobal.mockReset().mockResolvedValueOnce({ _status: rowBefore });
      if (rowAfter !== undefined) findGlobal.mockResolvedValueOnce({ _status: rowAfter });
      for (const hook of global.hooks?.beforeChange ?? [])
        await hook({ data: doc, global, req: request } as never);
      for (const hook of global.hooks?.afterChange ?? [])
        await hook({ doc, global, previousDoc: {}, req: request } as never);
    }

    it(`revalidates global:${slug}:<locale> in every language on a publish`, async () => {
      await save("draft", { _status: "published" });
      expect(revalidateTag.mock.calls.map(([tag]) => tag as string).sort()).toEqual(
        LANGUAGES.map((locale) => `global:${slug}:${locale}`).sort(),
      );
    });

    it("revalidates an unpublish, and nothing for a draft save over the published text", async () => {
      await save("published", { _status: "draft" }, "published");
      expect(revalidateTag).not.toHaveBeenCalled();
      await save("published", { _status: "draft" }, "draft");
      expect(revalidateTag).toHaveBeenCalled();
    });
  });
});

describe("the design fields (D85)", () => {
  it("offer every header variant, the transparent one too since T80 (D103)", () => {
    expect(HEADER_EXCLUDED_VARIANTS).toEqual([]);
    expect(options(field(Header, "design"))).toEqual(
      variantsOf("header").map((variant) => variant.value),
    );
    expect(options(field(Header, "design"))).toContain("transparent");
  });

  it("offer every footer variant", () => {
    expect(options(field(Footer, "design"))).toEqual(
      variantsOf("footer").map((variant) => variant.value),
    );
  });
});

/** A field of the named tab `tab` (the `templates` global's: D101). */
function tabField(global: GlobalConfig, tab: string, name: string): Field | undefined {
  for (const each of global.fields)
    if (each.type === "tabs")
      for (const one of each.tabs)
        if ("name" in one && one.name === tab)
          return one.fields.find((inner) => "name" in inner && inner.name === name);
  return undefined;
}

describe("the templates global's pickers (D101)", () => {
  const values = (family: string) => variantsOf(family).map((variant) => variant.value);

  it("offers each template's family, the first variant chosen, and is not localized", () => {
    for (const [tab, family] of [
      ["productPage", "product-detail"],
      ["listing", "product-listing"],
      ["cart", "cart"],
      ["checkout", "checkout"],
      ["receipt", "receipt"],
    ] as const) {
      const picker = tabField(Templates, tab, "variant");
      expect(options(picker), tab).toEqual(values(family));
      expect(picker, tab).toMatchObject({ required: true, defaultValue: values(family)[0] });
      expect((picker as { localized?: boolean }).localized, tab).toBeFalsy();
    }
  });

  it("keeps the quick view off, a click on the cart the drawer and an add the quick cart, as M4 did", () => {
    expect(options(tabField(Templates, "quickView", "variant"))).toEqual([
      "off",
      ...values("quick-view"),
    ]);
    expect(tabField(Templates, "quickView", "variant")).toMatchObject({ defaultValue: "off" });
    expect(options(tabField(Templates, "cart", "miniCart"))).toEqual([
      ...values("mini-cart"),
      "page",
    ]);
    expect(tabField(Templates, "cart", "miniCart")).toMatchObject({ defaultValue: "drawer" });
    expect(options(tabField(Templates, "cart", "quickCart"))).toEqual(["dropdown", "off"]);
    expect(tabField(Templates, "cart", "quickCart")).toMatchObject({ defaultValue: "dropdown" });
  });

  it("offers ProductCard's ten for the listing's card, the first chosen (T84)", () => {
    const picker = tabField(Templates, "listing", "card");
    expect(options(picker)).toEqual(values("product-card"));
    expect(picker).toMatchObject({ required: true, defaultValue: "standard" });
  });

  it("shows the quick view's picker only when the listing's card is quick add (D101, T84)", () => {
    const picker = tabField(Templates, "quickView", "variant") as {
      admin: { condition: (data: unknown, sibling: unknown, ctx: unknown) => boolean };
    };
    const shows = (data: unknown) => picker.admin.condition(data, {}, {});
    expect(shows({ listing: { card: "quick-add" } })).toBe(true);
    for (const card of values("product-card").filter((value) => value !== "quick-add"))
      expect(shows({ listing: { card } }), card).toBe(false);
    expect(shows({})).toBe(false);
    expect(shows(undefined)).toBe(false);
  });

  it("draws every family picker with the registry's thumbnails, none for an option with no member", () => {
    const picker = tabField(Templates, "quickView", "variant") as {
      admin: { custom: { thumbnails: Record<string, string> } };
    };
    expect(picker.admin.custom.thumbnails).toEqual({
      default: "/registry/organisms/quick-view-dialog.png",
      drawer: "/registry/organisms/quick-view-dialog-drawer.png",
      compact: "/registry/organisms/quick-view-dialog-compact.png",
    });
  });
});

describe("the footer's checks", () => {
  const args = { req: { payload: { config: {} }, t: (key: string) => key } } as never;

  it("takes an https profile only", () => {
    expect(profileUrl("https://instagram.com/shop", args)).toBe(true);
    expect(profileUrl("http://instagram.com/shop", args)).toBe("Use the profile's https address.");
    expect(profileUrl("javascript:alert(1)", args)).toBe("Use the profile's https address.");
  });

  it("takes each network once, and keeps Payload's row limit", () => {
    const row = (network: string) => ({ network, url: "https://example.com" });
    expect(oneProfilePerNetwork([row("x"), row("threads")], args)).toBe(true);
    expect(oneProfilePerNetwork([row("x"), row("x")], args)).toBe("Add each network once.");
    expect(
      oneProfilePerNetwork([row("x"), row("threads")], {
        ...(args as object),
        maxRows: 1,
      } as never),
    ).not.toBe(true);
  });
});

describe("the site settings' title template", () => {
  const args = { req: { payload: { config: {} }, t: (key: string) => key } } as never;

  it("needs %s once, or nothing", () => {
    expect(titleTemplate("%s · Shopblok", args)).toBe(true);
    expect(titleTemplate("", args)).toBe(true);
    expect(titleTemplate("Shopblok", args)).toBe("Put %s, once, where the page's title goes.");
    expect(titleTemplate("%s %s", args)).toBe("Put %s, once, where the page's title goes.");
  });
});
