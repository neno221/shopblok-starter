import { QUICK_VIEW_OFF } from "./template-options";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({
  cacheTag: (...args: unknown[]) => cacheTag(...args),
  cacheLife: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const findGlobal = vi.fn();
vi.mock("./payload", () => ({ getPayloadClient: async () => ({ findGlobal }) }));

import type { Template } from "../../payload-types";
import {
  miniCartFrom,
  readCartTemplate,
  readTemplates,
  TEMPLATE_DEFAULTS,
  templatesFrom,
} from "./templates";

// D101 (T79): the `templates` global, read in the market's language and passed on by the pages.

beforeEach(() => {
  vi.stubEnv("PAYLOAD_DATABASE_URL", "postgres://localhost/payload");
  cacheTag.mockClear();
  findGlobal.mockReset();
});

const saved = (doc: Partial<Template>): Template =>
  ({ id: 1, updatedAt: "2026-11-06T12:00:00Z", ...doc }) as Template;

describe("templatesFrom", () => {
  it("is every first variant, the quick view off, the drawer and the quick cart, until it is saved", () => {
    expect(TEMPLATE_DEFAULTS).toEqual({
      productPage: "default",
      listing: "default",
      card: "standard",
      quickView: "off",
      cart: "default",
      miniCart: "drawer",
      quickCart: "dropdown",
      checkout: "default",
      receipt: "default",
    });
    expect(templatesFrom(null)).toEqual(TEMPLATE_DEFAULTS);
    expect(templatesFrom({ id: 1 } as Template)).toEqual(TEMPLATE_DEFAULTS);
  });

  it("takes a saved global's picks, and passes on a value from a later version as it is", () => {
    const choice = templatesFrom(
      saved({
        listing: { variant: "rail", card: "quick-add" },
        cart: { variant: "default", miniCart: "page", quickCart: "off" },
        checkout: { variant: "one-page" as never },
      }),
    );
    expect(choice).toEqual({
      ...TEMPLATE_DEFAULTS,
      listing: "rail",
      card: "quick-add",
      miniCart: "page",
      quickCart: "off",
      checkout: "one-page",
    });
  });

  it("turns the quick view off unless the card is quick-add (D101), whatever the tab still holds", () => {
    const quickView = { variant: "default" as const };
    expect(
      templatesFrom(saved({ listing: { variant: "default", card: "quick-add" }, quickView }))
        .quickView,
    ).toBe("default");
    expect(
      templatesFrom(saved({ listing: { variant: "default", card: "standard" }, quickView }))
        .quickView,
    ).toBe(QUICK_VIEW_OFF);
    expect(templatesFrom(saved({ quickView })).quickView).toBe(QUICK_VIEW_OFF);
  });
});

describe("readTemplates", () => {
  it("reads the published global in the market's language, tagged global:templates:<locale>", async () => {
    findGlobal.mockResolvedValue(saved({}));
    await readTemplates({ market: { language: "el" }, draft: false });
    expect(findGlobal.mock.calls[0]?.[0]).toMatchObject({
      slug: "templates",
      locale: "el",
      fallbackLocale: "en",
      overrideAccess: false,
      user: null,
      draft: false,
      depth: 0,
    });
    // The pickers only: never the sections' block tables (PR 127's CI).
    const select = findGlobal.mock.calls[0]?.[0].select;
    expect(Object.keys(select).sort()).toEqual([
      "cart",
      "checkout",
      "listing",
      "productPage",
      "quickView",
      "receipt",
      "updatedAt",
    ]);
    expect(JSON.stringify(select)).not.toContain("sections");
    expect(cacheTag.mock.calls).toEqual([["global:templates:el"]]);
  });

  it("is null without a database, and reads nothing", async () => {
    vi.stubEnv("PAYLOAD_DATABASE_URL", "");
    expect(await readTemplates({ market: { language: "en" }, draft: false })).toBeNull();
    expect(findGlobal).not.toHaveBeenCalled();
  });
});

// T85: what the header's mini cart draws, read on the server by the drawer's action.
describe("miniCartFrom (T85)", () => {
  it("is the drawer and no picks' source until the global is saved", () => {
    expect(miniCartFrom(null)).toEqual({ member: "drawer", picks: null });
    expect(miniCartFrom({ updatedAt: "" } as Template)).toEqual({ member: "drawer", picks: null });
  });

  it("takes the saved member and source; the cart page is no member", () => {
    const picks = { mode: "handpicked" as const, products: [] };
    expect(
      miniCartFrom(
        saved({
          cart: { variant: "default", miniCart: "drawer-picks", quickCart: "dropdown", picks },
        }),
      ),
    ).toEqual({ member: "drawer-picks", picks });
    expect(miniCartFrom(saved({ cart: { miniCart: "page" } as Template["cart"] }))).toEqual({
      member: null,
      picks: null,
    });
    expect(miniCartFrom(saved({ cart: {} as Template["cart"] })).member).toBe("drawer");
  });
});

describe("readCartTemplate (T85)", () => {
  it("reads the published cart tab at depth 1, only what the picks need of a reference", async () => {
    findGlobal.mockResolvedValue(saved({}));
    await readCartTemplate({ market: { language: "de" }, draft: false });
    expect(findGlobal.mock.calls[0]?.[0]).toMatchObject({
      slug: "templates",
      locale: "de",
      user: null,
      draft: false,
      depth: 1,
      select: { cart: true, updatedAt: true },
      populate: {
        products: { medusaId: true, deletedInMedusa: true },
        collections: { medusaId: true, deletedInMedusa: true },
        categories: { medusaId: true, deletedInMedusa: true },
      },
    });
    // The global's tag, which a publish and a change to a referenced catalog document refresh.
    expect(cacheTag.mock.calls).toEqual([["global:templates:de"]]);
  });
});
