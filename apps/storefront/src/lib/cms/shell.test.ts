import type { Category } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import type { Footer, Header, SiteSetting } from "../../payload-types";
import { findMarket } from "../markets/market";
import { seeded } from "../markets/test-maps";
import { buildPublicUrl } from "../markets/url";
import { toNavigation } from "../navigation";
import { announcementFor, footerColumns, SITE, siteText } from "../site";
import { siteOrigin } from "../site-origin";
import {
  copyrightLine,
  footerFrom,
  headerFrom,
  isSaved,
  mediaImage,
  mediaSrc,
  settingsFrom,
  shellPaths,
  type ShellContext,
} from "./shell";

const us = findMarket(seeded, "en-us")!;
const cy = findMarket(seeded, "el-cy")!;

const tree: Category[] = [
  {
    id: "pcat_1",
    title: "Apparel",
    handle: "apparel",
    href: "/us/categories/apparel",
    children: [
      {
        id: "pcat_2",
        title: "Tops",
        handle: "tops",
        href: "/us/categories/apparel/tops",
        children: [],
      },
    ],
  },
  { id: "pcat_3", title: "Home", handle: "home", href: "/us/categories/home", children: [] },
];

const context = (market = us): ShellContext => ({
  market,
  map: seeded,
  url: (path) => buildPublicUrl(market, path, seeded),
  categories: tree,
});

const settings = settingsFrom(null);
const SAVED = { updatedAt: "2026-10-28T12:00:00.000Z" };

const custom = (url: string, label: string, newTab = false) => ({
  link: { type: "custom" as const, url, label, newTab },
});
const product = (handle: string, label: string, deletedInMedusa = false) => ({
  link: {
    type: "reference" as const,
    reference: { relationTo: "products" as const, value: { id: 1, handle, deletedInMedusa } },
    label,
  },
});

const header = (fields: Partial<Header>) =>
  ({ id: 1, design: "classic", ...SAVED, ...fields }) as Header;
const footer = (fields: Partial<Footer>) =>
  ({ id: 1, design: "multi-column", ...SAVED, ...fields }) as Footer;

describe("isSaved", () => {
  it("tells a global someone saved from one that was never saved (Payload answers {})", () => {
    expect(isSaved(SAVED)).toBe(true);
    expect(isSaved({})).toBe(false);
    expect(isSaved(null)).toBe(false);
  });
});

describe("mediaImage", () => {
  it("takes an upload with its file and size, and nothing less", () => {
    const media = { url: "/api/media/file/logo.png", alt: "Logo", width: 200, height: 50 };
    expect(mediaImage(media)).toEqual({ src: media.url, alt: "Logo", width: 200, height: 50 });
    expect(mediaImage(7)).toBeUndefined();
    expect(mediaImage({ ...media, url: null })).toBeUndefined();
    expect(mediaImage({ ...media, width: null })).toBeUndefined();
  });

  it("links an upload on the shop's own origin by its path (PR 98)", () => {
    const media = {
      url: `${siteOrigin()}/api/media/file/hero.webp`,
      alt: "",
      width: 1600,
      height: 1200,
    };
    expect(mediaImage(media)?.src).toBe("/api/media/file/hero.webp");
  });
});

describe("mediaSrc", () => {
  it("makes the shop's own uploads paths and leaves other hosts' alone", () => {
    const origin = "https://shop.example";
    expect(mediaSrc("https://shop.example/api/media/file/a%20b.webp?v=2", origin)).toBe(
      "/api/media/file/a%20b.webp?v=2",
    );
    expect(mediaSrc("/api/media/file/a.webp", origin)).toBe("/api/media/file/a.webp");
    expect(mediaSrc("https://cdn.example/a.webp", origin)).toBe("https://cdn.example/a.webp");
    expect(mediaSrc("http://shop.example/a.webp", origin)).toBe("http://shop.example/a.webp");
  });
});

describe("settingsFrom", () => {
  it("is site.ts's store name and its title template until the global is saved", () => {
    expect(settingsFrom(null)).toEqual({
      storeName: SITE.storeName,
      titleTemplate: `%s | ${SITE.storeName}`,
    });
  });

  it("takes the saved store name, logo and title template", () => {
    const saved = {
      ...SAVED,
      storeName: "Kalimera",
      logo: { url: "/logo.png", width: 100, height: 40 },
      seo: { titleTemplate: "%s · Kalimera" },
    } as SiteSetting;
    expect(settingsFrom(saved)).toEqual({
      storeName: "Kalimera",
      logo: { src: "/logo.png", alt: "", width: 100, height: 40 },
      titleTemplate: "%s · Kalimera",
    });
  });

  it("builds the title template from the store's name when it has none, or a broken one", () => {
    const saved = { ...SAVED, storeName: "Kalimera", seo: { titleTemplate: "Kalimera" } };
    expect(settingsFrom(saved as SiteSetting).titleTemplate).toBe("%s | Kalimera");
  });
});

describe("shellPaths", () => {
  const paths = shellPaths(tree);

  it("gives a child category its whole path from Medusa's tree", () => {
    expect(paths["categories"]?.({ handle: "tops" })).toBe("/categories/apparel/tops");
    expect(paths["categories"]?.({ handle: "apparel" })).toBe("/categories/apparel");
  });

  it("falls back to the handle alone for a category the tree does not have", () => {
    expect(paths["categories"]?.({ handle: "archive" })).toBe("/categories/archive");
  });

  it("has no path for a document Medusa deleted, so its link is left out", () => {
    expect(paths["categories"]?.({ handle: "tops", deletedInMedusa: true })).toBeNull();
    expect(paths["products"]?.({ handle: "shirt", deletedInMedusa: true })).toBeNull();
    expect(paths["products"]?.({ handle: "shirt" })).toBe("/products/shirt");
    expect(paths["collections"]?.({ handle: "summer" })).toBe("/collections/summer");
  });

  it("gives a page its address in the market's language, and none to a page without one (T65)", () => {
    const pages = {
      byPath: { "/sxetika": 1, "/sxetika/ομάδα": 2 },
      byId: {
        "1": { path: "/sxetika", title: "Σχετικά", parent: null },
        "2": { path: "/sxetika/ομάδα", title: "Ομάδα", parent: 1 },
      },
    };
    const withPages = shellPaths(tree, pages);
    expect(withPages["pages"]?.({ id: 2, slug: "ομάδα" })).toBe(
      `/sxetika/${encodeURIComponent("ομάδα")}`,
    );
    expect(withPages["pages"]?.({ id: 9, slug: "draft" })).toBeNull();
    // Without the addresses (no database): the breadcrumbs' last address, or a top-level slug.
    expect(
      paths["pages"]?.({
        id: 2,
        slug: "omada",
        parent: 1,
        breadcrumbs: [{ url: "/about" }, { url: "/about/omada" }],
      }),
    ).toBe("/about/omada");
    expect(paths["pages"]?.({ id: 1, slug: "about" })).toBe("/about");
    expect(paths["pages"]?.({ id: 2, slug: "omada", parent: 1 })).toBeNull();
  });
});

describe("headerFrom", () => {
  it("is M3's header (site.ts) until the global is saved, in the market's language", () => {
    expect(headerFrom({} as Header, context(cy), settings)).toEqual({
      design: SITE.header,
      announcement: announcementFor("el"),
      navigation: toNavigation(tree),
      utilities: { search: true, account: true, marketSwitcher: true },
      sticky: SITE.stickyHeader,
    });
    expect(headerFrom(null, context(), settings).announcement).toEqual(announcementFor("en"));
  });

  it("takes the saved design, utilities, stickiness and an announcement with its link", () => {
    const shell = headerFrom(
      header({
        design: "two-tier",
        announcement: {
          message: "Free shipping this week",
          link: { type: "custom", url: "/store", label: "Shop now" },
          dismissible: false,
        },
        utilities: { search: false, account: true, marketSwitcher: false },
        sticky: false,
      }),
      context(),
      settings,
    );
    expect(shell).toMatchObject({
      design: "two-tier",
      announcement: {
        messages: [
          { message: "Free shipping this week", link: { label: "Shop now", href: "/us/store" } },
        ],
        dismissible: false,
      },
      utilities: { search: false, account: true, marketSwitcher: false },
      sticky: false,
    });
  });

  it("has no bar once an editor empties the message (site.ts's does not come back)", () => {
    expect(
      headerFrom(header({ announcement: { message: "" } }), context(), settings),
    ).not.toHaveProperty("announcement");
  });

  it("keeps Medusa's category tree as the navigation when the source is categories", () => {
    const shell = headerFrom(header({ navigation: { source: "categories" } }), context(), settings);
    expect(shell.navigation).toEqual(toNavigation(tree));
  });

  it("builds a manual navigation in the market, leaving out what has nowhere to go", () => {
    const shell = headerFrom(
      header({
        navigation: {
          source: "manual",
          items: [
            { kind: "link", ...product("shirt", "Shirts") },
            { kind: "link", ...product("gone", "Gone", true) },
            {
              kind: "dropdown",
              label: "Help",
              links: [custom("/account", "Account"), custom("javascript:alert(1)", "Bad")],
            },
            { kind: "dropdown", label: "Empty", links: [custom("//evil.example", "Evil")] },
            {
              kind: "megaMenu",
              label: "Shop",
              columns: [
                {
                  title: "Tops",
                  links: [
                    {
                      link: {
                        type: "reference",
                        reference: { relationTo: "categories", value: { id: 2, handle: "tops" } },
                        label: "All tops",
                      },
                    },
                  ],
                },
                { title: "Nothing", links: [] },
              ],
            },
          ],
        } as Header["navigation"],
      }),
      context(),
      settings,
    );
    expect(shell.navigation).toEqual([
      { kind: "link", label: "Shirts", href: "/us/products/shirt" },
      { kind: "dropdown", label: "Help", items: [{ label: "Account", href: "/us/account" }] },
      {
        kind: "megaMenu",
        label: "Shop",
        columns: [
          { title: "Tops", links: [{ label: "All tops", href: "/us/categories/apparel/tops" }] },
        ],
        featured: [],
      },
    ]);
  });

  it("puts a market's prefix on a path: none in the primary market", () => {
    const shell = headerFrom(
      header({
        navigation: { source: "manual", items: [{ kind: "link", ...custom("/sale", "Sale") }] },
      }),
      context(cy),
      settings,
    );
    expect(shell.navigation).toEqual([{ kind: "link", label: "Sale", href: "/sale" }]);
  });

  it("takes the header's logo, else the site's", () => {
    const site = settingsFrom({
      ...SAVED,
      storeName: "S",
      logo: { url: "/site.png", width: 2, height: 1 },
    } as SiteSetting);
    expect(headerFrom(header({}), context(), site).logo?.src).toBe("/site.png");
    const own = headerFrom(
      header({ logo: { url: "/own.png", width: 2, height: 1 } as never }),
      context(),
      site,
    );
    expect(own.logo?.src).toBe("/own.png");
  });

  it("draws the default design for a value the shell has no header for", () => {
    expect(headerFrom(header({ design: "transparent" as never }), context(), settings).design).toBe(
      SITE.header,
    );
  });
});

describe("footerFrom", () => {
  const year = 2026;
  const topLevel = tree.map((category) => ({ label: category.title, href: category.href }));

  it("is M3's footer (site.ts) until the global is saved", () => {
    const shell = footerFrom(null, context(), settings, year);
    expect(shell).toEqual({
      design: SITE.footer,
      columns: footerColumns("en", topLevel, context().url),
      social: [],
      legalLinks: [],
      paymentIcons: [],
      marketSwitcher: true,
      copyright: `© 2026 ${SITE.storeName}`,
    });
    expect(footerFrom({} as Footer, context(cy), settings, year).columns[0]?.title).toBe(
      siteText("el").shop,
    );
  });

  it("puts the categories first in a column that asks for them, and drops empty columns", () => {
    const shell = footerFrom(
      footer({
        columns: [
          { title: "Shop", categories: true, links: [custom("/store", "All products")] },
          { title: "Nothing", links: [custom("javascript:x", "Bad")] },
          { title: "Help", links: [custom("/account", "Account", true)] },
        ],
      }),
      context(),
      settings,
      year,
    );
    expect(shell.columns).toEqual([
      { title: "Shop", links: [...topLevel, { label: "All products", href: "/us/store" }] },
      { title: "Help", links: [{ label: "Account", href: "/us/account", external: true }] },
    ]);
  });

  it("keeps https profiles once per network, each payment mark once, and the legal links", () => {
    const shell = footerFrom(
      footer({
        social: [
          { network: "instagram", url: "https://instagram.com/shop" },
          { network: "instagram", url: "https://instagram.com/other" },
          { network: "x", url: "http://x.com/shop" },
        ],
        paymentIcons: ["visa", "visa", "paypal"],
        legalLinks: [custom("/terms", "Terms")],
        marketSwitcher: false,
      }),
      context(),
      settings,
      year,
    );
    expect(shell.social).toEqual([{ network: "instagram", href: "https://instagram.com/shop" }]);
    expect(shell.paymentIcons).toEqual(["visa", "paypal"]);
    expect(shell.legalLinks).toEqual([{ label: "Terms", href: "/us/terms" }]);
    expect(shell.marketSwitcher).toBe(false);
  });
});

describe("footerFrom: the newsletter (T67)", () => {
  const signup = {
    id: 3,
    title: "Newsletter",
    fields: [{ blockType: "email", name: "email", label: "Email", required: true }],
  };
  const withNewsletter = (form: unknown, url = "/privacy") =>
    footer({
      newsletter: { form, privacy: { type: "custom", url } },
    } as unknown as Partial<Footer>);

  it("posts to the global's form, with the consent sentence's privacy page in the market", () => {
    expect(footerFrom(withNewsletter(signup), context(), settings, 2026).newsletter).toEqual({
      formId: "3",
      fieldName: "email",
      privacyHref: "/us/privacy",
    });
  });

  it("draws none without a form, with a form that is not one email field, or before a save", () => {
    expect(footerFrom(footer({}), context(), settings, 2026)).not.toHaveProperty("newsletter");
    const contact = { ...signup, fields: [...signup.fields, { blockType: "text", name: "name" }] };
    expect(
      footerFrom(withNewsletter(contact), context(), settings, 2026).newsletter,
    ).toBeUndefined();
    expect(footerFrom(null, context(), settings, 2026)).not.toHaveProperty("newsletter");
  });
});

describe("copyrightLine", () => {
  it("fills in {year}, and is © year and the store's name when empty", () => {
    expect(copyrightLine("© {year} Kalimera Ltd", "Kalimera", 2026)).toBe("© 2026 Kalimera Ltd");
    expect(copyrightLine("", "Kalimera", 2026)).toBe("© 2026 Kalimera");
    expect(copyrightLine(null, "Kalimera", 2027)).toBe("© 2027 Kalimera");
  });
});
